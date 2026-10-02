// The Pilot Evidence Passport and the seeded demo that walks one through every state.
// The scenario lives in shared/demo/opd-scenario.json; this file only applies it.
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { db } from "./_lib.js";

const require = createRequire(import.meta.url);
export const scenario = require("../shared/demo/opd-scenario.json");

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// JSON with sorted keys, so a hash survives a round trip through jsonb (which reorders keys).
export function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort()
      .map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

// What the seal covers: the baseline as stored on the challenge, and the KPI targets.
const SEALED_FIELDS = [
  "department", "district", "outcome_statement", "kpi_name", "kpi_unit", "kpi_definition",
  "baseline_value", "baseline_window", "baseline_source", "baseline_method", "comparison_unit", "duration_days",
];
export function sealHash(challenge, criteria) {
  const c = Object.fromEntries(SEALED_FIELDS.map((f) => [f, challenge[f] ?? null]));
  // pg returns numeric as a string; hash the number either way.
  if (c.baseline_value != null) c.baseline_value = Number(c.baseline_value);
  return sha256(canon({ challenge: c, criteria }));
}

const eventHash = (prev, e) =>
  sha256((prev ?? "") + canon({ record_id: e.record_id, at: e.at, actor_role: e.actor_role,
    actor_name: e.actor_name, action: e.action, detail: e.detail }));

const roleOf = (id) => scenario.roles.find((r) => r.id === id);

async function appendEvent(client, recordId, roleId, action, detail) {
  const { rows } = await client.query(
    "select hash from audit_events where record_id = $1 order by id desc limit 1", [recordId]);
  const e = {
    record_id: recordId, at: new Date().toISOString(), actor_role: roleOf(roleId)?.label ?? roleId,
    actor_name: roleOf(roleId)?.name ?? roleId, action, detail,
  };
  const prev = rows[0]?.hash ?? null;
  await client.query(
    `insert into audit_events (record_id, at, actor_role, actor_name, action, detail, is_simulated, prev_hash, hash)
     values ($1, $2, $3, $4, $5, $6, true, $7, $8)`,
    [recordId, e.at, e.actor_role, e.actor_name, action, detail, prev, eventHash(prev, e)],
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
function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k] ??= {};
  o[keys.at(-1)] = value;
}

async function withTx(fn) {
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

export class StepRefused extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// Removes the demo and everything hanging off it. Only ever touches the simulated challenge.
async function removeDemo(client) {
  const recs = `select r.id from records r join challenges c on c.id = r.challenge_id
                 where c.pr_id = $1 and c.is_simulated`;
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
      [ch.rows[0].id, scenario.states[0], scenario.passport],
    );
    await appendEvent(client, rec.rows[0].id, "admin", "Loaded the demo scenario",
      { state: scenario.states[0], notice: scenario.notice });
  });

export const advanceDemo = (roleId) =>
  withTx(async (client) => {
    const { rows } = await client.query(
      `select r.id, r.passport_state, r.passport, r.demo_step, c.id as challenge_id, c.lock_hash,
              ${SEALED_FIELDS.map((f) => `c.${f}`).join(", ")}
         from records r join challenges c on c.id = r.challenge_id
        where c.pr_id = $1 and c.is_simulated
          for update of r`,
      [scenario.id],
    );
    const rec = rows[0];
    if (!rec) throw new StepRefused(409, "No demo loaded. Load the demo scenario first.");
    const step = scenario.steps[rec.demo_step];
    if (!step) throw new StepRefused(409, "The demo is complete. Reset or reload it to start again.");
    if (roleId !== step.role) {
      throw new StepRefused(403, `This step belongs to the ${roleOf(step.role).label}.`,
        { required_role: step.role });
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
        await appendEvent(client, rec.id, roleId, "Refused to validate: seal mismatch",
          { step: rec.demo_step + 1, sealed: rec.lock_hash, recomputed: live });
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

    const cols = Object.keys(step.record ?? {});
    await client.query(
      `update records set passport = $1, passport_state = $2, demo_step = demo_step + 1
         ${cols.map((col, i) => `, ${col} = $${i + 4}`).join("")}
       where id = $3`,
      [passport, step.state ?? rec.passport_state, rec.id, ...cols.map((col) => step.record[col])],
    );
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
    await appendEvent(client, rec.id, roleId, step.action, detail);
    return {};
  });

// Everything the passport page needs, in one read.
export async function getDemo() {
  const base = { notice: scenario.notice, title: scenario.title, roles: scenario.roles,
    states: scenario.states, total_steps: scenario.steps.length };
  const { rows } = await db().query(
    `select r.*, c.lock_hash, c.locked_at, ${SEALED_FIELDS.map((f) => `c.${f}`).join(", ")},
            c.sector, c.pr_id
       from records r join challenges c on c.id = r.challenge_id
      where c.pr_id = $1 and c.is_simulated`,
    [scenario.id],
  );
  const rec = rows[0];
  if (!rec) return { ...base, loaded: false };

  const [audit, readings, signatures] = await Promise.all([
    db().query("select * from audit_events where record_id = $1 order by id", [rec.id]),
    db().query("select reading_date, kpi_value from readings where record_id = $1 order by reading_date", [rec.id]),
    db().query("select signer_name, signer_role, dissent_note, signed_at from signatures where record_id = $1", [rec.id]),
  ]);
  const next = scenario.steps[rec.demo_step];
  const pick = (fields) => Object.fromEntries(fields.map((f) => [f, rec[f]]));
  return {
    ...base,
    loaded: true,
    challenge: pick([...SEALED_FIELDS, "sector", "pr_id", "lock_hash", "locked_at"]),
    record: pick(["id", "passport_state", "demo_step", "status", "post_value", "delta", "ci_low", "ci_high",
      "method", "adoption_pct", "pilot_cost_inr", "result_direction"]),
    passport: rec.passport,
    seal: rec.lock_hash ? { sha256: rec.lock_hash, intact: sealHash(rec, rec.passport.criteria) === rec.lock_hash } : null,
    readings: readings.rows,
    signatures: signatures.rows,
    audit: audit.rows,
    chain: verifyChain(audit.rows),
    next: next ? { step: rec.demo_step + 1, role: next.role, action: next.action, note: next.note } : null,
  };
}
