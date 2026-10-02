// The API the redesigned UI leans on: what a pilot waits on and from whom, list rows that
// carry a work queue, the activity feed, and 422s that name their field.
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
const { createChallenge, runAction } = await import("../api/_actions.js");
const { default: passports } = await import("../api/passports.js");

const run = Date.now().toString(36) + "ui";
const u = {};
const call = async (user, query = {}, body) => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.body = o; } };
  await passports({ method: body ? "POST" : "GET", headers: { cookie: `sid=${auth.sessionToken(user.id)}`, ...(body && { "content-type": "application/json" }) },
    query, body }, res);
  return res;
};
const field = (status, f) => (e) => e.status === status && e.extra?.field === f;

before(async () => {
  if (!url) return;
  const mk = (role, extra = {}) => auth.createUser({ email: `${role}-${run}@test.invalid`, name: `${role} ${run}`, role, password: "x".repeat(12), ...extra });
  for (const r of ["department", "admin", "finance", "validator", "evaluator"]) u[r] = await mk(r);
  u.startup = await mk("startup", { org: `Startup ${run}` });
  u.demo = await auth.demoUser("admin", "Demo admin");
  await db().query("insert into startup_profiles (user_id, dpiit_recognised, capabilities, sectors) values ($1, true, 'OPD wait', '{Health}')", [u.startup.id]);
});
after(async () => { if (url) await db().end(); });

const CH = { department: `UI Dept ${run}`, district: "Nagpur", sector: "Health", outcome_statement: "Cut OPD wait", kpi_name: "Median wait",
  kpi_unit: "min", kpi_definition: "registration to clinician", baseline_value: "94", baseline_source: "HMIS", baseline_method: "All visits",
  comparison_unit: "Second OPD", target_value: "60", target_direction: "decrease", duration_days: "90" };

test("422s name the input they are about", { skip }, async () => {
  await assert.rejects(createChallenge(u.department, { ...CH, baseline_source: "" }), field(422, "baseline_source"));
  await assert.rejects(createChallenge(u.department, { ...CH, target_value: "120" }), field(422, "target_value"));
  const { record_id: id } = await createChallenge(u.department, CH);
  await assert.rejects(runAction(u.admin, id, "verify_baseline", { result: "ok" }), field(422, "quality_ack"));
  await runAction(u.admin, id, "verify_baseline", { result: "ok", quality_ack: true });
  await runAction(u.department, id, "seal", {});
  await assert.rejects(runAction(u.admin, id, "screen", { users: "u", systems: "s", data_class: "pseudonymised", reversibility: "r", cap_inr: "1", start_date: "2026-02-30" }),
    field(422, "start_date"));
  await assert.rejects(runAction(u.admin, id, "screen", { users: "u", systems: "s", data_class: "pseudonymised", reversibility: "r", cap_inr: "x", start_date: "2026-11-01" }),
    field(422, "cap_inr"));
  await runAction(u.admin, id, "screen", { users: "u", systems: "s", data_class: "pseudonymised", reversibility: "r", cap_inr: "1", start_date: "2026-11-01" });
  await assert.rejects(runAction(u.admin, id, "award", { startup_user_id: u.startup.id, scope: "s", data_access: "d",
    milestones: [{ title: "a", evidence_expected: "e", due: "2026-12-01", amount_inr: "1" }, { title: "", evidence_expected: "e", due: "2026-12-01", amount_inr: "1" }] }),
    field(422, "milestones.1.title"));
  // Over HTTP the field reaches the client.
  const res = await call(u.admin, {}, { id, action: "award", startup_user_id: u.startup.id, scope: "", data_access: "d", milestones: [] });
  assert.equal(res.code, 422);
  assert.equal(res.body.field, "milestones");
});

test("a pilot says what it waits on, from whom", { skip }, async () => {
  const { record_id: id } = await createChallenge(u.department, CH);
  const pending = async (who = u.department) => (await call(who, { id })).body.pending.map((p) => `${p.role}:${p.action}`);
  assert.deepEqual(await pending(), ["admin:verify_baseline"]);
  await runAction(u.admin, id, "verify_baseline", { result: "ok", quality_ack: true });
  assert.deepEqual(await pending(), ["department:seal"]);
  await runAction(u.department, id, "seal", {});
  assert.deepEqual(await pending(), ["admin:screen"]);
  await runAction(u.admin, id, "screen", { users: "u", systems: "s", data_class: "pseudonymised", reversibility: "r", cap_inr: "1", start_date: "2026-11-01" });
  assert.deepEqual(await pending(), ["admin:screen", "admin:award", "evaluator:score"]);
  await runAction(u.admin, id, "award", { startup_user_id: u.startup.id, scope: "s", data_access: "d",
    milestones: [{ title: "a", evidence_expected: "e", due: "2026-12-01", amount_inr: "100000" }] });
  const b = (await call(u.finance, { id })).body;
  assert.deepEqual(b.pending.map((p) => `${p.role}:${p.action}:${p.milestones}`), ["startup:upload_evidence:1"]);
  assert.equal(b.pending[0].role_label, "Startup");
  assert.deepEqual(b.actions, [], "finance has nothing to do yet");
});

test("list rows carry the work queue, waiting-on and payment status", { skip }, async () => {
  const { record_id: id } = await createChallenge(u.department, CH);
  await runAction(u.admin, id, "verify_baseline", { result: "ok", quality_ack: true });
  await runAction(u.department, id, "seal", {});
  await runAction(u.admin, id, "screen", { users: "u", systems: "s", data_class: "pseudonymised", reversibility: "r", cap_inr: "1", start_date: "2026-11-01" });
  await runAction(u.admin, id, "award", { startup_user_id: u.startup.id, scope: "s", data_access: "d",
    milestones: [{ title: "a", evidence_expected: "e", due: "2026-12-01", amount_inr: "100000" }] });
  await runAction(u.startup, id, "upload_evidence", { milestone: 1, title: "x", filename: "x.txt", mime: "text/plain", data: Buffer.from("x").toString("base64") });
  await runAction(u.department, id, "review_milestone", { milestone: 1, decision: "accept" });
  // Make the payment overdue: packet completed 40 days ago.
  const ago = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  await db().query(`update records set passport = jsonb_set(jsonb_set(passport, '{milestones,0,payment,packet_complete_on}', to_jsonb($2::text)),
    '{milestones,0,payment,expected_by}', to_jsonb($3::text)) where id = $1`, [id, ago(40), ago(10)]);

  const rowFor = async (who) => (await call(who)).body.passports.find((p) => p.id === id);
  const fin = await rowFor(u.finance);
  assert.deepEqual(fin.my_actions.map((a) => `${a.action}:${a.milestones}`), ["record_payment:1"]);
  assert.equal(fin.overdue, 1);
  assert.equal(fin.step, 5);
  assert.equal(fin.passport_state, "Evidence submitted");
  assert.deepEqual(fin.waiting_on, ["Independent Validator", "Finance / Procurement Officer"]);
  assert.equal(fin.startup, `Startup ${run}`);
  assert.equal(Number(fin.baseline_value), 94);
  assert.equal((await rowFor(u.department)).my_actions.length, 0);
  assert.ok(!("passport" in fin), "rows don't ship the whole passport");
});

test("the feed shows recent actions; demo accounts only see samples", { skip }, async () => {
  const mine = (await call(u.department, { feed: "1" })).body.events;
  assert.ok(mine.length > 0 && mine.length <= 30);
  assert.ok(mine.every((e, i) => !i || e.at <= mine[i - 1].at), "newest first");
  assert.ok(mine.some((e) => e.kpi_name === "Median wait"));
  const demo = (await call(u.demo, { feed: "1" })).body.events;
  assert.ok(demo.every((e) => !String(e.kpi_name).includes(run)), "no real pilots in a demo account's feed");
  const demoList = (await call(u.demo)).body.passports;
  assert.ok(demoList.every((p) => p.sample), "demo accounts list sample pilots only");
});
