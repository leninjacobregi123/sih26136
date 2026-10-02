// The UI, driven through headless Chrome against the dev server and a scratch database:
// every page renders cleanly (no console errors, no CSP violations, no serious axe findings,
// no sideways scroll) in light and dark, wide and phone-sized; a real pilot goes from the
// wizard to Replication-ready through the forms, role by role; the guided demo plays through;
// keyboard and inline errors behave.
//   TEST_DATABASE_URL=postgresql://... npm run test:ui     (needs Google Chrome)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launch } from "./ui/cdp.mjs";

const url = process.env.TEST_DATABASE_URL;
const skip = !url && "set TEST_DATABASE_URL to run";
if (url) { process.env.DATABASE_URL = url; delete process.env.DATABASE_PASSWORD; }
process.env.SESSION_SECRET ||= randomBytes(32).toString("base64url");
process.env.LLM_API_KEY = "";

const { db } = await import("../api/_lib.js");
const auth = await import("../api/_auth.js");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let server, chrome, p, BASE;
const u = {};
const run = Date.now().toString(36) + "ux";

before(async () => {
  if (!url) return;
  execFileSync(process.execPath, ["scripts/seed-programme.mjs", "--replace", "--no-model"], { env: { ...process.env }, stdio: "ignore" });
  const port = 4100 + Math.floor(Math.random() * 400);
  BASE = `http://localhost:${port}`;
  server = spawn(process.execPath, ["scripts/dev.mjs"], { env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "inherit"] });
  await new Promise((ok) => server.stdout.once("data", ok));
  const mk = (role, extra = {}) => auth.createUser({ email: `${role}-${run}@test.invalid`, name: `${role[0].toUpperCase()}${role.slice(1)} ${run}`, role, password: "x".repeat(12), ...extra });
  for (const r of ["admin", "evaluator", "validator", "finance", "public"]) u[r] = await mk(r);
  u.department = await mk("department", { org: `Public Health ${run}, Nagpur` });
  u.startup = await mk("startup", { org: `QueueSense ${run}` });
  await db().query(`insert into startup_profiles (user_id, dpiit_recognised, capabilities, sectors, prior_deployments, prior_evidence)
    values ($1, true, 'OPD median wait from registration timestamps, read-only', '{Health}', 2, 'median wait down 41%')`, [u.startup.id]);
  chrome = await launch();
  p = await chrome.page();
});
after(async () => {
  if (!url) return;
  p?.close(); await chrome?.close(); server?.kill();
  execFileSync(process.execPath, ["scripts/seed-programme.mjs", "--remove"], { env: { ...process.env }, stdio: "ignore" });
  await db().end();
});

const as = async (user) => { await p.clearCookies(); if (user) await p.cookie("sid", auth.sessionToken(user.id), BASE); };
const ready = "document.readyState === 'complete' && !!document.querySelector('main') && !document.querySelector('main [aria-busy=true]')";
const go = (path, cond = ready) => p.goto(BASE + path, cond);
const click = (sel) => p.js(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error("no ${sel.replace(/"/g, "'")}"); el.click(); return true; })()`);
const text = (sel) => p.js(`document.querySelector(${JSON.stringify(sel)})?.textContent.trim() ?? null`);
// Set form values the way a person would, firing input/change so the page reacts.
const fill = (root, values) => p.js(`(() => {
  const root = document.querySelector(${JSON.stringify(root)});
  for (const [name, value] of Object.entries(${JSON.stringify(values)})) {
    const els = root.querySelectorAll('[name="' + name + '"]');
    if (!els.length) throw new Error("no field " + name);
    for (const el of els) {
      if (el.type === "radio") { if (el.value === value) { el.checked = true; el.dispatchEvent(new Event("change", { bubbles: true })); } }
      else if (el.type === "checkbox") { el.checked = Array.isArray(value) ? value.includes(el.value) : !!value; el.dispatchEvent(new Event("change", { bubbles: true })); }
      else { el.value = value; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }
    }
  }
  return true; })()`);
const state = () => text(".stepper .step.current .step-label");
const drawerSubmit = async ({ confirm = false } = {}) => {
  await click("dialog[open] form button[type=submit]");
  if (confirm) { await p.waitFor("!!document.querySelector('dialog.modal[open]')"); await click("dialog.modal[open] button[value=ok]"); }
};
const action = async (name) => { await p.waitFor(`!!document.querySelector('[data-action="${name}"]')`); await click(`[data-action="${name}"]`); await p.waitFor("!!document.querySelector('dialog[open] form')"); };

test("every page renders cleanly: no errors, no CSP violations, accessible, no sideways scroll", { skip, timeout: 240000 }, async () => {
  const { rows: [sample] } = await db().query("select r.id from records r join challenges c on c.id = r.challenge_id where c.pr_id = 'SAMPLE-01'");
  const pages = [
    [null, "/"], [null, "/sign-in"], [null, "/programme"], [null, "/programme/payments"], [null, "/demo"], [null, "/no-such-page"],
    [u.department, "/"], [u.department, "/pilots"], [u.department, "/pilots/new"], [u.startup, "/profile"],
    [u.admin, `/pilots/${sample.id}`], [u.admin, `/pilots/${sample.id}#selection`], [u.admin, `/pilots/${sample.id}#audit`],
  ];
  const problems = [];
  for (const [who, path] of pages) {
    await as(who);
    for (const [w, scheme] of [[1280, "light"], [390, "dark"]]) {
      await p.viewport(w, 900); await p.theme(scheme);
      p.errors.length = 0;
      await go(path);
      await sleep(250);
      const errors = p.errors.filter((e) => !(path === "/no-such-page" && /status of 404/.test(e)));
      const axe = (await p.axe()).filter((v) => ["serious", "critical"].includes(v.impact));
      const overflow = await p.overflowX();
      if (errors.length || axe.length || overflow > 0) problems.push({ path, w, scheme, errors, axe: axe.map((a) => `${a.id}: ${a.nodes.join(" | ")}`), overflow });
    }
  }
  assert.deepEqual(problems, []);
});

test("a real pilot goes from the wizard to Replication-ready through the forms", { skip, timeout: 300000 }, async () => {
  p.errors.length = 0;
  await p.viewport(1280, 1000); await p.theme("light");
  // Department: the wizard, with its client-side checks and the quality report.
  await as(u.department);
  await go("/pilots/new", "!!document.querySelector('#wizard')");
  await p.js("localStorage.clear(), true");
  await go("/pilots/new", "!!document.querySelector('#wizard')");
  await fill("#wizard", { department: `Public Health ${run}`, district: "Nagpur", sector: "Health", outcome_statement: "Cut median wait from OPD registration to first clinician contact" });
  await click("#next");
  await fill("#wizard", { kpi_name: "Median wait, registration to clinician", kpi_unit: "minutes", kpi_definition: "Median of consultation minus registration" });
  await click("#next");
  await click("#next"); // baseline left empty: refused on this step
  assert.match(await text('[data-field="baseline_value"] .error-text'), /required/);
  await fill("#wizard", { baseline_value: "94", baseline_window: "Oct–Dec 2025", baseline_source: "HMIS export", baseline_method: "All visits" });
  await click("#next");
  await fill("#wizard", { target_direction: "decrease", target_value: "120", duration_days: "90", comparison_unit: "Second OPD" });
  await click("#next"); // a target above the baseline can't be a decrease
  assert.match(await text('[data-field="target_value"] .error-text'), /below the baseline/);
  await fill("#wizard", { target_value: "60" });
  await click("#next");
  await p.waitFor("!!document.querySelector('#quality h3')");
  assert.equal(await text("#step-title"), "Review");
  await click("#next");
  await p.waitFor("location.pathname.startsWith('/pilots/') && !!document.querySelector('.stepper')");
  const id = await p.js("location.pathname.split('/')[2]");
  assert.equal(await state(), "Draft");
  const open = async (who) => { await as(who); await go(`/pilots/${id}`, "!!document.querySelector('.stepper')"); };

  await open(u.admin);
  await action("verify_baseline");
  await drawerSubmit(); // the quality report must be acknowledged first
  assert.match(await text('dialog[open] [data-field="result"] .error-text'), /required/);
  await fill("dialog[open] form", { result: "Re-derived 94 from the export" });
  await drawerSubmit();
  assert.match(await text('dialog[open] [data-field="quality_ack"] .error-text'), /Tick/);
  await fill("dialog[open] form", { quality_ack: true });
  await drawerSubmit();
  await p.waitFor("document.querySelector('.stepper .step.current .step-label')?.textContent === 'Baseline verified'");

  await open(u.department);
  await click('[data-action="seal"]');
  await p.waitFor("!!document.querySelector('dialog.modal[open]')");
  await click("dialog.modal[open] button[value=ok]");
  await p.waitFor("document.querySelector('.stepper .step.current .step-label')?.textContent === 'Criteria sealed'");

  await open(u.admin);
  await action("screen");
  await fill("dialog[open] form", { users: "One OPD", systems: "Timestamps", allow_write: "no", data_class: "pseudonymised", reversibility: "A day", cap_inr: "1500000", start_date: "2026-11-01" });
  await drawerSubmit();
  await p.waitFor("!!document.querySelector('[data-action=award]')");

  await open(u.evaluator);
  await action("score");
  await p.js(`document.querySelectorAll('dialog[open] [name^="score_"]').forEach((el, i) => { el.value = String(80 - i); el.dispatchEvent(new Event("input", { bubbles: true })); }), true`);
  await drawerSubmit();
  await p.waitFor("!document.querySelector('dialog[open]')");

  await open(u.admin);
  await action("award");
  await p.js(`(() => { const s = document.querySelector('dialog[open] [name=startup_user_id]'); s.value = ${JSON.stringify(u.startup.id)}; s.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
  await fill("dialog[open] form", { scope: "One OPD, 90 days", data_access: "Timestamps only", "milestones.0.title": "Sandbox", "milestones.0.evidence_expected": "Baseline study",
    "milestones.0.due": "2026-11-15", "milestones.0.amount_inr": "500000", "milestones.1.title": "90 days", "milestones.1.evidence_expected": "Dataset",
    "milestones.1.due": "2027-01-31", "milestones.1.amount_inr": "1000000" });
  assert.equal(await text("#ms-total"), "₹15 L");
  await drawerSubmit({ confirm: true });
  await p.waitFor("document.querySelector('.stepper .step.current .step-label')?.textContent === 'Pilot active'");

  // Startup: real files through the dropzone; the browser's hash must match the server's.
  const dir = mkdtempSync(join(tmpdir(), "ui-ev-"));
  writeFileSync(join(dir, "m1.csv"), "visit,wait\n1,52\n"); writeFileSync(join(dir, "m2.csv"), "visit,wait\n1,55\n");
  await open(u.startup);
  for (const [n, f] of [["1", "m1.csv"], ["2", "m2.csv"]]) {
    await action("upload_evidence");
    await fill("dialog[open] form", { milestone: n, title: `Evidence ${n}` });
    await p.files("dialog[open] #file", [join(dir, f)]);
    await p.waitFor("!!document.querySelector('dialog[open] #file-info .file-row')");
    await drawerSubmit();
    await p.waitFor("[...document.querySelectorAll('.toast')].some((t) => /matches/.test(t.textContent))");
    await p.js("document.querySelectorAll('.toast').forEach((t) => t.remove()), true");
  }

  await open(u.department);
  for (const n of ["1", "2"]) {
    await action("review_milestone");
    await fill("dialog[open] form", { milestone: n, decision: "accept" });
    await drawerSubmit();
    await p.waitFor("!document.querySelector('dialog[open]')");
  }
  await p.waitFor("document.querySelector('.stepper .step.current .step-label')?.textContent === 'Evidence submitted'");

  await open(u.finance);
  await action("record_payment");
  await fill("dialog[open] form", { milestone: "1", outcome: "paid", paid_on: "2099-01-01" });
  await drawerSubmit(); // a payment date in the future: the server's 422 lands on the field
  await p.waitFor("!!document.querySelector('dialog[open] [data-field=\"paid_on\"] .error-text:not([hidden])')");
  assert.match(await text('dialog[open] [data-field="paid_on"] .error-text'), /future/);
  await fill("dialog[open] form", { paid_on: new Date().toISOString().slice(0, 10) });
  await drawerSubmit();
  await p.waitFor("!document.querySelector('dialog[open]')");

  await open(u.validator);
  await action("attest");
  await fill("dialog[open] form", { achieved: "55", method: "Difference-in-differences" });
  await drawerSubmit({ confirm: true });
  await p.waitFor("document.querySelector('.stepper .step.current .step-label')?.textContent === 'Independently validated'");

  await open(u.finance);
  await action("compile_route");
  await fill("dialog[open] form", { same_department: "yes", scale_up: "no" });
  await drawerSubmit({ confirm: true });
  await p.waitFor("document.querySelector('.stepper .step.current .step-label')?.textContent === 'Procurement-ready'");

  await open(u.department);
  await action("approve_route");
  await drawerSubmit({ confirm: true });
  await p.waitFor("!!document.querySelector('[data-action=record_deployment]')");
  await action("record_deployment");
  const ago = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  await fill("dialog[open] form", { order_reference: "GEMC-1", sites: "OPD", go_live: ago(60), staff_to_train: "40", annual_cost_inr: "240000" });
  await drawerSubmit();
  await p.waitFor("document.querySelector('.stepper .step.current .step-label')?.textContent === 'Deployed'");
  await action("record_adoption");
  await fill("dialog[open] form", { measured_on: ago(5), staff_trained: "40", weekly_active: "34", kpi_value: "57" });
  await drawerSubmit();
  await p.waitFor("document.querySelector('.stepper .step.current .step-label')?.textContent === 'Adoption measured'");

  await open(u.admin);
  await action("replication_review");
  await fill("dialog[open] form", { decision: "replicate", reusable: ["Baseline method", "Sealed KPIs"] });
  await drawerSubmit({ confirm: true });
  await p.waitFor("document.querySelector('.stepper .step.current .step-label')?.textContent === 'Replication-ready'");
  assert.equal(await text(".rail .card-body p.small.muted"), "Complete: ready for another department to replicate.");
  // The one error expected: the deliberate future-dated payment's 422, which Chrome logs.
  assert.deepEqual(p.errors.filter((e) => !/status of 422/.test(e)), []);
  assert.equal(p.errors.length, 1);
});

test("the guided demo plays through from a signed-out visitor", { skip, timeout: 240000 }, async () => {
  p.errors.length = 0;
  await as(null);
  await p.viewport(1280, 900);
  await go("/demo", "!!document.querySelector('[data-demo=load]')");
  await click("[data-demo=load]");
  await p.waitFor("!!document.querySelector('.stepper') && !!document.querySelector('.demo-card [data-demo]')", 15000);
  for (let i = 0; i < 40 && await p.js("!!document.querySelector('[data-demo=advance], [data-demo=switch]')"); i++) {
    const before = await p.js("document.querySelectorAll('.tl-item').length");
    if (await p.js("!!document.querySelector('[data-demo=switch]')")) {
      await click("[data-demo=switch]");
      await p.waitFor("!!document.querySelector('[data-demo=advance]')");
    }
    await click("[data-demo=advance]");
    await p.waitFor(`document.querySelectorAll('.tl-item').length > ${before}`);
  }
  assert.equal(await state(), "Replication-ready");
  assert.match(await text(".demo-card"), /Complete/);
  await click("[data-demo=reset]");
  await p.waitFor("!!document.querySelector('[data-demo=load]')");
  assert.deepEqual(p.errors, []);
});

test("keyboard: tabs, drawers, search", { skip, timeout: 120000 }, async () => {
  const { rows: [sample] } = await db().query("select r.id from records r join challenges c on c.id = r.challenge_id where c.pr_id = 'SAMPLE-01'");
  await as(u.admin);
  await go(`/pilots/${sample.id}`, "!!document.querySelector('[role=tab]')");
  await p.js("document.querySelector('#tab-overview').focus(), true");
  await p.cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
  assert.equal(await p.js("document.activeElement.id"), "tab-selection");
  assert.equal(await p.js("document.querySelector('#panel-selection').hidden"), false);
  assert.equal(await p.js("location.hash"), "#selection");
  await p.cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "End", code: "End", windowsVirtualKeyCode: 35 });
  assert.equal(await p.js("document.activeElement.id"), "tab-audit");

  // "/" focuses search; arrows and Enter open a result.
  await p.js("document.activeElement.blur(), document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true })), true");
  assert.equal(await p.js("document.activeElement.id"), "search");
  await p.js(`(() => { const s = document.querySelector('#search'); s.value = 'Nagpur'; s.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await p.waitFor("!!document.querySelector('#search-results [role=option]')");
  assert.equal(await p.js("document.querySelector('#search').getAttribute('aria-expanded')"), "true");

  // A drawer traps focus and gives it back on Esc (on a real pilot: sample pilots are read-only).
  const { createChallenge } = await import("../api/_actions.js");
  const created = await createChallenge(u.department, { department: `Keyboard ${run}`, outcome_statement: "Cut wait",
    kpi_name: "Wait", kpi_unit: "min", baseline_value: "10", baseline_source: "s", baseline_method: "m", target_value: "5", target_direction: "decrease", comparison_unit: "c", duration_days: "90" });
  await go(`/pilots/${created.record_id}`, "!!document.querySelector('[data-action=verify_baseline]')");
  await p.js("document.querySelector('[data-action=verify_baseline]').focus(), true");
  await click("[data-action=verify_baseline]");
  await p.waitFor("!!document.querySelector('dialog[open]')");
  assert.ok(await p.js("document.querySelector('dialog[open]').contains(document.activeElement)"), "focus moves into the drawer");
  await p.cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await p.waitFor("!document.querySelector('dialog[open]')");
  assert.equal(await p.js("document.activeElement.dataset.action"), "verify_baseline", "focus returns to the button that opened it");
});
