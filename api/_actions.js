// Real pilots: creating one, and every action that moves its passport forward.
// Each action names the one role and the states it is allowed in; the server checks
// both, validates the input, and writes the passport and its audit event in one transaction.
import { db } from "./_lib.js";
import { HttpError } from "./_http.js";
import { ROLES } from "./_auth.js";
import { BASELINE_GATE, CHALLENGE_FIELDS } from "./_lib.js";
import { STATES, sha256, sealHash, appendEvent, withTx, lockPassport, savePassport } from "./_passport.js";

export const MAX_FILE_BYTES = 3 * 1024 * 1024; // base64 of this still fits Vercel's 4.5 MB body limit
export const FILE_TYPES = {
  "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "text/csv": "csv", "text/plain": "txt",
  "application/json": "json",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

// ---- input checks ----------------------------------------------------------
const bad = (msg) => new HttpError(422, msg);
function text(v, name, { max = 2000, optional = false } = {}) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s && !optional) throw bad(`${name} is required`);
  if (s.length > max) throw bad(`${name} is longer than ${max} characters`);
  return s || null;
}
function num(v, name, { min = -Infinity } = {}) {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < min) throw bad(`${name} must be a number${min > -Infinity ? ` ≥ ${min}` : ""}`);
  return n;
}
function date(v, name) {
  const d = typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
    throw bad(`${name} must be a date (YYYY-MM-DD)`);
  }
  return v;
}
function oneOf(v, name, options) {
  if (!options.includes(v)) throw bad(`${name} must be one of: ${options.join(", ")}`);
  return v;
}
export const isUuid = (v) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const today = () => new Date().toISOString().slice(0, 10);
const targetText = (c) => `${c.target_direction === "decrease" ? "≤" : "≥"} ${Number(c.target_value)}`;

function milestoneOf(passport, v, states) {
  const m = passport.milestones.find((x) => x.n === Number(v));
  if (!m) throw bad("no such milestone");
  if (states && !states.includes(m.state)) throw new HttpError(409, `Milestone ${m.n} is ${m.state}.`);
  return m;
}

// ---- creating a pilot ------------------------------------------------------

export async function createChallenge(user, body) {
  if (user.is_demo || user.role !== "department") throw new HttpError(403, "Only a Department Officer can create a challenge.");
  const v = {};
  for (const f of CHALLENGE_FIELDS) v[f] = typeof body[f] === "number" ? String(body[f]) : text(body[f], f, { optional: true });
  for (const f of ["department", "outcome_statement", "kpi_name", ...BASELINE_GATE]) {
    if (!v[f]) throw bad(`${f} is required`);
  }
  v.baseline_value = num(body.baseline_value, "baseline_value");
  if (v.duration_days != null) v.duration_days = num(body.duration_days, "duration_days", { min: 1 });
  v.target_value = num(body.target_value, "target_value");
  v.target_direction = oneOf(body.target_direction, "target_direction", ["decrease", "increase"]);
  if (v.target_direction === "decrease" ? v.target_value >= v.baseline_value : v.target_value <= v.baseline_value) {
    throw bad(`a target to ${v.target_direction} must be ${v.target_direction === "decrease" ? "below" : "above"} the baseline`);
  }

  return withTx(async (client) => {
    const fields = [...CHALLENGE_FIELDS, "target_value", "target_direction"];
    const ch = await client.query(
      `insert into challenges (${fields.join(", ")}, created_by)
       values (${fields.map((_, i) => `$${i + 1}`).join(", ")}, $${fields.length + 1}) returning id`,
      [...fields.map((f) => v[f]), user.id]);
    const passport = {
      identity: { owner: [user.name, user.org].filter(Boolean).join(", "), created_by: user.name },
      baseline: { verified: false },
      criteria: [{ kpi: v.kpi_name, unit: v.kpi_unit ?? "", baseline: v.baseline_value, target: targetText(v) }],
      seal: null, risk: null, screening: null, evaluation: null, startup: null, design: null,
      milestones: [], evidence: [], validation: null,
      procurement: null, deployment: null, adoption: null, replication: null,
    };
    const rec = await client.query(
      `insert into records (challenge_id, status, is_synthetic, passport_state, passport)
       values ($1, 'running', false, $2, $3) returning id`, [ch.rows[0].id, STATES[0], passport]);
    await appendEvent(client, rec.rows[0].id, user, "Created the challenge", { state: STATES[0] });
    return { id: ch.rows[0].id, record_id: rec.rows[0].id };
  });
}

// ---- actions ---------------------------------------------------------------
// run() changes ctx.passport in place and returns { action, to?, detail?, record? } or { refused }.

export const ACTIONS = {
  verify_baseline: {
    role: "admin", states: ["Draft"], label: "Verify the baseline",
    run({ passport, user }, input) {
      passport.baseline = { verified: true, verified_by: user.name, result: text(input.result, "result") };
      return { action: "Verified the baseline", to: "Baseline verified" };
    },
  },

  seal: {
    role: "department", states: ["Baseline verified"], label: "Seal and publish the success criteria",
    async run({ client, rec, passport }) {
      const hash = sealHash(rec, passport.criteria);
      const at = new Date().toISOString();
      await client.query("update challenges set lock_hash = $1, locked_at = $2 where id = $3", [hash, at, rec.challenge_id]);
      passport.seal = { sha256: hash, sealed_at: at };
      return { action: "Sealed and published the success criteria", to: "Criteria sealed", detail: { seal: hash } };
    },
  },

  award: {
    role: "admin", states: ["Criteria sealed"], label: "Award the pilot",
    async run({ client, passport }, input) {
      if (!isUuid(input.startup_user_id)) throw bad("choose a startup account");
      const { rows: [startup] } = await client.query(
        "select id, name, org from users where id = $1 and role = 'startup' and active and not is_demo",
        [input.startup_user_id]);
      if (!startup) throw bad("choose a startup account");
      const ms = Array.isArray(input.milestones) ? input.milestones : [];
      if (ms.length < 1 || ms.length > 8) throw bad("a pilot needs 1 to 8 milestones");
      passport.milestones = ms.map((m, i) => ({
        n: i + 1,
        title: text(m.title, `milestone ${i + 1} title`, { max: 200 }),
        evidence_expected: text(m.evidence_expected, `milestone ${i + 1} evidence`, { max: 500 }),
        reviewer: ROLES.department,
        due: date(m.due, `milestone ${i + 1} due date`),
        amount_inr: num(m.amount_inr, `milestone ${i + 1} amount`, { min: 0 }),
        state: "planned",
        payment: { state: "not due" },
      }));
      passport.startup = { name: startup.org || startup.name, contact: startup.name, user_id: startup.id };
      passport.design = {
        scope: text(input.scope, "scope", { max: 500 }),
        data_access: text(input.data_access, "data access", { max: 500 }),
        ip: text(input.ip, "IP terms", { max: 500, optional: true }),
        fee_inr: passport.milestones.reduce((a, m) => a + m.amount_inr, 0),
      };
      return { action: `Awarded the pilot to ${passport.startup.name}`, to: "Pilot active",
        record: { startup_user_id: startup.id, pilot_cost_inr: passport.design.fee_inr } };
    },
  },

  upload_evidence: {
    role: "startup", states: ["Pilot active"], label: "Submit evidence",
    allowed: (rec, user) => rec.startup_user_id === user.id,
    async run({ client, rec, passport, user }, input) {
      const m = milestoneOf(passport, input.milestone, ["planned", "evidence submitted", "returned"]);
      const title = text(input.title, "title", { max: 200 });
      const mime = oneOf(input.mime, "file type", Object.keys(FILE_TYPES));
      if (typeof input.data !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(input.data)) throw bad("file data must be base64");
      const bytes = Buffer.from(input.data, "base64");
      if (!bytes.length) throw bad("the file is empty");
      if (bytes.length > MAX_FILE_BYTES) throw bad("files are limited to 3 MB");
      const filename = String(input.filename ?? "").split(/[\\/]/).pop().replace(/[^\w.\- ()]/g, "_").slice(0, 120)
        || `evidence.${FILE_TYPES[mime]}`;
      const hash = sha256(bytes);
      const { rows: [f] } = await client.query(
        `insert into evidence_files (record_id, milestone, title, filename, mime, bytes, sha256, data, uploaded_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id, uploaded_at`,
        [rec.id, m.n, title, filename, mime, bytes.length, hash, bytes, user.id]);
      passport.evidence.push({ milestone: m.n, title, source: passport.startup.name, sha256: hash,
        bytes: bytes.length, submitted_at: f.uploaded_at.toISOString(), file_id: f.id });
      m.state = "evidence submitted";
      return { action: `Submitted evidence for milestone ${m.n}`, detail: { evidence: [{ title, sha256: hash }] } };
    },
  },

  review_milestone: {
    role: "department", states: ["Pilot active"], label: "Review a milestone",
    run({ passport }, input) {
      const m = milestoneOf(passport, input.milestone, ["evidence submitted"]);
      const decision = oneOf(input.decision, "decision", ["accept", "return"]);
      const note = text(input.note, "note", { max: 1000, optional: decision === "accept" });
      if (decision === "return") {
        m.state = "returned";
        m.return_note = note;
        return { action: `Returned milestone ${m.n} for more evidence`, detail: { note } };
      }
      m.state = "accepted";
      m.accepted_on = today();
      if (note) m.acceptance_note = note;
      m.payment = { state: "packet complete", packet_complete_on: today() };
      const all = passport.milestones.every((x) => x.state === "accepted");
      return { action: `Accepted milestone ${m.n}`, to: all ? "Evidence submitted" : undefined };
    },
  },

  record_payment: {
    role: "finance", states: ["Pilot active", "Evidence submitted", "Independently validated"], label: "Record a payment",
    run({ passport }, input) {
      const m = milestoneOf(passport, input.milestone, ["accepted"]);
      if (!["packet complete", "delayed"].includes(m.payment.state)) throw new HttpError(409, `Milestone ${m.n} is already ${m.payment.state}.`);
      const outcome = oneOf(input.outcome, "outcome", ["paid", "delayed"]);
      if (outcome === "delayed") {
        m.payment = { ...m.payment, state: "delayed", delayed_on: today(), delay_reason: text(input.delay_reason, "delay reason", { max: 500 }) };
        return { action: `Recorded milestone ${m.n} payment as delayed`, detail: { reason: m.payment.delay_reason } };
      }
      const paidOn = date(input.paid_on, "paid on");
      if (paidOn < m.payment.packet_complete_on) throw bad("paid on can't be before the packet was complete");
      m.payment = { ...m.payment, state: m.payment.state === "delayed" ? "paid late" : "paid", paid_on: paidOn };
      return { action: `Paid milestone ${m.n}`, detail: { paid_on: paidOn, amount_inr: m.amount_inr } };
    },
  },

  attest: {
    role: "validator", states: ["Evidence submitted"], label: "Validate and attest",
    async run({ client, rec, passport, user }, input) {
      const live = sealHash(rec, passport.criteria);
      if (!rec.lock_hash || live !== rec.lock_hash) {
        return { refused: "The sealed criteria were changed after publication. Validation stops here.",
          action: "Refused to validate: seal mismatch", detail: { sealed: rec.lock_hash, recomputed: live } };
      }
      const achieved = num(input.achieved, "achieved value");
      const method = text(input.method, "method", { max: 1000 });
      const exceptions = text(input.exceptions, "exceptions", { max: 1000, optional: true });
      const dissent = text(input.dissent, "dissent", { max: 1000, optional: true });
      const baseline = Number(rec.baseline_value), target = Number(rec.target_value);
      const down = rec.target_direction === "decrease";
      const met = down ? achieved <= target : achieved >= target;
      const delta = achieved - baseline;
      passport.validation = {
        method, exceptions,
        result: met ? "Met the sealed criteria" : "Missed the sealed criteria",
        kpis: [{ kpi: rec.kpi_name, baseline, achieved, target: targetText(rec), met }],
        attestation: `Signed by ${user.name}`,
      };
      await client.query(
        "insert into signatures (record_id, signer_name, signer_role, dissent_note) values ($1, $2, $3, $4)",
        [rec.id, user.name, ROLES.validator, dissent]);
      return {
        action: met ? "Attested: met the sealed criteria" : "Attested: missed the sealed criteria",
        to: "Independently validated",
        detail: { seal_recomputed: live, achieved, met },
        record: { status: "complete", post_value: achieved, delta, method,
          result_direction: delta === 0 ? "NO_CHANGE" : (delta < 0) === down ? "IMPROVED" : "WORSENED" },
      };
    },
  },
};

export async function runAction(user, recordId, name, input) {
  const act = ACTIONS[name];
  if (!act) throw new HttpError(400, `unknown action ${name}`);
  return withTx(async (client) => {
    const rec = isUuid(recordId) && await lockPassport(client, "r.id = $1", [recordId]);
    if (!rec) throw new HttpError(404, "No such passport.");
    if (rec.is_simulated) throw new HttpError(403, "The demo passport moves only through its demo steps.");
    if (user.is_demo) throw new HttpError(403, "Demo accounts can only act on the demo.");
    if (user.role !== act.role) throw new HttpError(403, `${act.label} is for the ${ROLES[act.role]}.`);
    if (!act.states.includes(rec.passport_state)) {
      throw new HttpError(409, `Can't ${act.label.toLowerCase()} while the passport is ${rec.passport_state}.`);
    }
    if (act.allowed && !act.allowed(rec, user)) throw new HttpError(403, "This pilot was not awarded to you.");

    const out = await act.run({ client, rec, user, passport: rec.passport }, input ?? {});
    if (out.refused) {
      await appendEvent(client, rec.id, user, out.action, out.detail);
      return { refused: out.refused };
    }
    const to = out.to ?? rec.passport_state;
    await savePassport(client, rec, to, out.record);
    await appendEvent(client, rec.id, user, out.action,
      { ...out.detail, ...(to !== rec.passport_state && { from: rec.passport_state, to }) });
    return {};
  });
}

// What this user could do to this passport right now, with the choices a form needs.
export async function availableActions(user, bundle) {
  if (!user || user.is_demo || bundle.challenge.is_simulated) return [];
  const { record: rec, passport: p } = bundle;
  const ms = (states) => p.milestones.filter((m) => states.includes(m.state)).map((m) => ({ n: m.n, title: m.title }));
  const out = [];
  for (const [name, act] of Object.entries(ACTIONS)) {
    if (act.role !== user.role || !act.states.includes(rec.passport_state)) continue;
    if (act.allowed && !act.allowed(rec, user)) continue;
    const a = { name, label: act.label };
    if (name === "award") {
      const { rows } = await db().query(
        "select id, name, org from users where role = 'startup' and active and not is_demo order by coalesce(org, name)");
      a.startups = rows;
    }
    if (name === "upload_evidence") a.milestones = ms(["planned", "evidence submitted", "returned"]);
    if (name === "review_milestone") a.milestones = ms(["evidence submitted"]);
    if (name === "record_payment") {
      a.milestones = p.milestones.filter((m) => m.state === "accepted" && ["packet complete", "delayed"].includes(m.payment.state))
        .map((m) => ({ n: m.n, title: m.title }));
    }
    if (a.milestones && !a.milestones.length) continue;
    out.push(a);
  }
  return out;
}
