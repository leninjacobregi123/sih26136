// Real pilots end to end (phase 2): accounts and sessions, every action and its refusals,
// evidence files, and the HTTP layer (cookies, JSON-only POSTs, downloads, live events).
//   TEST_DATABASE_URL=postgresql://... npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { istDate } from "../api/_clock.js"; // dates are IST, as the server's are
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";

const url = process.env.TEST_DATABASE_URL;
if (url) {
  process.env.DATABASE_URL = url;
  delete process.env.DATABASE_PASSWORD;
}
process.env.SESSION_SECRET ||= randomBytes(32).toString("base64url");
process.env.LLM_API_KEY = ""; // the quality gate's model is never called from tests
const skip = !url && "set TEST_DATABASE_URL to run";

const { db } = await import("../api/_lib.js");
const auth = await import("../api/_auth.js");
const { createChallenge, runAction, availableActions } = await import("../api/_actions.js");
const { getBundle, loadDemo, scenario } = await import("../api/_passport.js");

const run = Date.now().toString(36);
const u = {};
const PASSWORD = "correct horse battery staple";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const b64 = (s) => Buffer.from(s).toString("base64");

before(async () => {
  if (!url) return;
  for (const role of ["department", "admin", "startup", "validator", "finance", "public"]) {
    u[role] = await auth.createUser({ email: `${role}-${run}@test.invalid`, name: `Test ${role}`, role, org: role === "startup" ? "QueueSense Systems" : null, password: PASSWORD });
  }
  u.startup2 = await auth.createUser({ email: `startup2-${run}@test.invalid`, name: "Other startup", role: "startup", password: PASSWORD });
  u.demoDept = await auth.demoUser("department", "Demo officer");
  await addProfile(u.startup, { dpiit_recognised: true, capabilities: "Token-free OPD flow from registration timestamps; median wait" });
  await addProfile(u.startup2, { capabilities: "Hospital rosters", needs_write_access: true });
});
after(async () => { if (url) await db().end(); });

const CHALLENGE = {
  department: "Public Health", district: "Nagpur", outcome_statement: "Cut OPD wait", kpi_name: "Median wait",
  kpi_unit: "min", baseline_value: "94", baseline_source: "HMIS export", baseline_method: "All visits Oct–Dec",
  target_value: "60", target_direction: "decrease", duration_days: "90",
};
async function addProfile(user, p) {
  await db().query(
    `insert into startup_profiles (user_id, dpiit_recognised, capabilities, needs_write_access, data_needed, sectors, gem_ratings)
     values ($1, $2, $3, $4, $5, $6, $7) on conflict (user_id) do nothing`,
    [user.id, !!p.dpiit_recognised, p.capabilities, !!p.needs_write_access, p.data_needed ?? "pseudonymised", p.sectors ?? ["Health"], p.gem_ratings ?? 0]);
}
const ENVELOPE = { users: "One OPD", systems: "Timestamps", allow_write: "no", data_class: "pseudonymised",
  reversibility: "Removed in a day", cap_inr: "1500000", start_date: "2026-11-01" };
const TODAY = istDate(new Date());
const newPilot = async () => (await createChallenge(u.department, CHALLENGE)).record_id;
const state = async (id) => (await getBundle(id)).record.passport_state;
const refused = (status, re) => (e) => e.status === status && (!re || re.test(e.message));

async function toPilotActive(id) {
  await runAction(u.admin, id, "verify_baseline", { result: "Reproduced 94 from the export", quality_ack: true });
  await runAction(u.department, id, "seal", {});
  await runAction(u.admin, id, "screen", ENVELOPE);
  await runAction(u.admin, id, "award", {
    startup_user_id: u.startup.id, scope: "One OPD", data_access: "Timestamps only",
    milestones: [
      { title: "Sandbox", evidence_expected: "Baseline study", due: "2026-11-01", amount_inr: "300000" },
      { title: "Read-only proof", evidence_expected: "Access logs", due: "2026-12-01", amount_inr: 375000 },
    ],
  });
}

test("passwords and session tokens", async () => {
  const h = await auth.hashPassword("pw");
  assert.equal(await auth.verifyPassword("pw", h), true);
  assert.equal(await auth.verifyPassword("pW", h), false);
  assert.equal(await auth.verifyPassword("pw", "garbage"), false);
  const t = auth.sessionToken("u1");
  assert.equal(auth.readToken(t), "u1");
  const [p, mac] = t.split(".");
  const forged = Buffer.from(JSON.stringify({ uid: "admin", exp: 9e9 })).toString("base64url");
  assert.equal(auth.readToken(`${forged}.${mac}`), null);
  assert.equal(auth.readToken(`${p}.x${mac.slice(1)}`), null);
  assert.equal(auth.readToken(t, Date.now() + 9 * 3600 * 1000), null, "expired after 8 h");
});

test("login: right password only, never demo or deactivated accounts", { skip }, async () => {
  assert.equal((await auth.login(`DEPARTMENT-${run}@test.invalid`, PASSWORD)).id, u.department.id);
  await assert.rejects(auth.login(u.department.email, "nope"), refused(401));
  await assert.rejects(auth.login("nobody@test.invalid", PASSWORD), refused(401));
  await assert.rejects(auth.login(u.demoDept.email, ""), refused(401));
  const gone = await auth.createUser({ email: `gone-${run}@test.invalid`, name: "Gone", role: "admin", password: PASSWORD });
  await db().query("update users set active = false where id = $1", [gone.id]);
  await assert.rejects(auth.login(gone.email, PASSWORD), refused(401));
});

test("only a real Department Officer creates a challenge, with a sensible target", { skip }, async () => {
  await assert.rejects(createChallenge(u.admin, CHALLENGE), refused(403));
  await assert.rejects(createChallenge(u.demoDept, CHALLENGE), refused(403));
  await assert.rejects(createChallenge(u.department, { ...CHALLENGE, baseline_source: "" }), refused(422, /baseline_source/));
  await assert.rejects(createChallenge(u.department, { ...CHALLENGE, target_value: "120" }), refused(422, /below the baseline/));
  const id = await newPilot();
  const b = await getBundle(id);
  assert.equal(b.record.passport_state, "Draft");
  assert.deepEqual(b.passport.criteria, [{ kpi: "Median wait", unit: "min", baseline: 94, target: "≤ 60" }]);
  assert.equal(b.audit[0].action, "Created the challenge");
});

test("a real pilot runs from Draft to Independently validated", { skip }, async () => {
  const id = await newPilot();
  assert.deepEqual((await availableActions(u.admin, await getBundle(id))).map((a) => a.name), ["verify_baseline"]);
  assert.deepEqual(await availableActions(u.department, await getBundle(id)), []);

  await assert.rejects(runAction(u.department, id, "seal", {}), refused(409, /Draft/));
  await assert.rejects(runAction(u.department, id, "verify_baseline", { result: "x" }), refused(403));
  await assert.rejects(runAction(u.admin, id, "verify_baseline", {}), refused(422, /result/));
  await assert.rejects(runAction(u.admin, id, "verify_baseline", { result: "ok" }), refused(422, /quality report/));
  await toPilotActive(id);
  let b = await getBundle(id);
  assert.equal(b.record.passport_state, "Pilot active");
  assert.equal(b.challenge.lock_hash, b.passport.seal.sha256);
  assert.equal(b.passport.design.fee_inr, 675000);
  assert.equal(b.record.startup_user_id, u.startup.id);

  // Only the awarded startup submits, and only real files of allowed types and size.
  const file = { milestone: 1, title: "Baseline study", filename: "../../etc/study.pdf", mime: "application/pdf", data: b64("%PDF-1.4 study") };
  await assert.rejects(runAction(u.startup2, id, "upload_evidence", file), refused(403, /not awarded/));
  await assert.rejects(runAction(u.startup, id, "upload_evidence", { ...file, mime: "text/html" }), refused(422));
  await assert.rejects(runAction(u.startup, id, "upload_evidence", { ...file, data: "not base64!" }), refused(422));
  await assert.rejects(runAction(u.startup, id, "upload_evidence", { ...file, data: Buffer.alloc(3 * 1024 * 1024 + 1).toString("base64") }), refused(422, /3 MB/));
  await runAction(u.startup, id, "upload_evidence", file);
  await runAction(u.startup, id, "upload_evidence", { ...file, milestone: 2, title: "Logs", filename: "logs.csv", mime: "text/csv", data: b64("role,writes\nqs,0\n") });

  b = await getBundle(id);
  assert.equal(b.files.length, 2);
  assert.equal(b.files[0].filename, "study.pdf", "path stripped from the filename");
  assert.equal(b.files[0].sha256, sha("%PDF-1.4 study"));
  assert.equal(b.passport.evidence[0].file_id, b.files[0].id);
  await assert.rejects(db().query("update evidence_files set data = 'x' where id = $1", [b.files[0].id]), /cannot be changed/);
  await assert.rejects(db().query("delete from evidence_files where id = $1", [b.files[0].id]), /cannot be changed/);

  // Return, resubmit, accept; the last acceptance closes the evidence phase.
  await assert.rejects(runAction(u.department, id, "review_milestone", { milestone: 2, decision: "return" }), refused(422, /note/));
  await runAction(u.department, id, "review_milestone", { milestone: 2, decision: "return", note: "Need the full 20 days" });
  await runAction(u.startup, id, "upload_evidence", { ...file, milestone: 2, title: "Logs, 20 days", mime: "text/csv", data: b64("full") });
  await runAction(u.department, id, "review_milestone", { milestone: 1, decision: "accept" });
  assert.equal(await state(id), "Pilot active");
  await assert.rejects(runAction(u.finance, id, "record_payment", { milestone: 2, outcome: "paid", paid_on: "2026-11-01" }), refused(409, /evidence submitted/));
  await runAction(u.department, id, "review_milestone", { milestone: 2, decision: "accept" });
  assert.equal(await state(id), "Evidence submitted");

  // Payments: a delay keeps its reason, and paying it afterwards reads "paid late".
  await assert.rejects(runAction(u.finance, id, "record_payment", { milestone: 1, outcome: "delayed" }), refused(422, /reason/));
  await runAction(u.finance, id, "record_payment", { milestone: 1, outcome: "delayed", delay_reason: "Treasury re-appropriation" });
  await assert.rejects(runAction(u.finance, id, "record_payment", { milestone: 1, outcome: "paid", paid_on: "2026-02-30" }), refused(422, /date/));
  await assert.rejects(runAction(u.finance, id, "record_payment", { milestone: 1, outcome: "paid", paid_on: "2099-01-01" }), refused(422, /future/));
  await runAction(u.finance, id, "record_payment", { milestone: 1, outcome: "paid", paid_on: TODAY });
  await assert.rejects(runAction(u.finance, id, "record_payment", { milestone: 1, outcome: "paid", paid_on: TODAY }), refused(409, /already paid late/));

  await runAction(u.validator, id, "attest", { achieved: "55", method: "DiD vs comparison OPD" });
  b = await getBundle(id);
  assert.equal(b.record.passport_state, "Independently validated");
  assert.equal(b.passport.validation.result, "Met the sealed criteria");
  assert.equal(b.passport.milestones[0].payment.state, "paid late");
  assert.equal(b.passport.milestones[0].payment.delay_reason, "Treasury re-appropriation");
  assert.equal(b.record.result_direction, "IMPROVED");
  assert.equal(Number(b.record.delta), -39);
  assert.equal(b.signatures.length, 1);
  assert.equal(b.chain.intact, true);
  assert.equal(b.audit.length, 14);
  // Payment can still be recorded after validation.
  await runAction(u.finance, id, "record_payment", { milestone: 2, outcome: "paid", paid_on: TODAY });
});

test("a target changed after sealing stops the validator, on the record", { skip }, async () => {
  const id = await newPilot();
  await toPilotActive(id);
  await runAction(u.startup, id, "upload_evidence", { milestone: 1, title: "a", filename: "a.txt", mime: "text/plain", data: b64("a") });
  await runAction(u.startup, id, "upload_evidence", { milestone: 2, title: "b", filename: "b.txt", mime: "text/plain", data: b64("b") });
  await runAction(u.department, id, "review_milestone", { milestone: 1, decision: "accept" });
  await runAction(u.department, id, "review_milestone", { milestone: 2, decision: "accept" });
  await db().query("update challenges set target_value = 90 where id = (select challenge_id from records where id = $1)", [id]);
  const out = await runAction(u.validator, id, "attest", { achieved: "85", method: "m" });
  assert.match(out.refused, /changed after publication/);
  const b = await getBundle(id);
  assert.equal(b.record.passport_state, "Evidence submitted");
  assert.equal(b.seal.intact, false);
  assert.equal(b.audit.at(-1).action, "Refused to validate: seal mismatch");
});

test("demo and real stay apart", { skip }, async () => {
  const id = await newPilot();
  const demoAdmin = await auth.demoUser("admin", "Demo admin");
  await assert.rejects(runAction(demoAdmin, id, "verify_baseline", { result: "x" }), refused(403, /demo/));
  await loadDemo();
  const { rows: [d] } = await db().query(
    "select r.id from records r join challenges c on c.id = r.challenge_id where c.pr_id = $1 and c.is_simulated", [scenario.id]);
  await assert.rejects(runAction(u.admin, d.id, "verify_baseline", { result: "x" }), refused(403, /demo/));
  await assert.rejects(runAction(u.admin, "not-a-uuid", "verify_baseline", {}), refused(404));
  await assert.rejects(runAction(u.admin, id, "nonsense", {}), refused(400));
});

// ---- HTTP, through the dev server ------------------------------------------------

test("HTTP: sessions, JSON-only POSTs, downloads and live events", { skip }, async (t) => {
  const port = 3900 + Math.floor(Math.random() * 90);
  const server = spawn(process.execPath, ["scripts/dev.mjs"], {
    env: { ...process.env, PORT: String(port), LLM_API_KEY: "" }, stdio: ["ignore", "pipe", "inherit"] });
  t.after(() => server.kill());
  await new Promise((ok) => server.stdout.once("data", ok));
  const base = `http://localhost:${port}`;
  const call = (path, { cookie, body, type = "application/json", method = body ? "POST" : "GET" } = {}) =>
    fetch(base + path, { method, headers: { ...(cookie && { cookie }), ...(body && { "content-type": type }) },
      body: body && (typeof body === "string" ? body : JSON.stringify(body)) });

  assert.equal((await call("/api/passports")).status, 401);
  assert.equal((await call("/api/auth", { body: "action=login", type: "application/x-www-form-urlencoded" })).status, 415);
  assert.equal((await call("/api/auth", { body: { action: "login", email: u.finance.email, password: "x" } })).status, 401);

  const signIn = async (who) => {
    const res = await call("/api/auth", { body: { action: "login", email: who.email, password: PASSWORD } });
    assert.equal(res.status, 200);
    const set = res.headers.get("set-cookie");
    assert.match(set, /HttpOnly/);
    assert.match(set, /SameSite=Lax/);
    return set.split(";")[0];
  };
  const dept = await signIn(u.department);
  const created = await (await call("/api/challenges", { cookie: dept, body: CHALLENGE })).json();
  const id = created.record_id;
  assert.ok(id);
  const list = await (await call("/api/passports", { cookie: dept })).json();
  assert.ok(list.passports.some((p) => p.id === id));
  const tampered = dept.slice(0, -2) + (dept.endsWith("A") ? "BB" : "AA");
  assert.equal((await call("/api/passports", { cookie: tampered })).status, 401);

  // Live: an event stream sees an action taken by someone else.
  const admin = await signIn(u.admin);
  const stream = await call(`/api/events?record=${id}`, { cookie: dept });
  assert.match(stream.headers.get("content-type"), /text\/event-stream/);
  const reader = stream.body.getReader();
  const res = await call("/api/passports", { cookie: admin, body: { id, action: "verify_baseline", result: "ok", quality_ack: true } });
  assert.equal(res.status, 200);
  let seen = "";
  while (!seen.includes("Verified the baseline")) {
    const { value, done } = await reader.read();
    if (done) break;
    seen += Buffer.from(value).toString();
  }
  reader.cancel();
  assert.match(seen, /data: .*Verified the baseline/);
  assert.equal((await call(`/api/events?record=${id}`)).status, 401, "real passports need a session");

  // Evidence downloads: attachment + nosniff, never for the public role.
  await runAction(u.department, id, "seal", {});
  await runAction(u.admin, id, "screen", ENVELOPE);
  await runAction(u.admin, id, "award", { startup_user_id: u.startup.id, scope: "s", data_access: "d",
    milestones: [{ title: "t", evidence_expected: "e", due: "2026-11-01", amount_inr: 1 }] });
  await runAction(u.startup, id, "upload_evidence", { milestone: 1, title: "x", filename: "x.txt", mime: "text/plain", data: b64("<script>alert(1)</script>") });
  const { files: [f] } = await getBundle(id);
  const dl = await call(`/api/evidence?id=${f.id}`, { cookie: dept });
  assert.equal(dl.status, 200);
  assert.equal(dl.headers.get("x-content-type-options"), "nosniff");
  assert.match(dl.headers.get("content-disposition"), /^attachment/);
  assert.equal(sha(Buffer.from(await dl.arrayBuffer())), f.sha256);
  assert.equal((await call(`/api/evidence?id=${f.id}`, { cookie: await signIn(u.public) })).status, 403);
  assert.equal((await call(`/api/evidence?id=${f.id}`)).status, 401);

  // Demo sign-in works without a password, and only drives the demo.
  const demo = (await call("/api/auth", { body: { action: "demo", role: "admin" } })).headers.get("set-cookie").split(";")[0];
  assert.equal((await call("/api/demo", { cookie: demo, body: { action: "load" } })).status, 200);
  assert.equal((await call("/api/passports", { cookie: demo, body: { id, action: "verify_baseline", result: "x" } })).status, 403);
});
