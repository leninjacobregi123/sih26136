// Phase 4: deployment, adoption measured against the baseline, replication review, and the
// public programme dashboard. Against a database.
//   TEST_DATABASE_URL=postgresql://... npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const url = process.env.TEST_DATABASE_URL;
if (url) {
  process.env.DATABASE_URL = url;
  delete process.env.DATABASE_PASSWORD;
}
process.env.SESSION_SECRET ||= randomBytes(32).toString("base64url");
process.env.LLM_API_KEY = "";
const skip = !url && "set TEST_DATABASE_URL to run";

const { db } = await import("../api/_lib.js");
const auth = await import("../api/_auth.js");
const { createChallenge, runAction, availableActions, outcomeNow, adoptionVerdict } = await import("../api/_actions.js");
const { getBundle } = await import("../api/_passport.js");
const { policy } = await import("../api/_matching.js");
const { default: programme } = await import("../api/programme.js");

const run = Date.now().toString(36) + "p4";
const DEPT = `Urban Health ${run}`;
const TODAY = new Date().toISOString().slice(0, 10);
const ago = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const later = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const u = {};

before(async () => {
  if (!url) return;
  const mk = (role, extra = {}) => auth.createUser({ email: `${role}-${run}@test.invalid`, name: `${role} ${run}`, role, password: "x".repeat(12), ...extra });
  for (const r of ["department", "admin", "finance", "validator"]) u[r] = await mk(r);
  u.startup = await mk("startup", { org: `Queue ${run}` });
  await db().query(`insert into startup_profiles (user_id, dpiit_recognised, capabilities, sectors, gem_ratings)
    values ($1, true, 'OPD median wait from registration timestamps', '{Health}', 2)`, [u.startup.id]);
});
after(async () => { if (url) await db().end(); });

test("outcome against baseline and the adoption verdict", () => {
  const rec = { baseline_value: "94", target_value: "60", target_direction: "decrease", post_value: "55" };
  assert.deepEqual(outcomeNow(rec, 57), { baseline: 94, target: 60, now: 57, validated: 55, change: -37, change_pct: -39.4, held: true });
  assert.equal(outcomeNow(rec, 70).held, false);
  const v = (usage, held) => adoptionVerdict({ usage_pct: usage, outcome: { held, now: held ? 57 : 70, target: 60 } }).verdict;
  assert.equal(v(83, true), "adopted");
  assert.equal(v(policy.adoption_threshold_pct - 1, true), "not adopted");
  assert.equal(v(83, false), "outcome not held");
});

// Draft -> Procurement-ready with an approved route, through the real actions.
async function procured() {
  const { record_id: id } = await createChallenge(u.department, {
    department: DEPT, district: "Nagpur", sector: "Health", outcome_statement: "Cut OPD wait", kpi_name: "Median wait",
    kpi_unit: "min", kpi_definition: "registration to clinician", baseline_value: "94", baseline_source: "HMIS",
    baseline_method: "All visits", comparison_unit: "Second OPD", target_value: "60", target_direction: "decrease", duration_days: "90" });
  await runAction(u.admin, id, "verify_baseline", { result: "ok", quality_ack: true });
  await runAction(u.department, id, "seal", {});
  await runAction(u.admin, id, "screen", { users: "One OPD", systems: "Timestamps", allow_write: "no", data_class: "pseudonymised",
    reversibility: "A day", cap_inr: "1500000", start_date: "2026-11-01" });
  await runAction(u.admin, id, "award", { startup_user_id: u.startup.id, scope: "s", data_access: "d",
    milestones: [{ title: "a", evidence_expected: "e", due: "2026-12-01", amount_inr: 300000 }] });
  await runAction(u.startup, id, "upload_evidence", { milestone: 1, title: "x", filename: "x.txt", mime: "text/plain", data: Buffer.from("x").toString("base64") });
  await runAction(u.department, id, "review_milestone", { milestone: 1, decision: "accept" });
  await runAction(u.finance, id, "record_payment", { milestone: 1, outcome: "paid", paid_on: TODAY });
  await runAction(u.validator, id, "attest", { achieved: "55", method: "DiD" });
  await runAction(u.finance, id, "compile_route", { same_department: "yes", scale_up: "no" });
  return id;
}
const DEPLOY = { order_reference: "GEMC-123", sites: "OPD", go_live: ago(90), annual_cost_inr: "240000", staff_to_train: "46" };
const MEASURE = { measured_on: ago(30), staff_trained: "46", weekly_active: "38", kpi_value: "57", survey_respondents: "20", survey_would_keep: "17" };
const refused = (status, re) => (e) => e.status === status && (!re || re.test(e.message));

test("a pilot runs on to Replication-ready, measured against its own baseline", { skip }, async () => {
  const id = await procured();
  await assert.rejects(runAction(u.department, id, "record_deployment", DEPLOY), refused(409, /Approve the procurement route/));
  await runAction(u.department, id, "approve_route", {});
  await assert.rejects(runAction(u.department, id, "record_deployment", { ...DEPLOY, go_live: later(3) }), refused(422, /gone live/));
  await runAction(u.department, id, "record_deployment", DEPLOY);
  let b = await getBundle(id);
  assert.equal(b.record.passport_state, "Deployed");
  assert.match(b.passport.deployment.route, /Tier 3/);

  await assert.rejects(runAction(u.department, id, "record_adoption", { ...MEASURE, weekly_active: "50" }), refused(422, /exceed/));
  await assert.rejects(runAction(u.department, id, "record_adoption", { ...MEASURE, measured_on: ago(120) }), refused(422, /after the go-live/));
  await assert.rejects(runAction(u.department, id, "record_adoption", { ...MEASURE, survey_would_keep: "21" }), refused(422, /more staff/));
  await assert.rejects(runAction(u.admin, id, "replication_review", { decision: "replicate" }), refused(409, /Deployed/));

  // Two measurements, out of order: kept in date order, latest is the newest.
  await runAction(u.department, id, "record_adoption", MEASURE);
  await runAction(u.department, id, "record_adoption", { ...MEASURE, measured_on: ago(60), weekly_active: "30", kpi_value: "62" });
  b = await getBundle(id);
  assert.equal(b.record.passport_state, "Adoption measured");
  const ms = b.passport.adoption.measurements;
  assert.deepEqual(ms.map((m) => m.days_since_go_live), [30, 60]);
  assert.deepEqual(ms.map((m) => m.verdict), ["outcome not held", "adopted"]);
  assert.equal(b.passport.adoption.latest.usage_pct, 83);
  assert.equal(b.passport.adoption.latest.survey.would_keep_pct, 85);
  assert.equal(Number(b.record.adoption_pct), 83);
  assert.ok(b.readings.some((r) => Number(r.kpi_value) === 57), "the KPI reading joins the pilot's readings");

  await assert.rejects(runAction(u.admin, id, "replication_review", { decision: "hold" }), refused(422, /next review/));
  await assert.rejects(runAction(u.admin, id, "replication_review", { decision: "hold", next_review: ago(1) }), refused(422, /future/));
  await runAction(u.admin, id, "replication_review", { decision: "hold", next_review: later(30) });
  assert.equal((await getBundle(id)).record.passport_state, "Adoption measured");
  await runAction(u.admin, id, "replication_review", { decision: "replicate", interested: "Amravati DH\nAkola DH",
    reusable: ["Baseline method", "Sealed KPIs", "Not a real option"], remaining_risks: "Beacon maintenance" });
  b = await getBundle(id);
  assert.equal(b.record.passport_state, "Replication-ready");
  assert.deepEqual(b.passport.replication.interested, ["Amravati DH", "Akola DH"]);
  assert.deepEqual(b.passport.replication.reusable, ["Baseline method", "Sealed KPIs"]);
  assert.equal(b.passport.replication.history.length, 2);
  assert.equal(b.chain.intact, true);
  assert.deepEqual(await availableActions(u.admin, b), []);
});

test("a validated pilot nobody uses can't be replicated: it closes as a learning record", { skip }, async () => {
  const id = await procured();
  await runAction(u.department, id, "approve_route", {});
  await runAction(u.department, id, "record_deployment", DEPLOY);
  await runAction(u.department, id, "record_adoption", { ...MEASURE, weekly_active: "9" });
  const b0 = await getBundle(id);
  assert.equal(b0.passport.adoption.latest.verdict, "not adopted");
  assert.equal((await availableActions(u.admin, b0))[0].latest.verdict, "not adopted", "the review form carries the verdict");
  await assert.rejects(runAction(u.admin, id, "replication_review", { decision: "replicate" }), refused(409, /20% of trained staff/));
  await runAction(u.admin, id, "replication_review", { decision: "learning record", note: "Night shift never adopted it" });
  const b = await getBundle(id);
  assert.equal(b.record.passport_state, "Learning record");
  assert.equal(b.audit.at(-1).detail.from, "Adoption measured", "the page draws the rail up to where it stopped");
  await assert.rejects(runAction(u.department, id, "record_adoption", MEASURE), refused(409));
});

test("the public dashboard counts the programme without naming startups", { skip }, async () => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.body = o; } };
  await programme({ method: "GET", headers: {} }, res);
  const d = res.body.dashboard;
  assert.equal(res.code, 200);
  const mine = d.results.filter((r) => r.department === DEPT);
  assert.equal(mine.length, 2);
  const done = mine.find((r) => r.state === "Replication-ready");
  assert.deepEqual({ validated: done.validated, gain: done.validated_gain_pct, now: done.now, now_gain: done.now_gain_pct, use: done.usage_pct, v: done.verdict },
    { validated: 55, gain: 41.5, now: 57, now_gain: 39.4, use: 83, v: "adopted" });
  assert.equal(mine.find((r) => r.state === "Learning record").verdict, "not adopted");
  assert.ok(d.by_state.some((s) => s.state === "Learning record" && s.n >= 1));
  assert.ok(d.by_state.find((s) => s.state === "Replication-ready").n >= 1);
  assert.ok(d.routes.some((r) => /Tier 3/.test(r.name)));
  const text = JSON.stringify(res.body);
  assert.ok(!text.includes(`Queue ${run}`) && !text.includes(`department ${run}`), "no startup or person names");
});
