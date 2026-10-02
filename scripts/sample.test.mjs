// The seeded sample programme: built through the real actions, readable by demo accounts,
// changeable by nobody, removable, and never a way to delete real records.
//   TEST_DATABASE_URL=postgresql://... npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
const { runAction, createChallenge } = await import("../api/_actions.js");
const { getBundle } = await import("../api/_passport.js");
const { default: passports } = await import("../api/passports.js");
const { default: programme } = await import("../api/programme.js");

const seed = (...a) => execFileSync(process.execPath, ["scripts/seed-programme.mjs", "--no-model", ...a],
  { env: { ...process.env, DATABASE_URL: url }, encoding: "utf8" });
const call = async (handler, req) => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.body = o; } };
  await handler({ headers: {}, query: {}, ...req }, res);
  return res;
};
const cookie = (u) => `sid=${auth.sessionToken(u.id)}`;
const samples = async () => (await db().query(
  `select r.id, c.pr_id, r.passport_state from records r join challenges c on c.id = r.challenge_id
    where r.is_synthetic and c.pr_id like 'SAMPLE-%' order by c.pr_id`)).rows;

let real, admin, demoAdmin;
before(async () => {
  if (!url) return;
  const run = Date.now().toString(36) + "s";
  const dept = await auth.createUser({ email: `d-${run}@test.invalid`, name: "Real officer", role: "department", password: "x".repeat(12) });
  admin = await auth.createUser({ email: `a-${run}@test.invalid`, name: "Real admin", role: "admin", password: "x".repeat(12) });
  demoAdmin = await auth.demoUser("admin", "Demo admin");
  real = (await createChallenge(dept, { department: `Real ${run}`, outcome_statement: "Cut wait", kpi_name: "Wait", kpi_unit: "min",
    baseline_value: "90", baseline_source: "s", baseline_method: "m", target_value: "60", target_direction: "decrease" })).record_id;
  seed("--replace");
});
after(async () => { if (url) { seed("--remove"); await db().end(); } });

test("the seed builds eleven pilots, one at every stage, all genuine", { skip }, async () => {
  const rows = await samples();
  assert.equal(rows.length, 11);
  assert.deepEqual(new Set(rows.map((r) => r.passport_state)), new Set(["Replication-ready", "Adoption measured", "Deployed",
    "Procurement-ready", "Independently validated", "Learning record", "Evidence submitted", "Pilot active", "Criteria sealed", "Draft"]));
  const today = new Date().toISOString();
  for (const r of rows) {
    const b = await getBundle(r.id);
    assert.equal(b.sample, true);
    assert.equal(b.chain.intact, true, r.pr_id);
    if (b.seal) assert.equal(b.seal.intact, true, r.pr_id);
    const at = b.audit.map((e) => new Date(e.at).toISOString());
    assert.ok(at.every((a, i) => !i || a >= at[i - 1]) && at.every((a) => a < today), `${r.pr_id} reads in time order, all in the past`);
  }
  const gad = await getBundle(rows.find((r) => r.passport_state === "Pilot active").id);
  assert.equal(gad.ledger.find((l) => l.status === "overdue").reason, "Awaiting the state share of ICDS funds");
  assert.equal((await db().query("select count(*)::int as n from users where email like '%@sample.invalid' and password_hash is not null")).rows[0].n, 0,
    "nobody can sign in as a sample account");
});

test("demo accounts read sample pilots only; nobody changes them", { skip }, async () => {
  const [s] = await samples();
  assert.equal((await call(passports, { method: "GET", headers: { cookie: cookie(demoAdmin) }, query: { id: s.id } })).code, 200);
  assert.equal((await call(passports, { method: "GET", headers: { cookie: cookie(demoAdmin) }, query: { id: real } })).code, 404);
  const list = await call(passports, { method: "GET", headers: { cookie: cookie(demoAdmin) } });
  assert.ok(list.body.passports.length === 11 && list.body.passports.every((p) => p.sample));
  const realList = await call(passports, { method: "GET", headers: { cookie: cookie(admin) } });
  assert.ok(realList.body.passports.some((p) => p.id === real) && realList.body.passports.some((p) => p.sample));
  const draft = (await samples()).find((r) => r.passport_state === "Draft");
  await assert.rejects(runAction(admin, draft.id, "verify_baseline", { result: "x", quality_ack: true }), (e) => e.status === 403 && /read-only/.test(e.message));
  const b = await getBundle(draft.id);
  assert.deepEqual(b.passport.quality.defects.map((d) => d.code).sort(), ["KPI_NOT_MEASURABLE", "OUTCOME_NOT_ATTRIBUTABLE", "SOLUTION_PRESUPPOSED"]);
});

test("the public pages count the samples and say so", { skip }, async () => {
  const res = await call(programme, { method: "GET" });
  assert.equal(res.body.sample_pilots, 11);
  assert.equal(res.body.dashboard.results.filter((r) => r.sample).length, 7, "the seven that reached a validated result");
});

test("real records stay undeletable; removal touches sample data only", { skip }, async () => {
  await assert.rejects(db().query("delete from audit_events where record_id = $1", [real]), /append-only/);
  // Marking a real record synthetic is not enough: the exception also needs a SAMPLE- id.
  await db().query("update records set is_synthetic = true where id = $1", [real]);
  await assert.rejects(db().query("delete from audit_events where record_id = $1", [real]), /append-only/);
  await db().query("update records set is_synthetic = false where id = $1", [real]);
  seed("--remove");
  assert.equal((await samples()).length, 0);
  assert.equal((await getBundle(real)).chain.events, 1, "the real pilot is untouched");
  seed(); // and back, for the next test run's after()
});
