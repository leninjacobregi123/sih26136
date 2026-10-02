// The Pilot Evidence Passport: the seal, the hash-chained audit log, and reading a passport
// back. Shared by the seeded demo (below) and real pilots (_actions.js).
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { db } from "./_lib.js";
import { HttpError } from "./_http.js";
import { ROLES } from "./_auth.js";
import { slaStatus } from "./_procurement.js";

const require = createRequire(import.meta.url);
export const scenario = require("../shared/demo/opd-scenario.json");
export const STATES = scenario.states;

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// JSON with sorted keys, so a hash survives a round trip through jsonb (which reorders keys).
export function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort()
      .map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

// What the seal covers: the baseline and target as stored on the challenge, and the KPI table.
export const SEALED_FIELDS = [
  "department", "district", "outcome_statement", "kpi_name", "kpi_unit", "kpi_definition",
  "baseline_value", "baseline_window", "baseline_source", "baseline_method", "comparison_unit", "duration_days",
  "target_value", "target_direction",
];
export function sealHash(challenge, criteria) {
  const c = Object.fromEntries(SEALED_FIELDS.map((f) => [f, challenge[f] ?? null]));
  // pg returns numeric as a string; hash the number either way.
  for (const f of ["baseline_value", "target_value"]) if (c[f] != null) c[f] = Number(c[f]);
  return sha256(canon({ challenge: c, criteria }));
}

// actor_id joined the hash in phase 2; events without one hash exactly as before.
const eventHash = (prev, e) =>
  sha256((prev ?? "") + canon({ record_id: e.record_id, at: e.at, actor_role: e.actor_role,
    actor_name: e.actor_name, actor_id: e.actor_id ?? undefined, action: e.action, detail: e.detail }));

// actor: a users row ({id, name, role}) or, for the demo's own load event, {role, name} alone.
export async function appendEvent(client, recordId, actor, action, detail, simulated = false) {
  const { rows } = await client.query(
    "select hash from audit_events where record_id = $1 order by id desc limit 1", [recordId]);
  const e = { record_id: recordId, at: new Date().toISOString(), actor_role: ROLES[actor.role] ?? actor.role,
    actor_name: actor.name, actor_id: actor.id ?? null, action, detail };
  const prev = rows[0]?.hash ?? null;
  await client.query(
    `insert into audit_events (record_id, at, actor_role, actor_name, actor_id, action, detail, is_simulated, prev_hash, hash)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [recordId, e.at, e.actor_role, e.actor_name, e.actor_id, action, detail, simulated, prev, eventHash(prev, e)],
  );
}

export function verifyChain(events) {
  let prev = null;
  for (const [i, e] of events.entries()) {
    const at = e.at instanceof Date ? e.at.toISOString() : e.at;
    if (e.prev_hash !== prev || e.hash !== eventHash(prev, { ...e, at })) {
      return { intact: false, events: events.length, broken_at: i };
    }
    prev = e.hash;
  }
  return { intact: true, events: events.length };
}

// "a.0.b" -> obj.a[0].b = value
export function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k] ??= {};
  o[keys.at(-1)] = value;
}

export async function withTx(fn) {
  const client = await db().connect();
  try {
    await client.query("begin");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

const RECORD_COLS = ["id", "passport_state", "demo_step", "status", "post_value", "delta", "ci_low", "ci_high",
  "method", "adoption_pct", "pilot_cost_inr", "result_direction", "startup_user_id", "is_synthetic"];
const CHALLENGE_COLS = [...SEALED_FIELDS, "sector", "pr_id", "lock_hash", "locked_at", "is_simulated", "created_by"];

// Locks and returns one passport with its challenge, for an action to change.
export async function lockPassport(client, where, params) {
  const { rows } = await client.query(
    `select ${RECORD_COLS.map((c) => `r.${c}`).join(", ")}, r.passport, r.challenge_id,
            ${CHALLENGE_COLS.map((c) => `c.${c}`).join(", ")}
       from records r join challenges c on c.id = r.challenge_id
      where ${where} and r.passport is not null
        for update of r`, params);
  return rows[0];
}

export async function savePassport(client, rec, state, extra = {}) {
  const cols = Object.keys(extra);
  await client.query(
    `update records set passport = $1, passport_state = $2 ${cols.map((c, i) => `, ${c} = $${i + 4}`).join("")}
      where id = $3`,
    [rec.passport, state, rec.id, ...cols.map((c) => extra[c])]);
}

// Everything a passport page needs, in one read.
export async function getBundle(recordId) {
  const { rows } = await db().query(
    `select ${RECORD_COLS.map((c) => `r.${c}`).join(", ")}, r.passport,
            ${CHALLENGE_COLS.map((c) => `c.${c}`).join(", ")}
       from records r join challenges c on c.id = r.challenge_id
      where r.id = $1 and r.passport is not null`, [recordId]);
  const rec = rows[0];
  if (!rec) return null;
  const [audit, readings, signatures, files] = await Promise.all([
    db().query("select * from audit_events where record_id = $1 order by id", [recordId]),
    db().query("select reading_date, kpi_value from readings where record_id = $1 order by reading_date", [recordId]),
    db().query("select signer_name, signer_role, dissent_note, signed_at from signatures where record_id = $1", [recordId]),
    db().query(`select id, milestone, title, filename, mime, bytes, sha256, uploaded_at
                  from evidence_files where record_id = $1 order by uploaded_at`, [recordId]),
  ]);
  const pick = (fields) => Object.fromEntries(fields.map((f) => [f, rec[f]]));
  return {
    notice: rec.is_simulated ? scenario.notice : null,
    states: STATES,
    roles: Object.entries(ROLES).map(([id, label]) => ({ id, label })),
    challenge: pick(CHALLENGE_COLS),
    record: pick(RECORD_COLS),
    passport: rec.passport,
    seal: rec.lock_hash ? { sha256: rec.lock_hash, intact: sealHash(rec, rec.passport.criteria) === rec.lock_hash } : null,
    readings: readings.rows,
    signatures: signatures.rows,
    files: files.rows,
    // Real pilots only: the demo's payments follow its own scripted calendar.
    ledger: rec.is_simulated ? null
      : (rec.passport.milestones ?? []).map((m) => ({ n: m.n, amount_inr: m.amount_inr, ...slaStatus(m.payment) })),
    audit: audit.rows.map(({ actor_id, ...e }) => e),
    chain: verifyChain(audit.rows),
  };
}

// ---------------------------------------------------------------------------
// The seeded demo: shared/demo/opd-scenario.json applied one step at a time.

const demoActor = (roleId) => ({ role: roleId, name: scenario.roles.find((r) => r.id === roleId)?.name ?? roleId });
const DEMO_WHERE = "c.pr_id = $1 and c.is_simulated";

// Removes the demo and everything hanging off it. Only ever touches the simulated challenge.
async function removeDemo(client) {
  const recs = `select r.id from records r join challenges c on c.id = r.challenge_id where ${DEMO_WHERE}`;
  await client.query(`delete from audit_events where record_id in (${recs})`, [scenario.id]);
  await client.query(`delete from signatures where record_id in (${recs})`, [scenario.id]);
  await client.query(`delete from readings where record_id in (${recs})`, [scenario.id]);
  await client.query(`delete from records where id in (${recs})`, [scenario.id]);
  await client.query("delete from challenges where pr_id = $1 and is_simulated", [scenario.id]);
}

export const resetDemo = () => withTx(removeDemo);

export const loadDemo = () =>
  withTx(async (client) => {
    await removeDemo(client);
    const c = scenario.challenge;
    const fields = Object.keys(c);
    const ch = await client.query(
      `insert into challenges (pr_id, is_simulated, ${fields.join(", ")})
       values ($1, true, ${fields.map((_, i) => `$${i + 2}`).join(", ")}) returning id`,
      [scenario.id, ...fields.map((f) => c[f])],
    );
    const rec = await client.query(
      `insert into records (challenge_id, status, is_synthetic, passport_state, passport, demo_step)
       values ($1, 'running', true, $2, $3, 0) returning id`,
      [ch.rows[0].id, STATES[0], scenario.passport],
    );
    await appendEvent(client, rec.rows[0].id, demoActor("admin"), "Loaded the demo scenario",
      { state: STATES[0], notice: scenario.notice }, true);
  });

// user: the signed-in users row. Only demo accounts act on the demo, each in its own role.
export const advanceDemo = (user) =>
  withTx(async (client) => {
    if (!user?.is_demo) throw new HttpError(403, "The demo is driven by demo accounts. Sign in with a demo role.");
    const rec = await lockPassport(client, DEMO_WHERE, [scenario.id]);
    if (!rec) throw new HttpError(409, "No demo loaded. Load the demo scenario first.");
    const step = scenario.steps[rec.demo_step];
    if (!step) throw new HttpError(409, "The demo is complete. Reset or reload it to start again.");
    if (user.role !== step.role) {
      throw new HttpError(403, `This step belongs to the ${ROLES[step.role]}.`, { required_role: step.role });
    }

    const passport = rec.passport;
    const detail = { step: rec.demo_step + 1, note: step.note };

    if (step.op === "seal") {
      const hash = sealHash(rec, passport.criteria);
      const sealedAt = new Date().toISOString();
      await client.query("update challenges set lock_hash = $1, locked_at = $2 where id = $3",
        [hash, sealedAt, rec.challenge_id]);
      passport.seal = { sha256: hash, sealed_at: sealedAt };
      detail.seal = hash;
    }
    if (step.op === "verify_seal") {
      const live = sealHash(rec, passport.criteria);
      if (!rec.lock_hash || live !== rec.lock_hash) {
        // Refused, and the refusal is itself on the record.
        await appendEvent(client, rec.id, { ...demoActor(user.role), id: user.id }, "Refused to validate: seal mismatch",
          { step: rec.demo_step + 1, sealed: rec.lock_hash, recomputed: live }, true);
        return { refused: "The sealed criteria were changed after publication. Validation stops here." };
      }
      detail.seal_recomputed = live;
    }

    for (const [path, value] of Object.entries(step.set ?? {})) setPath(passport, path, value);
    for (const ev of step.evidence ?? []) {
      const item = { milestone: ev.milestone, title: ev.title, source: ev.source,
        sha256: sha256(ev.content), bytes: Buffer.byteLength(ev.content), submitted_at: new Date().toISOString() };
      passport.evidence.push(item);
      (detail.evidence ??= []).push({ title: item.title, sha256: item.sha256 });
    }
    if (step.state) {
      detail.from = rec.passport_state;
      detail.to = step.state;
    }

    await savePassport(client, rec, step.state ?? rec.passport_state,
      { ...step.record, demo_step: rec.demo_step + 1 });
    for (const [date, value] of step.readings ?? []) {
      await client.query("insert into readings (record_id, reading_date, kpi_value) values ($1, $2, $3)",
        [rec.id, date, value]);
    }
    if (step.signature) {
      const s = step.signature;
      await client.query(
        "insert into signatures (record_id, signer_name, signer_role, dissent_note) values ($1, $2, $3, $4)",
        [rec.id, s.name, s.role, s.dissent_note]);
    }
    await appendEvent(client, rec.id, { ...demoActor(step.role), id: user.id }, step.action, detail, true);
    return {};
  });

export async function getDemo() {
  const base = { demo: true, notice: scenario.notice, title: scenario.title, demo_roles: scenario.roles,
    states: STATES, total_steps: scenario.steps.length };
  const { rows } = await db().query(
    `select r.id, r.demo_step from records r join challenges c on c.id = r.challenge_id where ${DEMO_WHERE}`,
    [scenario.id]);
  if (!rows[0]) return { ...base, loaded: false };
  const next = scenario.steps[rows[0].demo_step];
  return {
    ...(await getBundle(rows[0].id)),
    ...base,
    loaded: true,
    next: next ? { step: rows[0].demo_step + 1, role: next.role, action: next.action, note: next.note } : null,
  };
}
