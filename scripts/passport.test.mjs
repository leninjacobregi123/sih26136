// The demo passport, end to end, against a real Postgres.
//   TEST_DATABASE_URL=postgresql://... npm test
// Needs db/schema.sql applied there (npm run db:init with DATABASE_URL pointed at it).
// Only touches the simulated demo rows, but point it at a scratch database anyway.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const url = process.env.TEST_DATABASE_URL;
if (url) {
  process.env.DATABASE_URL = url;
  delete process.env.DATABASE_PASSWORD;
}
const skip = !url && "set TEST_DATABASE_URL to run";
const { db } = await import("../api/_lib.js");
const { scenario, loadDemo, resetDemo, advanceDemo, getDemo, StepRefused } = await import("../api/_passport.js");

before(async () => { if (url) await resetDemo(); });
after(async () => { if (url) { await resetDemo(); await db().end(); } });

const walk = async (upTo = scenario.steps.length) => {
  for (const step of scenario.steps.slice(0, upTo)) await advanceDemo(step.role);
};

test("load seeds the scenario at Draft with one audit event", { skip }, async () => {
  await loadDemo();
  const d = await getDemo();
  assert.equal(d.loaded, true);
  assert.equal(d.record.passport_state, "Draft");
  assert.equal(d.audit.length, 1);
  assert.deepEqual(d.chain, { intact: true, events: 1 });
  assert.equal(d.next.role, "admin");
});

test("the wrong role is refused and nothing changes", { skip }, async () => {
  await loadDemo();
  await assert.rejects(advanceDemo("startup"), (e) => e instanceof StepRefused && e.status === 403 && e.extra.required_role === "admin");
  const d = await getDemo();
  assert.equal(d.record.demo_step, 0);
  assert.equal(d.audit.length, 1);
});

test("walking every step reaches Replication-ready with seal and chain intact", { skip }, async () => {
  await loadDemo();
  await walk();
  const d = await getDemo();
  assert.equal(d.record.passport_state, "Replication-ready");
  assert.equal(d.next, null);
  assert.equal(d.seal.intact, true);
  assert.equal(d.challenge.lock_hash, d.passport.seal.sha256);
  assert.deepEqual(d.chain, { intact: true, events: scenario.steps.length + 1 });
  assert.equal(d.passport.evidence.length, 5);
  assert.ok(d.passport.evidence.every((e) => /^[0-9a-f]{64}$/.test(e.sha256)));
  assert.equal(d.passport.milestones[1].payment.state, "paid late");
  assert.equal(d.readings.length, 13);
  assert.equal(d.signatures.length, 1);
  assert.equal(Number(d.record.adoption_pct), 83);
  await assert.rejects(advanceDemo("admin"), (e) => e.status === 409);
});

test("changing the criteria after the seal stops the validator", { skip }, async () => {
  await loadDemo();
  const validate = scenario.steps.findIndex((s) => s.op === "verify_seal");
  await walk(validate);
  await db().query("update challenges set baseline_value = 80 where pr_id = $1 and is_simulated", [scenario.id]);
  const out = await advanceDemo("validator");
  assert.match(out.refused, /changed after publication/);
  const d = await getDemo();
  assert.equal(d.seal.intact, false);
  assert.equal(d.record.passport_state, "Evidence submitted");
  assert.equal(d.audit.at(-1).action, "Refused to validate: seal mismatch");
  assert.equal(d.chain.intact, true);
});

test("the audit log refuses edits, and a forged row breaks the chain", { skip }, async () => {
  await loadDemo();
  await walk(3);
  await assert.rejects(db().query("update audit_events set action = 'x'"), /append-only/);
  const { rows: [r] } = await db().query("select record_id, hash from audit_events order by id desc limit 1");
  // Even an insert that skips the app can't fake a valid link.
  await db().query(
    `insert into audit_events (record_id, at, actor_role, actor_name, action, is_simulated, prev_hash, hash)
     values ($1, now(), 'x', 'x', 'forged', true, $2, 'f00')`, [r.record_id, r.hash]);
  const d = await getDemo();
  assert.deepEqual(d.chain, { intact: false, events: 5, broken_at: 4 });
});

test("non-simulated audit events cannot be deleted", { skip }, async () => {
  await loadDemo();
  const { rows: [r] } = await db().query("select record_id from audit_events limit 1");
  await db().query(
    `insert into audit_events (record_id, at, actor_role, actor_name, action, is_simulated, hash)
     values ($1, now(), 'x', 'x', 'real', false, 'h')`, [r.record_id]);
  await assert.rejects(db().query("delete from audit_events where not is_simulated"), /append-only/);
  // The trigger has no bypass; a real event pins its record, so the demo can't be reset either.
  await assert.rejects(resetDemo(), /append-only/);
  // Clean up as the table owner would, by lifting the trigger for this one statement.
  await db().query("alter table audit_events disable trigger audit_events_append_only");
  await db().query("delete from audit_events where not is_simulated");
  await db().query("alter table audit_events enable trigger audit_events_append_only");
});

test("reset removes every simulated row", { skip }, async () => {
  await loadDemo();
  await walk();
  await resetDemo();
  assert.equal((await getDemo()).loaded, false);
  const { rows: [n] } = await db().query(
    `select (select count(*) from challenges where pr_id = $1)::int as challenges,
            (select count(*) from audit_events)::int as events`, [scenario.id]);
  assert.deepEqual(n, { challenges: 0, events: 0 });
});
