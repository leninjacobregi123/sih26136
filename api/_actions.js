// Real pilots: creating one, and every action that moves its passport forward.
// Each action names the one role and the states it is allowed in; the server checks
// both, validates the input, and writes the passport and its audit event in one transaction.
import { nowIso, todayIso } from "./_clock.js";
import { db } from "./_lib.js";
import { HttpError } from "./_http.js";
import { ROLES } from "./_auth.js";
import { BASELINE_GATE, CHALLENGE_FIELDS } from "./_lib.js";
import { isSample, STATES, LEARNING, sha256, sealHash, appendEvent, withTx, lockPassport, savePassport } from "./_passport.js";
import { qualityReport } from "./_quality.js";
import { screenAll, policy } from "./_matching.js";
import { compileRoute, addDays } from "./_procurement.js";

export const MAX_FILE_BYTES = 3 * 1024 * 1024; // base64 of this still fits Vercel's 4.5 MB body limit
export const FILE_TYPES = {
  "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "text/csv": "csv", "text/plain": "txt",
  "application/json": "json",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

// ---- input checks ----------------------------------------------------------
// A 422 names the input it is about (`field`, the request key), so a form can mark it.
const bad = (msg, field) => new HttpError(422, msg, field ? { field } : {});
const FIELD_OF = { "IP terms": "ip", cap: "cap_inr", "planned start": "start_date", "achieved value": "achieved",
  "weekly active staff": "weekly_active", "would keep using": "survey_would_keep", "annual cost": "annual_cost_inr",
  "operational cost": "operational_cost_inr", "file type": "file" };
const MILESTONE_KEY = { title: "title", evidence: "evidence_expected", "due date": "due", amount: "amount_inr" };
function fieldOf(name) {
  if (FIELD_OF[name]) return FIELD_OF[name];
  const m = String(name).match(/^milestone (\d+) (title|evidence|due date|amount)$/);
  if (m) return `milestones.${m[1] - 1}.${MILESTONE_KEY[m[2]]}`;
  if (/^score for /.test(name)) return "scores";
  return String(name).replace(/[\s-]+/g, "_");
}
function text(v, name, { max = 2000, optional = false, field = fieldOf(name) } = {}) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s && !optional) throw bad(`${name} is required`, field);
  if (s.length > max) throw bad(`${name} is longer than ${max} characters`, field);
  return s || null;
}
function num(v, name, { min = -Infinity, field = fieldOf(name) } = {}) {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < min) throw bad(`${name} must be a number${min > -Infinity ? ` ≥ ${min}` : ""}`, field);
  return n;
}
function date(v, name, { field = fieldOf(name) } = {}) {
  const d = typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
    throw bad(`${name} must be a date (YYYY-MM-DD)`, field);
  }
  return v;
}
function oneOf(v, name, options, { field = fieldOf(name) } = {}) {
  if (!options.includes(v)) throw bad(`${name} must be one of: ${options.join(", ")}`, field);
  return v;
}
export const isUuid = (v) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const today = todayIso;
const targetText = (c) => `${c.target_direction === "decrease" ? "≤" : "≥"} ${Number(c.target_value)}`;

function milestoneOf(passport, v, states) {
  const m = passport.milestones.find((x) => x.n === Number(v));
  if (!m) throw bad("no such milestone", "milestone");
  if (states && !states.includes(m.state)) throw new HttpError(409, `Milestone ${m.n} is ${m.state}.`);
  return m;
}

// ---- creating a pilot ------------------------------------------------------

function validateChallenge(user, body) {
  if (user.is_demo || user.role !== "department") throw new HttpError(403, "Only a Department Officer can create a challenge.");
  const v = {};
  for (const f of CHALLENGE_FIELDS) v[f] = typeof body[f] === "number" ? String(body[f]) : text(body[f], f, { optional: true });
  for (const f of ["department", "outcome_statement", "kpi_name", ...BASELINE_GATE]) {
    if (!v[f]) throw bad(`${f} is required`, f);
  }
  v.baseline_value = num(body.baseline_value, "baseline_value");
  if (v.duration_days != null) v.duration_days = num(body.duration_days, "duration_days", { min: 1 });
  v.target_value = num(body.target_value, "target_value");
  v.target_direction = oneOf(body.target_direction, "target_direction", ["decrease", "increase"]);
  if (v.target_direction === "decrease" ? v.target_value >= v.baseline_value : v.target_value <= v.baseline_value) {
    throw bad(`a target to ${v.target_direction} must be ${v.target_direction === "decrease" ? "below" : "above"} the baseline`, "target_value");
  }
  return v;
}

// The composer's "Check quality" button: the same report, nothing saved.
export async function checkChallenge(user, body) {
  return qualityReport(validateChallenge(user, body));
}

export async function createChallenge(user, body) {
  const v = validateChallenge(user, body);
  const quality = await qualityReport(v); // outside the transaction: it may call the model
  return withTx(async (client) => {
    const fields = [...CHALLENGE_FIELDS, "target_value", "target_direction"];
    const ch = await client.query(
      `insert into challenges (${fields.join(", ")}, created_by, created_at)
       values (${fields.map((_, i) => `$${i + 1}`).join(", ")}, $${fields.length + 1}, $${fields.length + 2}) returning id`,
      [...fields.map((f) => v[f]), user.id, nowIso()]);
    const passport = {
      identity: { owner: [user.name, user.org].filter(Boolean).join(", "), created_by: user.name },
      baseline: { verified: false },
      quality,
      criteria: [{ kpi: v.kpi_name, unit: v.kpi_unit ?? "", baseline: v.baseline_value, target: targetText(v) }],
      seal: null, risk: null, screening: null, evaluation: null, startup: null, design: null,
      milestones: [], evidence: [], validation: null,
      procurement: null, deployment: null, adoption: null, replication: null,
    };
    const rec = await client.query(
      `insert into records (challenge_id, status, is_synthetic, passport_state, passport, created_at)
       values ($1, 'running', false, $2, $3, $4) returning id`, [ch.rows[0].id, STATES[0], passport, nowIso()]);
    await appendEvent(client, rec.rows[0].id, user, "Created the challenge",
      { state: STATES[0], quality_findings: quality.defects.length, quality_model: quality.model ?? "not run" });
    return { id: ch.rows[0].id, record_id: rec.rows[0].id };
  });
}

// ---- actions ---------------------------------------------------------------
// run() changes ctx.passport in place and returns { action, to?, detail?, record? } or { refused }.

export const ACTIONS = {
  verify_baseline: {
    role: "admin", states: ["Draft"], label: "Verify the baseline",
    run({ passport, user }, input) {
      const result = text(input.result, "result");
      if (passport.quality) {
        if (input.quality_ack !== true && input.quality_ack !== "on") {
          throw bad("read the quality report and confirm it before verifying", "quality_ack");
        }
        passport.quality.reviewed = { by: user.name, at: nowIso(), findings: passport.quality.defects.length };
      }
      passport.baseline = { verified: true, verified_by: user.name, result };
      return { action: "Verified the baseline", to: "Baseline verified",
        detail: passport.quality ? { quality_reviewed: passport.quality.defects.length } : undefined };
    },
  },

  seal: {
    role: "department", states: ["Baseline verified"], label: "Seal and publish the success criteria",
    async run({ client, rec, passport }) {
      const hash = sealHash(rec, passport.criteria);
      const at = nowIso();
      await client.query("update challenges set lock_hash = $1, locked_at = $2 where id = $3", [hash, at, rec.challenge_id]);
      passport.seal = { sha256: hash, sealed_at: at };
      return { action: "Sealed and published the success criteria", to: "Criteria sealed", detail: { seal: hash } };
    },
  },

  screen: {
    role: "admin", states: ["Criteria sealed"], label: "Set the risk envelope and screen startups",
    async run({ client, rec, passport }, input) {
      const envelope = {
        users: text(input.users, "users", { max: 300 }),
        systems: text(input.systems, "systems", { max: 300 }),
        allow_write: input.allow_write === true || input.allow_write === "yes",
        data_class: oneOf(input.data_class, "data class", ["none", "pseudonymised", "personal"]),
        reversibility: text(input.reversibility, "reversibility", { max: 300 }),
        exit_cost: text(input.exit_cost, "exit cost", { max: 300, optional: true }),
        cap_inr: num(input.cap_inr, "cap", { min: 0 }),
        start_date: date(input.start_date, "planned start"),
      };
      passport.risk = { ...envelope, data: `${envelope.data_class} data`,
        relaxation: "GFR 173(i) waivers apply to DPIIT-recognised startups within this cap" };
      passport.screening = screenAll(rec, envelope, await startupProfiles(client));
      passport.evaluation = null; // a new screen means a new panel round
      const c = passport.screening.candidates;
      return { action: "Set the risk envelope and screened startups",
        detail: { screened: c.length, eligible: c.filter((x) => x.result !== "rejected").length } };
    },
  },

  score: {
    role: "evaluator", states: ["Criteria sealed"], label: "Score the shortlist",
    allowed: (rec) => !!rec.passport.screening?.candidates.some((c) => c.result !== "rejected"),
    refuse: [409, "Nobody is on the shortlist yet: the Programme Administrator screens startups first."],
    run({ passport, user }, input) {
      const shortlist = new Map(passport.screening.candidates.filter((c) => c.result !== "rejected").map((c) => [c.user_id, c.name]));
      const scores = (Array.isArray(input.scores) ? input.scores : []).map((x) => {
        if (!shortlist.has(x?.user_id)) throw bad("score only startups on the shortlist", "scores");
        const score = num(x.score, `score for ${shortlist.get(x.user_id)}`, { min: 0 });
        if (score > 100 || !Number.isInteger(score)) throw bad("scores are whole numbers from 0 to 100", "scores");
        return { user_id: x.user_id, name: shortlist.get(x.user_id), score, note: text(x.note, "note", { max: 500, optional: true }) };
      });
      if (scores.length !== shortlist.size) throw bad("score every startup on the shortlist", "scores");
      const entry = { evaluator: user.name, evaluator_id: user.id, at: nowIso(), scores,
        dissent: text(input.dissent, "dissent", { max: 1000, optional: true }) };
      passport.evaluation ??= { panel: [] };
      // One entry per evaluator: scoring again replaces your own.
      passport.evaluation.panel = [...passport.evaluation.panel.filter((e) => e.evaluator_id !== user.id), entry];
      return { action: "Scored the shortlist", detail: { scores: scores.map((x) => ({ name: x.name, score: x.score })) } };
    },
  },

  award: {
    role: "admin", states: ["Criteria sealed"], label: "Award the pilot",
    allowed: (rec) => !!rec.passport.screening,
    refuse: [409, "Screen startups before awarding: the hard filters decide who may be chosen."],
    async run({ client, passport }, input) {
      if (!isUuid(input.startup_user_id)) throw bad("choose a startup account", "startup_user_id");
      const { rows: [startup] } = await client.query(
        "select id, name, org from users where id = $1 and role = 'startup' and active and not is_demo",
        [input.startup_user_id]);
      if (!startup) throw bad("choose a startup account", "startup_user_id");
      // The hard filters bind: a startup screened out cannot be awarded.
      const screened = passport.screening.candidates.find((c) => c.user_id === startup.id);
      if (!screened) throw new HttpError(409, `${startup.org || startup.name} was not part of the screening. Screen again first.`);
      if (screened.result === "rejected") {
        throw new HttpError(409, `${screened.name} was rejected at screening: ${screened.hard.filter((h) => !h.pass && !h.soft).map((h) => h.why).join(" ")}`);
      }
      const ms = Array.isArray(input.milestones) ? input.milestones : [];
      if (ms.length < 1 || ms.length > 8) throw bad("a pilot needs 1 to 8 milestones", "milestones");
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
      const panel = passport.evaluation?.panel ?? [];
      const mine = panel.flatMap((e) => e.scores.filter((x) => x.user_id === startup.id).map((x) => x.score));
      const { rows: [prof] } = await client.query("select * from startup_profiles where user_id = $1", [startup.id]);
      passport.startup = {
        name: startup.org || startup.name, contact: startup.name, user_id: startup.id,
        match_score: screened.score, terms: screened.result,
        panel_average: mine.length ? Math.round(mine.reduce((a, b) => a + b, 0) / mine.length) : null,
        verification: prof && { dpiit: prof.dpiit_recognised ? `Recognised${prof.dpiit_number ? ` (${prof.dpiit_number})` : ""} · self-declared` : "Not recognised",
          udyam: prof.udyam_registered ? "Registered · self-declared" : "Not registered" },
        capability: prof?.capabilities || undefined, prior_evidence: prof?.prior_evidence || undefined,
      };
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
    refuse: [403, "This pilot was not awarded to you."],
    async run({ client, rec, passport, user }, input) {
      const m = milestoneOf(passport, input.milestone, ["planned", "evidence submitted", "returned"]);
      const title = text(input.title, "title", { max: 200 });
      const mime = oneOf(input.mime, "file type", Object.keys(FILE_TYPES));
      if (typeof input.data !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(input.data)) throw bad("file data must be base64", "file");
      const bytes = Buffer.from(input.data, "base64");
      if (!bytes.length) throw bad("the file is empty", "file");
      if (bytes.length > MAX_FILE_BYTES) throw bad("files are limited to 3 MB", "file");
      const filename = String(input.filename ?? "").split(/[\\/]/).pop().replace(/[^\w.\- ()]/g, "_").slice(0, 120)
        || `evidence.${FILE_TYPES[mime]}`;
      const hash = sha256(bytes);
      const { rows: [f] } = await client.query(
        `insert into evidence_files (record_id, milestone, title, filename, mime, bytes, sha256, data, uploaded_by, uploaded_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id, uploaded_at`,
        [rec.id, m.n, title, filename, mime, bytes.length, hash, bytes, user.id, nowIso()]);
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
      m.payment = { state: "packet complete", packet_complete_on: today(), expected_by: addDays(today(), policy.payment_sla_days),
        sla_days: policy.payment_sla_days };
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
      if (paidOn < m.payment.packet_complete_on) throw bad("paid on can't be before the packet was complete", "paid_on");
      if (paidOn > today()) throw bad("paid on can't be in the future", "paid_on");
      const late = m.payment.expected_by && paidOn > m.payment.expected_by
        ? Math.round((Date.parse(paidOn) - Date.parse(m.payment.expected_by)) / 86400000) : 0;
      m.payment = { ...m.payment, state: late || m.payment.state === "delayed" ? "paid late" : "paid", paid_on: paidOn,
        ...(late && { delay_days: late }) };
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
        "insert into signatures (record_id, signer_name, signer_role, dissent_note, signed_at) values ($1, $2, $3, $4, $5)",
        [rec.id, user.name, ROLES.validator, dissent, nowIso()]);
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

Object.assign(ACTIONS, {
  compile_route: {
    role: "finance", states: ["Independently validated"], label: "Compile the procurement route",
    allowed: (rec) => !rec.passport.procurement,
    refuse: [409, "The route is already compiled."],
    async run({ client, rec, passport }, input) {
      const yes = (v, name) => oneOf(v, name, ["yes", "no"]) === "yes";
      const { rows: [prof] } = await client.query("select dpiit_recognised, gem_ratings from startup_profiles where user_id = $1",
        [rec.startup_user_id]);
      const met = !!passport.validation?.kpis?.length && passport.validation.kpis.every((k) => k.met);
      passport.procurement = compileRoute({
        met, winners: met ? 1 : 0,
        same_department: yes(input.same_department, "same department"),
        scale_up: yes(input.scale_up, "scale-up"),
        dpiit: !!prof?.dpiit_recognised, gem_ratings: prof?.gem_ratings ?? 0,
      });
      const p = passport.procurement;
      return p.accepted
        ? { action: `Compiled the procurement route: ${p.accepted.route}`, to: "Procurement-ready", detail: { route: p.accepted.route } }
        : { action: "Compiled the procurement route: no lawful route (learning record)", to: LEARNING, detail: { learning_record: true } };
    },
  },

  approve_route: {
    role: "department", states: ["Procurement-ready"], label: "Approve the procurement route",
    allowed: (rec) => !rec.passport.procurement?.approved_by,
    refuse: [409, "The route is already approved."],
    run({ passport, user }, input) {
      passport.procurement.approved_by = user.name;
      passport.procurement.approved_at = nowIso();
      passport.procurement.approval_note = text(input.note, "note", { max: 1000, optional: true });
      return { action: `Approved the route: ${passport.procurement.accepted.route}` };
    },
  },
});

// ---- phase 4: after the purchase -----------------------------------------------

// Where the KPI stands now against where it started, what was validated, and the target.
export function outcomeNow(rec, kpiNow) {
  const baseline = Number(rec.baseline_value), target = Number(rec.target_value);
  const down = rec.target_direction === "decrease";
  const change = kpiNow - baseline;
  return {
    baseline, target, now: kpiNow,
    validated: rec.post_value != null ? Number(rec.post_value) : null,
    change, change_pct: baseline ? Math.round((1000 * change) / baseline) / 10 : null,
    held: down ? kpiNow <= target : kpiNow >= target,
  };
}

export function adoptionVerdict(m, p = policy) {
  if (m.usage_pct < p.adoption_threshold_pct) {
    return { verdict: "not adopted", why: `${m.usage_pct}% of trained staff use it weekly, below the ${p.adoption_threshold_pct}% threshold.` };
  }
  if (!m.outcome.held) return { verdict: "outcome not held", why: `In use (${m.usage_pct}%), but the KPI is ${m.outcome.now} against a target of ${m.outcome.target}.` };
  return { verdict: "adopted", why: `${m.usage_pct}% weekly use, and the KPI held at ${m.outcome.now} (target ${m.outcome.target}).` };
}

Object.assign(ACTIONS, {
  record_deployment: {
    role: "department", states: ["Procurement-ready"], label: "Record the deployment",
    allowed: (rec) => !!rec.passport.procurement?.approved_by,
    refuse: [409, "Approve the procurement route first."],
    run({ passport }, input) {
      const goLive = date(input.go_live, "go-live");
      if (goLive > today()) throw bad("record the deployment once it has gone live", "go_live");
      passport.deployment = {
        order: text(input.order_reference, "order reference", { max: 200 }),
        route: passport.procurement.accepted.route,
        sites: text(input.sites, "sites", { max: 500 }),
        go_live: goLive,
        annual_cost_inr: num(input.annual_cost_inr, "annual cost", { min: 0 }),
        staff_to_train: num(input.staff_to_train, "staff to train", { min: 1 }),
      };
      return { action: `Recorded the deployment: live ${goLive}`, to: "Deployed" };
    },
  },

  record_adoption: {
    role: "department", states: ["Deployed", "Adoption measured"], label: "Record an adoption measurement",
    async run({ client, rec, passport }, input) {
      const measuredOn = date(input.measured_on, "measured on");
      if (measuredOn > today()) throw bad("measured on can't be in the future", "measured_on");
      if (measuredOn < passport.deployment.go_live) throw bad("measure after the go-live date", "measured_on");
      const trained = num(input.staff_trained, "staff trained", { min: 0 });
      const active = num(input.weekly_active, "weekly active staff", { min: 0 });
      if (active > trained) throw bad("weekly active staff can't exceed staff trained", "weekly_active");
      const respondents = num(input.survey_respondents ?? 0, "survey respondents", { min: 0 });
      const keep = respondents ? num(input.survey_would_keep, "would keep using", { min: 0 }) : 0;
      if (keep > respondents) throw bad("more staff would keep it than answered the survey", "survey_would_keep");
      const kpiNow = num(input.kpi_value, `${rec.kpi_name} now`, { field: "kpi_value" });
      const m = {
        measured_on: measuredOn,
        days_since_go_live: Math.round((Date.parse(measuredOn) - Date.parse(passport.deployment.go_live)) / 86400000),
        staff_trained: trained, weekly_active: active,
        usage_pct: trained ? Math.round((100 * active) / trained) : 0,
        survey: respondents ? { respondents, would_keep: keep, would_keep_pct: Math.round((100 * keep) / respondents) } : null,
        outcome: outcomeNow(rec, kpiNow),
        drop_off: text(input.drop_off, "drop-off", { max: 500, optional: true }),
        citizen_impact: text(input.citizen_impact, "citizen impact", { max: 500, optional: true }),
        operational_cost_inr: input.operational_cost_inr ? num(input.operational_cost_inr, "operational cost", { min: 0 }) : null,
        unresolved_risks: text(input.unresolved_risks, "unresolved risks", { max: 500, optional: true }),
      };
      Object.assign(m, adoptionVerdict(m));
      passport.adoption ??= { measurements: [] };
      passport.adoption.measurements = [...passport.adoption.measurements, m].sort((a, b) => a.measured_on.localeCompare(b.measured_on));
      passport.adoption.latest = passport.adoption.measurements.at(-1);
      // The KPI reading joins the pilot's readings, so the trend runs baseline -> pilot -> deployment.
      await client.query("insert into readings (record_id, reading_date, kpi_value) values ($1, $2, $3)", [rec.id, measuredOn, kpiNow]);
      return { action: `Measured adoption at ${m.days_since_go_live} days: ${m.verdict}`, to: "Adoption measured",
        detail: { usage_pct: m.usage_pct, kpi_now: kpiNow, verdict: m.verdict },
        record: { adoption_pct: passport.adoption.latest.usage_pct } };
    },
  },

  replication_review: {
    role: "admin", states: ["Adoption measured"], label: "Review for replication",
    run({ passport, user }, input) {
      const decision = oneOf(input.decision, "decision", ["replicate", "hold", "learning record"]);
      const latest = passport.adoption.latest;
      if (decision === "replicate" && latest.verdict !== "adopted") {
        throw new HttpError(409, `Can't recommend replication: ${latest.why} Hold for another measurement, or close it as a learning record.`);
      }
      const list = (v) => (Array.isArray(v) ? v : String(v ?? "").split(/[,\n]/)).map((x) => String(x).trim()).filter(Boolean).slice(0, 20);
      const REUSABLE = ["Baseline method", "Sealed KPIs", "Risk envelope", "Validator method", "Exit annexure", "Milestone plan"];
      const review = {
        decision, reviewed_by: user.name, reviewed_on: today(),
        basis: latest.why,
        interested: list(input.interested),
        reusable: list(input.reusable).filter((x) => REUSABLE.includes(x)),
        remaining_risks: text(input.remaining_risks, "remaining risks", { max: 1000, optional: true }),
        next_review: decision === "hold" ? date(input.next_review, "next review") : (input.next_review ? date(input.next_review, "next review") : null),
        note: text(input.note, "note", { max: 1000, optional: true }),
      };
      if (review.next_review && review.next_review <= today()) throw bad("the next review must be in the future", "next_review");
      passport.replication = { ...review, history: [...(passport.replication?.history ?? []), review] };
      const to = decision === "replicate" ? "Replication-ready" : decision === "learning record" ? LEARNING : undefined;
      return { action: decision === "replicate" ? "Recommended for replication" : decision === "hold" ? "Held for another measurement" : "Closed as a learning record",
        to, detail: { decision } };
    },
  },
});

export async function startupProfiles(client = db()) {
  const { rows } = await client.query(
    `select u.id as user_id, u.name, u.org, sp.user_id is not null as has_profile,
            sp.dpiit_recognised, sp.sectors, sp.districts, sp.capabilities, sp.needs_write_access, sp.data_needed,
            sp.prior_deployments, sp.prior_evidence, sp.gem_ratings, sp.available_from::text as available_from
       from users u left join startup_profiles sp on sp.user_id = u.id
      where u.role = 'startup' and u.active and not u.is_demo order by coalesce(u.org, u.name)`);
  return rows;
}

// opts.sample: only the seed script, building the fictional sample programme, passes this.
export async function runAction(user, recordId, name, input, opts = {}) {
  const act = ACTIONS[name];
  if (!act) throw new HttpError(400, `unknown action ${name}`);
  return withTx(async (client) => {
    const rec = isUuid(recordId) && await lockPassport(client, "r.id = $1", [recordId]);
    if (!rec) throw new HttpError(404, "No such passport.");
    if (rec.is_simulated) throw new HttpError(403, "The demo passport moves only through its demo steps.");
    if (isSample(rec) && !opts.sample) throw new HttpError(403, "Sample pilots are read-only.");
    if (user.is_demo) throw new HttpError(403, "Demo accounts can only act on the demo.");
    if (user.role !== act.role) throw new HttpError(403, `${act.label} is for the ${ROLES[act.role]}.`);
    if (!act.states.includes(rec.passport_state)) {
      throw new HttpError(409, `Can't ${act.label.toLowerCase()} while the passport is ${rec.passport_state}.`);
    }
    if (act.allowed && !act.allowed(rec, user)) throw new HttpError(...act.refuse);

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
  if (!user || user.is_demo || bundle.challenge.is_simulated || bundle.sample) return [];
  return openActions(user, bundle);
}

// What the pilot is waiting on, and from whom: the open actions for each role (the startup
// role means the awarded startup). Shown to everyone, including on read-only sample pilots.
export async function pendingActions(bundle) {
  if (bundle.challenge.is_simulated) return [];
  const out = [];
  for (const role of ["admin", "department", "evaluator", "startup", "validator", "finance"]) {
    const user = { role, id: role === "startup" ? bundle.record.startup_user_id : null, is_demo: false };
    if (role === "startup" && !user.id) continue;
    for (const a of await openActions(user, bundle)) {
      out.push({ action: a.name, label: a.label, role, role_label: ROLES[role], milestones: a.milestones?.map((m) => m.n) });
    }
  }
  return out;
}

async function openActions(user, bundle) {
  const { record: rec, passport: p } = bundle;
  const ms = (states) => p.milestones.filter((m) => states.includes(m.state)).map((m) => ({ n: m.n, title: m.title }));
  const out = [];
  for (const [name, act] of Object.entries(ACTIONS)) {
    if (act.role !== user.role || !act.states.includes(rec.passport_state)) continue;
    if (act.allowed && !act.allowed({ ...rec, passport: p }, user)) continue;
    const a = { name, label: act.label };
    if (name === "award") {
      const avg = (id) => { const s = (p.evaluation?.panel ?? []).flatMap((e) => e.scores.filter((x) => x.user_id === id).map((x) => x.score));
        return s.length ? Math.round(s.reduce((x, y) => x + y, 0) / s.length) : null; };
      a.startups = p.screening.candidates.filter((c) => c.result !== "rejected")
        .map((c) => ({ id: c.user_id, name: c.name, score: c.score, terms: c.result, panel: avg(c.user_id) }));
      if (!a.startups.length) continue;
    }
    if (name === "score") {
      const mine = p.evaluation?.panel?.find((e) => e.evaluator_id === user.id);
      a.shortlist = p.screening.candidates.filter((c) => c.result !== "rejected").map((c) => ({ id: c.user_id, name: c.name, score: c.score,
        mine: mine?.scores.find((x) => x.user_id === c.user_id) ?? null }));
    }
    if (name === "verify_baseline") a.quality = p.quality ?? null;
    if (name === "replication_review") a.latest = p.adoption?.latest ?? null;
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
