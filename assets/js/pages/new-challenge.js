// New challenge: a five-step wizard. Problem → Measure → Baseline (the gate) → Target & design →
// Review, where the quality check runs and each finding links back to its field. The draft is
// kept in this browser until it is submitted.
import { html, render } from "../core/html.js";
import { api } from "../core/api.js";
import { num } from "../core/format.js";
import { page } from "../ui/shell.js";
import { icon } from "../ui/icons.js";
import { input, textarea, choices, readForm, clearErrors, showError, checkRequired, busy } from "../ui/fields.js";
import { alert, empty } from "../ui/states.js";

const { user, main } = await page({ active: "new", title: "New challenge", crumbs: [{ href: "/pilots", label: "Pilots" }, { label: "New challenge" }] });

if (user.role !== "department" || user.is_demo) {
  render(main, html`<div class="card" style="max-width:640px;margin:var(--s-8) auto">${empty({ icon: "lock", title: "Only a Department Officer creates challenges",
    body: user.is_demo ? "Demo accounts can't create real challenges. The guided demo walks a challenge through every step instead." : "Your role reviews and acts on challenges once a department creates them.",
    actions: html`<a class="btn btn-primary" href="${user.is_demo ? "/demo" : "/pilots"}">${user.is_demo ? "Run the guided demo" : "See pilots"}</a>` })}</div>`);
} else {
  wizard();
}

function wizard() {
  const KEY = `draft-challenge:${user.id}`;
  const store = { get: () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } },
    set: (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} }, clear: () => { try { localStorage.removeItem(KEY); } catch {} } };
  const draft = store.get();
  const v = draft ?? { department: (user.org ?? "").split(",")[0].trim(), district: (user.org ?? "").split(",")[1]?.trim() ?? "" };

  const STEPS = [
    { title: "Problem", fields: ["department", "district", "sector", "outcome_statement"],
      body: html`${alert("info", { body: "Describe the problem and the outcome you want, not a solution. Naming a product (“build an app”) rules out approaches the market might offer." })}
        <div class="field-row" style="margin-top:var(--s-4)">${input({ name: "department", label: "Department", required: true, value: v.department })}
          ${input({ name: "district", label: "District", optional: true, value: v.district })}</div>
        ${input({ name: "sector", label: "Sector", optional: true, value: v.sector, placeholder: "Health, Water, Urban services…" })}
        ${textarea({ name: "outcome_statement", label: "Outcome you want", required: true, rows: 3, value: v.outcome_statement,
          placeholder: "Cut median wait from OPD registration to first clinician contact, with no extra sanctioned staff" })}` },
    { title: "Measure", fields: ["kpi_name", "kpi_unit", "kpi_definition"],
      body: html`${input({ name: "kpi_name", label: "KPI", required: true, value: v.kpi_name, placeholder: "Median wait, registration to clinician" })}
        ${input({ name: "kpi_unit", label: "Unit", optional: true, value: v.kpi_unit, placeholder: "minutes, %, cases per week", hint: "Without a unit, two people can measure it differently." })}
        ${textarea({ name: "kpi_definition", label: "Definition", optional: true, rows: 3, value: v.kpi_definition,
          placeholder: "What is counted, over what, from which records", hint: "The validator measures against exactly this." })}` },
    { title: "Baseline", fields: ["baseline_value", "baseline_window", "baseline_source", "baseline_method"],
      body: html`${alert("warning", { title: "No baseline, no challenge", body: "Without the current measured value, where it came from and how it was measured, there is nothing to compare the pilot against. The server refuses a challenge without them." })}
        <div class="field-row" style="margin-top:var(--s-4)">${input({ name: "baseline_value", label: "Baseline value", required: true, inputmode: "decimal", value: v.baseline_value, suffix: html`<span data-unit>${v.kpi_unit || "unit"}</span>` })}
          ${input({ name: "baseline_window", label: "Measured over", optional: true, value: v.baseline_window, placeholder: "Oct–Dec 2025" })}</div>
        ${input({ name: "baseline_source", label: "Source", required: true, value: v.baseline_source, placeholder: "District hospital HMIS export" })}
        ${textarea({ name: "baseline_method", label: "Method", required: true, rows: 2, value: v.baseline_method, placeholder: "How the number was measured, and what was excluded" })}` },
    { title: "Target & design", fields: ["target_direction", "target_value", "duration_days", "comparison_unit"],
      body: html`${choices({ name: "target_direction", legend: "Direction", required: true, value: v.target_direction,
          options: [["decrease", "Bring it down", "To the target or below"], ["increase", "Bring it up", "To the target or above"]] })}
        <div class="field-row" style="margin-top:var(--s-4)">${input({ name: "target_value", label: "Target", required: true, inputmode: "decimal", value: v.target_value, suffix: html`<span data-unit>${v.kpi_unit || "unit"}</span>`,
            hint: html`Baseline: <span data-baseline>${v.baseline_value ?? "—"}</span>` })}
          ${input({ name: "duration_days", label: "Pilot length", optional: true, inputmode: "numeric", value: v.duration_days ?? "90", suffix: "days", hint: "30 to 365 days." })}</div>
        ${input({ name: "comparison_unit", label: "Comparison unit", optional: true, value: v.comparison_unit, placeholder: "A similar unit that won't get the solution",
          hint: "Without one, a seasonal change could pass for success." })}` },
    { title: "Review", fields: [], body: html`<div id="review"></div>` },
  ];
  const owner = Object.fromEntries(STEPS.flatMap((s, i) => s.fields.map((f) => [f, i])));
  let at = 0;

  render(main, html`<div class="page-head"><div><h1>New challenge</h1><p class="lede">The baseline and target are sealed with SHA-256 before any startup is chosen.</p></div></div>
    ${draft ? html`<div id="draft-note" style="margin-bottom:var(--s-4)">${alert("info", { body: html`Your unsent draft was restored. <button class="link-btn" type="button" id="discard">Start again</button>` })}</div>` : ""}
    <div class="grid-2" style="grid-template-columns:minmax(0,220px) minmax(0,1fr);align-items:start">
      <nav aria-label="Steps"><ol class="wizard-steps">${STEPS.map((s, i) => html`<li data-i="${i}"><span class="ws-num">${i + 1}</span><span>${s.title}</span></li>`)}</ol></nav>
      <form class="card" id="wizard" novalidate>
        <div class="card-header"><h2 id="step-title"></h2><span class="small muted" id="step-count"></span></div>
        <div class="card-body"><div id="form-error"></div>${STEPS.map((s, i) => html`<fieldset data-step="${i}" ${i ? html`hidden` : ""}><legend class="sr-only">${s.title}</legend>${s.body}</fieldset>`)}</div>
        <div class="card-footer form-actions" style="justify-content:space-between">
          <button class="btn" type="button" id="back">${icon("arrow-left", { cls: "icon-sm" })}Back</button>
          <button class="btn btn-primary" type="submit" id="next"></button></div>
      </form></div>`);

  const form = main.querySelector("#wizard");
  const $ = (s) => main.querySelector(s);
  $("#discard")?.addEventListener("click", () => { store.clear(); location.reload(); });

  const values = () => readForm(form);
  form.addEventListener("input", () => {
    const d = values();
    store.set(d);
    main.querySelectorAll("[data-unit]").forEach((el) => (el.textContent = d.kpi_unit || "unit"));
    main.querySelectorAll("[data-baseline]").forEach((el) => (el.textContent = d.baseline_value || "—"));
  });

  function show(i) {
    at = i;
    form.querySelectorAll("fieldset[data-step]").forEach((fs) => (fs.hidden = Number(fs.dataset.step) !== i));
    main.querySelectorAll(".wizard-steps li").forEach((li) => {
      const n = Number(li.dataset.i);
      li.className = n < i ? "done" : n === i ? "current" : "";
      if (n === i) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    $("#step-title").textContent = STEPS[i].title;
    $("#step-count").textContent = `Step ${i + 1} of ${STEPS.length}`;
    $("#back").hidden = i === 0;
    $("#next").textContent = i === STEPS.length - 1 ? "Create challenge" : "Continue";
    render($("#form-error"), "");
    if (i === STEPS.length - 1) review();
    form.querySelector(`fieldset[data-step="${i}"] input, fieldset[data-step="${i}"] textarea`)?.focus();
  }

  // Same rules as the server, so mistakes show up on the step that made them.
  function checkStep(i) {
    clearErrors(form);
    const fs = form.querySelector(`fieldset[data-step="${i}"]`);
    for (const el of fs.querySelectorAll("[required]")) {
      const empty = el.type === "radio" ? !form.querySelector(`input[name="${el.name}"]:checked`) : !String(el.value).trim();
      if (empty) { checkRequired(fs); return false; }
    }
    const d = values();
    const isNum = (x) => x === undefined || x === "" || Number.isFinite(Number(x));
    if (i === 2 && !isNum(d.baseline_value)) return !showError(form, "the baseline must be a number", "baseline_value");
    if (i === 3) {
      if (!isNum(d.target_value)) return !showError(form, "the target must be a number", "target_value");
      if (d.duration_days && !(Number(d.duration_days) >= 1)) return !showError(form, "the pilot length must be a number of days", "duration_days");
      const b = Number(d.baseline_value), t = Number(d.target_value);
      if (d.target_direction === "decrease" && t >= b) return !showError(form, `to bring it down, the target must be below the baseline (${num(b)})`, "target_value");
      if (d.target_direction === "increase" && t <= b) return !showError(form, `to bring it up, the target must be above the baseline (${num(b)})`, "target_value");
    }
    return true;
  }

  async function review() {
    const d = values();
    const row = (label, value, step) => html`<div class="review-row"><dt>${label}</dt><dd>${value || html`<span class="muted">—</span>`}</dd>
      <dd><button class="link-btn small" type="button" data-goto="${step}">Edit</button></dd></div>`;
    render($("#review"), html`<dl class="review">
      ${row("Department", [d.department, d.district].filter(Boolean).join(" · "), 0)}${row("Sector", d.sector, 0)}${row("Outcome", d.outcome_statement, 0)}
      ${row("KPI", html`${d.kpi_name}${d.kpi_unit ? html` <span class="muted">(${d.kpi_unit})</span>` : ""}`, 1)}${row("Definition", d.kpi_definition, 1)}
      ${row("Baseline", html`<strong>${d.baseline_value} ${d.kpi_unit ?? ""}</strong>${d.baseline_window ? ` · ${d.baseline_window}` : ""}`, 2)}
      ${row("Source", d.baseline_source, 2)}${row("Method", d.baseline_method, 2)}
      ${row("Target", html`<strong>${d.target_direction === "decrease" ? "≤" : "≥"} ${d.target_value} ${d.kpi_unit ?? ""}</strong>`, 3)}
      ${row("Pilot length", d.duration_days && `${d.duration_days} days`, 3)}${row("Comparison", d.comparison_unit, 3)}</dl>
      <div id="quality" style="margin-top:var(--s-5)"><div class="row small muted">${icon("loader-circle", { cls: "icon-sm spin" })}Running the quality check…</div></div>`);
    try {
      const q = await api("/api/challenges", { method: "POST", body: { ...d, check_only: true } });
      render($("#quality"), html`<h3 style="margin-bottom:var(--s-2)">Quality check</h3>
        <p class="small muted" style="margin-bottom:var(--s-3)">${q.model ? "Rules and the model" : "Rules only"}, against the defect taxonomy. Advisory: you can still submit, and the Programme Administrator reads the same report.</p>
        ${q.defects.length ? html`<ul class="stack" style="list-style:none">${q.defects.map((x) => html`<li class="alert alert-warning">${icon("triangle-alert")}<div class="grow">
          <div class="alert-title">${x.label}</div><div>${x.span ? html`“${x.span}” — ` : ""}${x.why}</div>
          ${owner[x.field] !== undefined ? html`<button class="link-btn small" type="button" data-fix="${x.field}" style="margin-top:4px">Fix this</button>` : ""}</div></li>`)}</ul>`
          : html`<div class="alert alert-success">${icon("circle-check")}<div>No findings.</div></div>`}`);
    } catch (err) {
      render($("#quality"), alert(err.field ? "warning" : "danger", { body: err.message }));
    }
  }

  main.addEventListener("click", (e) => {
    const go = e.target.closest("[data-goto]");
    if (go) show(Number(go.dataset.goto));
    const fix = e.target.closest("[data-fix]");
    if (fix) { show(owner[fix.dataset.fix]); form.querySelector(`[name="${fix.dataset.fix}"]`)?.focus(); }
  });
  $("#back").addEventListener("click", () => show(Math.max(0, at - 1)));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (at < STEPS.length - 1) { if (checkStep(at)) show(at + 1); return; }
    for (let i = 0; i < STEPS.length - 1; i++) if (!checkStep(i)) { show(i); checkStep(i); return; }
    await busy($("#next"), async () => {
      try {
        const out = await api("/api/challenges", { method: "POST", body: values() });
        store.clear();
        location.href = `/pilots/${out.record_id}`;
      } catch (err) {
        if (err.field && owner[err.field] !== undefined) { show(owner[err.field]); showError(form, err.message, err.field); }
        else render($("#form-error"), alert("danger", { body: err.message }));
      }
    });
  });
  show(0);
}
