// Phase 3: the quality gate, explainable matching, the procurement route compiler and the
// payment SLA ledger. The rule engines are tested without a database; the rest against one.
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

const { ruleCheck, qualityReport } = await import("../api/_quality.js");
const { screenOne, screenAll, policy } = await import("../api/_matching.js");
const { compileRoute, slaStatus } = await import("../api/_procurement.js");
const { db } = await import("../api/_lib.js");
const auth = await import("../api/_auth.js");
const { createChallenge, checkChallenge, runAction, availableActions } = await import("../api/_actions.js");
const { getBundle } = await import("../api/_passport.js");
const { default: ledger } = await import("../api/programme.js");

const SOUND = {
  outcome_statement: "Cut median wait from OPD registration to first clinician contact", kpi_name: "Median wait",
  kpi_unit: "min", kpi_definition: "Median of consultation minus registration time", comparison_unit: "Second OPD, no deployment",
  duration_days: 90,
};
const codes = (list) => list.map((d) => d.code).sort();

// ---- quality gate ---------------------------------------------------------------

test("rules flag what they can check without a model", () => {
  assert.deepEqual(ruleCheck(SOUND), []);
  assert.deepEqual(codes(ruleCheck({ ...SOUND, kpi_unit: "", kpi_definition: "" })), ["KPI_NOT_MEASURABLE", "KPI_NOT_MEASURABLE"]);
  assert.deepEqual(codes(ruleCheck({ ...SOUND, comparison_unit: "" })), ["OUTCOME_NOT_ATTRIBUTABLE"]);
  const sol = ruleCheck({ ...SOUND, outcome_statement: "Develop a mobile app to reduce citizen complaints" });
  assert.deepEqual(codes(sol), ["SOLUTION_PRESUPPOSED"]);
  assert.equal(sol[0].span, "mobile app");
  assert.deepEqual(codes(ruleCheck({ ...SOUND, duration_days: 10 })), ["TIMELINE_INFEASIBLE"]);
  assert.deepEqual(codes(ruleCheck({ ...SOUND, duration_days: null })), ["TIMELINE_INFEASIBLE"]);
  // "Application" of a method is not a named solution unless something is being built.
  assert.deepEqual(ruleCheck({ ...SOUND, outcome_statement: "Fewer rejected applications at the counter" }), []);
});

test("without a model the report stands on the rules, and says so", async () => {
  const r = await qualityReport({ ...SOUND, comparison_unit: "" });
  assert.equal(r.model, null);
  assert.match(r.model_error, /LLM_API_KEY/);
  assert.deepEqual(codes(r.defects), ["OUTCOME_NOT_ATTRIBUTABLE"]);
  assert.match(r.text_sha256, /^[0-9a-f]{64}$/);
});

// ---- matching -------------------------------------------------------------------

const CH = { outcome_statement: "Cut median OPD wait", kpi_name: "Median wait", kpi_definition: "registration to clinician", sector: "Health", district: "Nagpur" };
const ENV = { allow_write: false, data_class: "pseudonymised", start_date: "2026-11-01" };
const P = { has_profile: true, dpiit_recognised: true, needs_write_access: false, data_needed: "pseudonymised", sectors: ["Health"],
  districts: ["Nagpur"], capabilities: "OPD queue analytics from registration timestamps", prior_deployments: 2,
  prior_evidence: "median wait down 41%", available_from: null };

test("hard filters bind and say what would change them", () => {
  const w = screenOne(CH, ENV, { ...P, needs_write_access: true });
  assert.equal(w.result, "rejected");
  assert.match(w.hard.find((h) => !h.pass).counterfactual, /allowed writes/);
  assert.equal(screenOne(CH, ENV, { ...P, data_needed: "personal" }).result, "rejected");
  assert.equal(screenOne(CH, ENV, { ...P, available_from: "2027-01-01" }).result, "rejected");
  assert.equal(screenOne(CH, ENV, { has_profile: false }).result, "rejected");
  const std = screenOne(CH, ENV, { ...P, dpiit_recognised: false });
  assert.equal(std.result, "standard terms", "no DPIIT changes the terms, not eligibility");
  assert.match(std.hard.find((h) => h.soft).counterfactual, /DPIIT/);
});

test("the score is the sum of explained components on the published weights", () => {
  const r = screenOne(CH, ENV, P);
  assert.equal(r.result, "eligible");
  assert.deepEqual(r.components.map((c) => c.weight), Object.values(policy.match_weights));
  assert.equal(r.score, r.components.reduce((a, c) => a + c.points, 0));
  assert.match(r.components[0].why, /opd/);
  assert.equal(r.components[1].points, 25, "2 deployments with a measured result is full evidence marks");
  const weaker = screenOne(CH, ENV, { ...P, capabilities: "Payroll software", prior_deployments: 0, prior_evidence: "" });
  assert.ok(weaker.score < r.score);
  const all = screenAll(CH, ENV, [{ ...P, user_id: "b", name: "B", needs_write_access: true }, { ...P, user_id: "a", name: "A" }]);
  assert.deepEqual(all.candidates.map((c) => c.result), ["eligible", "rejected"], "rejected sort last");
});

// ---- procurement route compiler -------------------------------------------------------

const F = { met: true, winners: 1, same_department: true, scale_up: false, dpiit: true, gem_ratings: 2 };
const route = (r) => r.accepted?.route.split(" — ")[0] ?? null;

test("without the GR, one winner in one department goes to Tier 3, and says why Tier 1 is closed", () => {
  const r = compileRoute(F);
  assert.equal(route(r), "Tier 3");
  const t1 = r.rejected.find((x) => x.route.startsWith("Tier 1"));
  assert.match(t1.why, /Government Resolution is not in force/);
  assert.match(t1.counterfactual, /If the deeming Government Resolution were in force, Tier 1/);
  assert.match(r.rejected.find((x) => x.route.startsWith("Tier 2")).counterfactual, /two or more/);
  assert.match(r.accepted.next, /2 of 3 buyer ratings/);
});

test("with the GR in force, Tier 1; with scale-up, the catalogue first; missed criteria, nothing", () => {
  assert.equal(route(compileRoute(F, { ...policy, deeming_gr_in_force: true })), "Tier 1");
  assert.equal(route(compileRoute({ ...F, scale_up: true }, { ...policy, deeming_gr_in_force: true })), "Tier 3");
  assert.equal(route(compileRoute({ ...F, winners: 2 })), "Tier 2");
  const none = compileRoute({ ...F, met: false, winners: 0 });
  assert.equal(none.accepted, null);
  assert.equal(none.learning_record, true);
  assert.equal(none.approvals.length, 0);
  assert.equal(route(compileRoute({ ...F, dpiit: false })), null, "no DPIIT, no GR, one winner: no lawful route");
});

// ---- SLA ledger -----------------------------------------------------------------

test("payment status is measured against the SLA", () => {
  const y = { packet_complete_on: "2026-10-01", expected_by: "2026-10-31" };
  assert.equal(slaStatus({ state: "not due" }).status, "not due");
  assert.deepEqual(slaStatus(y, "2026-10-21"), { status: "on track", label: "Due in 10 days", days_left: 10 });
  const late = slaStatus(y, "2026-11-05");
  assert.equal(late.status, "overdue");
  assert.equal(late.days_overdue, 5);
  assert.deepEqual(late.grievance, { opened_on: "2026-11-01", response_due: "2026-12-01" });
  assert.equal(slaStatus({ ...y, paid_on: "2026-10-30" }).status, "paid on time");
  assert.equal(slaStatus({ ...y, paid_on: "2026-11-03" }).days_late, 3);
});

// ---- through the workflow, against a database -------------------------------------

const run = Date.now().toString(36) + "p3";
const u = {};
before(async () => {
  if (!url) return;
  const mk = (role, extra = {}) => auth.createUser({ email: `${role}-${run}-${Math.random().toString(36).slice(2, 6)}@test.invalid`,
    name: `${role} ${run}`, role, password: "x".repeat(12), ...extra });
  u.department = await mk("department"); u.admin = await mk("admin"); u.finance = await mk("finance");
  u.validator = await mk("validator"); u.e1 = await mk("evaluator"); u.e2 = await mk("evaluator");
  u.good = await mk("startup", { org: `Good OPD ${run}` }); u.writer = await mk("startup", { org: `Writer ${run}` });
  u.bare = await mk("startup", { org: `No profile ${run}` });
  const prof = (user, p) => db().query(
    `insert into startup_profiles (user_id, dpiit_recognised, capabilities, needs_write_access, data_needed, sectors, gem_ratings, prior_deployments, prior_evidence)
     values ($1, $2, $3, $4, 'pseudonymised', '{Health}', $5, 2, 'median wait down 41%')`,
    [user.id, p.dpiit, p.cap, p.write, p.gem ?? 0]);
  await prof(u.good, { dpiit: true, cap: "OPD median wait from registration timestamps", write: false, gem: 2 });
  await prof(u.writer, { dpiit: true, cap: "OPD rosters written back to HMIS", write: true });
});
after(async () => { if (url) await db().end(); });

const CHALLENGE = { department: `Health ${run}`, district: "Nagpur", sector: "Health", outcome_statement: "Cut median OPD wait",
  kpi_name: "Median wait", kpi_unit: "min", kpi_definition: "registration to clinician", baseline_value: "94",
  baseline_source: "HMIS", baseline_method: "All visits", target_value: "60", target_direction: "decrease", duration_days: "90" };
const ENVELOPE = { users: "One OPD", systems: "Timestamps", allow_write: "no", data_class: "pseudonymised",
  reversibility: "A day", cap_inr: "1500000", start_date: "2026-11-01" };

test("the quality report is stored, previewable, and must be read before publication", { skip }, async () => {
  const preview = await checkChallenge(u.department, { ...CHALLENGE, comparison_unit: "" });
  assert.deepEqual(codes(preview.defects), ["OUTCOME_NOT_ATTRIBUTABLE"]);
  await assert.rejects(checkChallenge(u.admin, CHALLENGE), (e) => e.status === 403);
  const { record_id: id } = await createChallenge(u.department, CHALLENGE);
  let b = await getBundle(id);
  assert.deepEqual(codes(b.passport.quality.defects), ["OUTCOME_NOT_ATTRIBUTABLE"]);
  assert.equal(b.audit[0].detail.quality_findings, 1);
  const [a] = await availableActions(u.admin, b);
  assert.equal(a.quality.defects.length, 1, "the admin's form carries the report");
  await runAction(u.admin, id, "verify_baseline", { result: "ok", quality_ack: "on" });
  b = await getBundle(id);
  assert.equal(b.passport.quality.reviewed.by, u.admin.name);
  assert.equal(b.passport.quality.reviewed.findings, 1);
});

async function sealed() {
  const { record_id: id } = await createChallenge(u.department, { ...CHALLENGE, comparison_unit: "Second OPD" });
  await runAction(u.admin, id, "verify_baseline", { result: "ok", quality_ack: true });
  await runAction(u.department, id, "seal", {});
  return id;
}

test("screening gates the award; the panel scores the shortlist", { skip }, async () => {
  const id = await sealed();
  const names = async () => (await availableActions(u.admin, await getBundle(id))).map((a) => a.name);
  assert.deepEqual(await names(), ["screen"], "no award before screening");
  await assert.rejects(runAction(u.admin, id, "award", { startup_user_id: u.good.id }), (e) => e.status === 409 && /Screen startups/.test(e.message));
  await assert.rejects(runAction(u.e1, id, "score", {}), (e) => e.status === 409);

  await runAction(u.admin, id, "screen", ENVELOPE);
  let b = await getBundle(id);
  const c = (who) => b.passport.screening.candidates.find((x) => x.user_id === who.id);
  assert.equal(c(u.good).result, "eligible");
  assert.equal(c(u.writer).result, "rejected");
  assert.equal(c(u.bare).result, "rejected");
  assert.equal(b.passport.risk.allow_write, false);
  assert.deepEqual(await names(), ["screen", "award"]);
  const awardChoices = (await availableActions(u.admin, b)).find((a) => a.name === "award").startups.map((s) => s.id);
  assert.ok(awardChoices.includes(u.good.id) && !awardChoices.includes(u.writer.id));

  await assert.rejects(runAction(u.admin, id, "award", { startup_user_id: u.writer.id, scope: "s", data_access: "d",
    milestones: [{ title: "t", evidence_expected: "e", due: "2026-12-01", amount_inr: 1 }] }),
    (e) => e.status === 409 && /rejected at screening: Needs write access/.test(e.message));

  // Each evaluator scores the whole shortlist; scoring again replaces their own entry.
  const shortlist = b.passport.screening.candidates.filter((x) => x.result !== "rejected");
  const scores = (n) => shortlist.map((x) => ({ user_id: x.user_id, score: n }));
  await assert.rejects(runAction(u.e1, id, "score", { scores: [] }), (e) => e.status === 422 && /every startup/.test(e.message));
  await assert.rejects(runAction(u.e1, id, "score", { scores: [{ user_id: u.writer.id, score: 50 }] }), (e) => /shortlist/.test(e.message));
  await assert.rejects(runAction(u.e1, id, "score", { scores: scores(101) }), (e) => /0 to 100/.test(e.message));
  await runAction(u.e1, id, "score", { scores: scores(60) });
  await runAction(u.e1, id, "score", { scores: scores(80) });
  await runAction(u.e2, id, "score", { scores: scores(70), dissent: "Wants log proof at M2" });
  b = await getBundle(id);
  assert.equal(b.passport.evaluation.panel.length, 2);
  await runAction(u.admin, id, "award", { startup_user_id: u.good.id, scope: "s", data_access: "d",
    milestones: [{ title: "t", evidence_expected: "e", due: "2026-12-01", amount_inr: 100000 }] });
  b = await getBundle(id);
  assert.equal(b.passport.startup.panel_average, 75);
  assert.equal(b.passport.startup.match_score, c(u.good).score);
  assert.match(b.passport.startup.verification.dpiit, /self-declared/);
});

test("route compiled from the passport's own facts, then approved; payments measured against the SLA", { skip }, async () => {
  const id = await sealed();
  await runAction(u.admin, id, "screen", ENVELOPE);
  await runAction(u.admin, id, "award", { startup_user_id: u.good.id, scope: "s", data_access: "d",
    milestones: [{ title: "a", evidence_expected: "e", due: "2026-12-01", amount_inr: 100000 },
                 { title: "b", evidence_expected: "e", due: "2026-12-02", amount_inr: 200000 }] });
  for (const m of [1, 2]) {
    await runAction(u.good, id, "upload_evidence", { milestone: m, title: "x", filename: "x.txt", mime: "text/plain", data: Buffer.from("x").toString("base64") });
    await runAction(u.department, id, "review_milestone", { milestone: m, decision: "accept" });
  }
  let b = await getBundle(id);
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(b.passport.milestones[0].payment.sla_days, policy.payment_sla_days);
  assert.equal(b.ledger[0].status, "on track");
  // Paid inside the window: on time. Paid after it: late, with the days counted.
  await runAction(u.finance, id, "record_payment", { milestone: 1, outcome: "paid", paid_on: today });
  // Milestone 2's packet was completed 40 days ago (rewritten in the record), so today is 10 days past its SLA.
  const ago = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  await db().query(`update records set passport = jsonb_set(jsonb_set(passport, '{milestones,1,payment,packet_complete_on}', to_jsonb($2::text)),
    '{milestones,1,payment,expected_by}', to_jsonb($3::text)) where id = $1`, [id, ago(40), ago(10)]);
  assert.equal((await getBundle(id)).ledger[1].status, "overdue");
  assert.equal((await getBundle(id)).ledger[1].days_overdue, 10);
  await runAction(u.finance, id, "record_payment", { milestone: 2, outcome: "paid", paid_on: ago(4) });
  b = await getBundle(id);
  assert.equal(b.passport.milestones[0].payment.state, "paid");
  assert.equal(b.passport.milestones[1].payment.state, "paid late");
  assert.equal(b.passport.milestones[1].payment.delay_days, 6);
  assert.deepEqual(b.ledger.map((l) => l.status), ["paid on time", "paid late"]);

  await runAction(u.validator, id, "attest", { achieved: "55", method: "m" });
  await assert.rejects(runAction(u.department, id, "approve_route", {}), (e) => e.status === 409);
  await runAction(u.finance, id, "compile_route", { same_department: "yes", scale_up: "no" });
  b = await getBundle(id);
  assert.equal(b.record.passport_state, "Procurement-ready");
  assert.match(b.passport.procurement.accepted.route, /Tier 3/);
  assert.match(b.passport.procurement.rejected[0].counterfactual, /Government Resolution/);
  assert.match(b.passport.procurement.accepted.next, /2 of 3/);
  await assert.rejects(runAction(u.finance, id, "compile_route", { same_department: "yes", scale_up: "no" }), (e) => e.status === 409);
  await runAction(u.department, id, "approve_route", { note: "Order via GeM" });
  b = await getBundle(id);
  assert.equal(b.passport.procurement.approved_by, u.department.name);
  await assert.rejects(runAction(u.department, id, "approve_route", {}), (e) => /already approved/.test(e.message));

  // The public ledger aggregates it, by department, with no startup names.
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.body = o; } };
  await ledger({ method: "GET", headers: {} }, res);
  const d = res.body.departments.find((x) => x.department === CHALLENGE.department);
  assert.equal(res.code, 200);
  assert.deepEqual({ paid: d.paid, on_time: d.paid_on_time, late: d.paid_late, inr: d.paid_inr }, { paid: 2, on_time: 1, late: 1, inr: 300000 });
  assert.ok(!JSON.stringify(res.body).includes("Good OPD"), "no startup names in the public ledger");
});

test("a missed result compiles to a learning record, not a purchase", { skip }, async () => {
  const id = await sealed();
  await runAction(u.admin, id, "screen", ENVELOPE);
  await runAction(u.admin, id, "award", { startup_user_id: u.good.id, scope: "s", data_access: "d",
    milestones: [{ title: "a", evidence_expected: "e", due: "2026-12-01", amount_inr: 1 }] });
  await runAction(u.good, id, "upload_evidence", { milestone: 1, title: "x", filename: "x.txt", mime: "text/plain", data: Buffer.from("x").toString("base64") });
  await runAction(u.department, id, "review_milestone", { milestone: 1, decision: "accept" });
  await runAction(u.validator, id, "attest", { achieved: "80", method: "m" });
  await runAction(u.finance, id, "compile_route", { same_department: "yes", scale_up: "yes" });
  const b = await getBundle(id);
  assert.equal(b.record.passport_state, "Learning record");
  assert.equal(b.passport.procurement.learning_record, true);
  assert.equal(b.audit.at(-1).action, "Compiled the procurement route: no lawful route (learning record)");
});
