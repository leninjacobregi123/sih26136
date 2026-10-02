// The Pilot Evidence Passport: /pilots/:id for a real (or sample) pilot, /demo for the guided
// demo. Header, stepper and key facts on top; tabs for the record; a sticky rail with the next
// step (or the demo controls) and the integrity checks. Live: other people's actions arrive
// as toasts and the page redraws without touching an open form.
import { html, render } from "../core/html.js";
import { api } from "../core/api.js";
import { watch } from "../core/live.js";
import { roleLabel } from "../core/roles.js";
import { lakh, date, dateTime, num, plural } from "../core/format.js";
import { page, bindRetry } from "../ui/shell.js";
import { icon } from "../ui/icons.js";
import { statePill, STATES, LEARNING } from "../ui/pills.js";
import { tabList, tabPanel, bindTabs } from "../ui/tabs.js";
import { skeletonPage, empty, errorState, alert } from "../ui/states.js";
import { toast } from "../ui/toast.js";
import { hashChip } from "../ui/hash.js";
import { bindCharts } from "../ui/chart.js";
import { TABS } from "./pilot/sections.js";
import { nextStepCard, bindNextStep, demoCard, bindDemo } from "./pilot/actions.js";

const DEMO = location.pathname.startsWith("/demo");
const id = DEMO ? null : decodeURIComponent(location.pathname.split("/")[2] ?? "");
const { user, main, setCrumbs } = await page({
  active: DEMO ? "demo" : "pilots", auth: DEMO ? "optional" : "required", title: DEMO ? "Guided demo" : "Pilot passport",
  crumbs: DEMO ? [{ label: "Guided demo" }] : [{ href: "/pilots", label: "Pilots" }, { label: "Passport" }],
});

const ctx = { id, user, bundle: null, update: null };
let stopLive = null, watching = null, quietUntil = 0;

const fetchBundle = () => api(DEMO ? "/api/demo" : `/api/passports?id=${encodeURIComponent(id)}`);

async function load() {
  render(main, skeletonPage());
  try { ctx.bundle = await fetchBundle(); }
  catch (err) { render(main, errorState(err)); bindRetry(main, load); return; }
  paint();
}

// After any change we made ourselves (or a live event), redraw everything from the new bundle.
ctx.update = (bundle) => { ctx.bundle = bundle; quietUntil = Date.now() + 4000; paint(); };

// ---- header pieces ------------------------------------------------------------------------
function reachedOn(b) {
  const on = {};
  for (const e of b.audit) if (e.detail?.to && !on[e.detail.to]) on[e.detail.to] = e.at;
  if (b.audit[0]) on[STATES[0]] ??= b.audit[0].at;
  return on;
}

function stepper(b) {
  const state = b.record.passport_state, on = reachedOn(b);
  let steps = STATES.map((s) => ({ s }));
  let at = STATES.indexOf(state);
  if (state === LEARNING) {
    const from = [...b.audit].reverse().find((e) => e.detail?.to === LEARNING)?.detail.from;
    steps = [...STATES.slice(0, STATES.indexOf(from) + 1).map((s) => ({ s })), { s: LEARNING, learning: true }];
    at = steps.length - 1;
  }
  return html`<ol class="stepper" aria-label="Passport progress">${steps.map((x, i) => html`<li class="step ${i < at ? "done" : i === at ? "current" : ""} ${x.learning ? "learning" : ""}" ${i === at ? html`aria-current="step"` : ""}>
    <span class="marker">${i < at ? icon("check", { cls: "icon-xs" }) : x.learning ? icon("book-open", { cls: "icon-xs" }) : i + 1}</span>
    <span class="step-label">${x.s}</span><span class="step-date">${on[x.s] ? date(on[x.s]) : ""}</span></li>`)}</ol>`;
}

function facts(b) {
  const { passport: p, challenge: c } = b;
  const unit = c.kpi_unit ? ` ${c.kpi_unit}` : "";
  const v = p.validation?.kpis?.[0];
  const now = p.adoption?.latest?.outcome?.now;
  const total = (p.milestones ?? []).reduce((a, m) => a + Number(m.amount_inr), 0);
  const paid = (p.milestones ?? []).filter((m) => /paid/.test(m.payment?.state)).reduce((a, m) => a + Number(m.amount_inr), 0);
  const fact = (label, value, sub, cls = "") => html`<div class="card fact"><div class="fact-label">${label}</div><div class="fact-value ${cls}">${value}</div>${sub && html`<div class="fact-sub">${sub}</div>`}</div>`;
  return html`<div class="facts">
    ${fact("Baseline", html`${num(c.baseline_value)}<small>${unit}</small>`, c.baseline_window)}
    ${fact("Target", p.criteria[0]?.target ?? "—", p.criteria.length > 1 ? `+ ${p.criteria.length - 1} more KPI${p.criteria.length > 2 ? "s" : ""}` : "sealed with the baseline")}
    ${fact("Validated", v ? html`${num(v.achieved)}<small>${unit}</small>` : "—", v ? (v.met ? html`<span class="text-success">${icon("circle-check", { cls: "icon-xs" })} met</span>` : html`<span class="text-danger">${icon("circle-x", { cls: "icon-xs" })} missed</span>`) : "after the pilot")}
    ${fact("Now", now != null ? html`${num(now)}<small>${unit}</small>` : "—", now != null ? `measured ${date(p.adoption.latest.measured_on)}` : "after deployment")}
    ${fact("Paid", total ? lakh(paid) : "—", total ? `of ${lakh(total)}` : "after the award")}
  </div>`;
}

function integrity(b) {
  const seal = b.seal;
  return html`<section class="card" aria-labelledby="integrity-title">
    <div class="card-header"><h2 id="integrity-title">${icon("shield-check")}Integrity</h2></div>
    <div class="card-body stack small">
      <div class="row-between"><span class="row">${seal ? (seal.intact ? html`<span class="text-success">${icon("lock", { cls: "icon-sm" })}</span>Seal intact`
        : html`<span class="text-danger">${icon("triangle-alert", { cls: "icon-sm" })}</span><strong class="text-danger">Seal broken</strong>`) : html`<span class="muted">${icon("lock", { cls: "icon-sm" })}</span><span class="muted">Not sealed yet</span>`}</span>
        ${seal && hashChip(seal.sha256, { label: "seal", n: 8 })}</div>
      <div class="row-between"><span class="row">${b.chain.intact ? html`<span class="text-success">${icon("history", { cls: "icon-sm" })}</span>Audit chain intact`
        : html`<span class="text-danger">${icon("triangle-alert", { cls: "icon-sm" })}</span><strong class="text-danger">Chain broken at ${b.chain.broken_at + 1}</strong>`}</span>
        <a href="#audit" data-tab-link="audit">${plural(b.chain.events, "event")}</a></div>
      <p class="muted">Recomputed every time this page loads, from the stored records.</p>
    </div></section>`;
}

// ---- the page ------------------------------------------------------------------------------
function paint() {
  const b = ctx.bundle;
  if (DEMO && !b.loaded) {
    render(main, html`<div class="page-head"><div><h1>Guided demo</h1>
      <p class="lede">A district-hospital OPD pilot, from a draft challenge to replication, in sixteen steps. You play each role in turn; the server checks every step.</p></div></div>
      <div class="with-rail"><div class="card">${empty({ icon: "circle-play", title: "Load the demo scenario to begin",
        body: html`The pilot starts at <strong>Draft</strong>. Each step belongs to one role: switch to it, then advance. The seal, the evidence hashes and the audit chain are real; the names, dates and money are fictional.` })}</div>
      <aside class="rail">${demoCard(ctx)}</aside></div>`);
    bindDemo(main, ctx);
    return;
  }

  const { challenge: c, record: r } = b;
  if (!DEMO) setCrumbs([{ href: "/pilots", label: "Pilots" }, { label: c.kpi_name }]);
  document.title = `${c.kpi_name} · ${DEMO ? "Guided demo" : "Passport"} · GovStart Bridge`;
  const hash = location.hash.slice(1);
  const selected = TABS.some((t) => t.id === hash) ? hash : "overview";
  const tabs = TABS.map((t) => ({ ...t, body: t.render(b, ctx.user, DEMO) }));
  const reached = (s) => { const i = STATES.indexOf(r.passport_state); return r.passport_state === LEARNING || (i >= 0 && i >= STATES.indexOf(s)); };

  render(main, html`
    ${DEMO ? html`<div style="margin-bottom:var(--s-4)">${alert("info", { title: "Guided demo · simulated data", body: "Not an official government record. The names, dates, payments and results are fictional; the seal, hashes and audit chain are computed for real." })}</div>`
      : b.sample ? html`<div style="margin-bottom:var(--s-4)">${alert("warning", { title: "Sample pilot — fictional", body: "Seeded to show the programme at work. Not an official record. Read-only." })}</div>` : ""}
    <div class="page-head">
      <div style="min-width:0">
        <div class="row" style="margin-bottom:var(--s-2)">${statePill(r.passport_state)}
          ${DEMO ? html`<span class="chip">Demo</span>` : b.sample ? html`<span class="chip">Sample</span>` : ""}
          <span class="pill" id="live" title="Live updates">${icon("radio")}<span>Connecting…</span></span></div>
        <h1>${c.kpi_name}</h1>
        <p class="lede">${c.department}${c.district ? ` · ${c.district}` : ""} — ${c.outcome_statement}</p>
      </div>
      <div class="page-actions">
        ${!DEMO && html`<button class="btn" type="button" data-copy="${location.origin}${location.pathname}" data-copy-msg="Link copied.">${icon("link", { cls: "icon-sm" })}Copy link</button>`}
        <button class="btn" type="button" id="print">${icon("printer", { cls: "icon-sm" })}Download PDF</button>
      </div>
    </div>
    <p class="print-only small">Printed ${dateTime(new Date())} from ${location.origin}${location.pathname}. Student prototype; not an official government record.</p>
    <section class="card card-body" style="margin-bottom:var(--s-4)" aria-label="Progress">${stepper(b)}</section>
    ${facts(b)}
    <div class="passport-body">
      <div class="tabs-bar">${tabList(tabs.map((t) => ({ id: t.id, label: t.label, mark: t.always ? undefined : !!t.body && reached(t.state) })), selected, "Passport sections")}</div>
      <div class="main-col">
        ${tabs.map((t) => tabPanel(t, selected, t.body ?? html`<div class="card">${empty({ icon: "hourglass", title: "Not reached yet",
          body: html`This section fills in at <strong>${t.state}</strong>. The pilot is at ${r.passport_state}.` })}</div>`))}
      </div>
      <aside class="rail" aria-label="Next step and integrity">${DEMO ? demoCard(ctx) : nextStepCard(ctx)}${integrity(b)}</aside>
    </div>`);

  bindTabs(main);
  bindCharts(main);
  main.querySelector("#print").addEventListener("click", () => window.print());
  main.querySelectorAll("[data-tab-link]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    main.querySelector(`#tab-${a.dataset.tabLink}`)?.click();
    main.querySelector(`#tab-${a.dataset.tabLink}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  if (DEMO) bindDemo(main, ctx); else bindNextStep(main, ctx);
  goLive(r.id);
}

// Print what is on screen: the chosen startup's screening card is open in full, the others print
// as their one-line summaries (name, result, score, main reason).

function setLive(state) {
  const el = main.querySelector("#live");
  if (!el) return;
  el.className = `pill ${state === "live" ? "tone-success" : ""}`;
  el.querySelector("span").textContent = state === "live" ? "Live" : state === "off" ? "Offline" : "Connecting…";
}

function goLive(recordId) {
  if (watching === recordId) { setLive(liveState); return; }
  stopLive?.();
  watching = recordId;
  stopLive = watch(recordId, {
    onState: (s) => { liveState = s; setLive(s); },
    onEvent: async (e) => {
      if (Date.now() > quietUntil) toast(html`<strong>${e.actor_role}</strong>: ${e.action}`, { tone: "activity" });
      try {
        ctx.bundle = await fetchBundle();
        // Never redraw under an open form; catch up when it closes.
        if (document.querySelector("dialog[open]")) stale = true; else paint();
      } catch {}
    },
  });
}
let liveState = "connecting", stale = false;
document.addEventListener("close", () => { if (stale && !document.querySelector("dialog[open]")) { stale = false; paint(); } }, true);

load();
