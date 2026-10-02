// The passport's tabs. Each takes the bundle (from /api/passports or /api/demo) and returns its
// content, or null when the pilot hasn't reached the stage that fills it. The demo scenario
// stores a few sections in richer shapes than real pilots do; both are handled here.
import { html } from "../../core/html.js";
import { lakh, date, dateTime, dayKey, num, bytes, initials, plural } from "../../core/format.js";
import { icon } from "../../ui/icons.js";
import { tonePill, toneOf } from "../../ui/pills.js";
import { hashChip } from "../../ui/hash.js";
import { trendChart } from "../../ui/chart.js";

// ---- small building blocks ------------------------------------------------------------
const kv = (pairs) => {
  const rows = pairs.filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== false);
  return rows.length ? html`<dl class="kv">${rows.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>` : "";
};
const table = (head, rows, cls = "", label = "Table") => html`<div class="table-wrap" tabindex="0" role="region" aria-label="${label}"><table class="table ${cls}"><thead><tr>${head.map((h) =>
  html`<th class="${/^(Amount|Score|Points|Baseline|Achieved|Target|Days live|Trained|Weekly active)$/.test(h) ? "num" : ""}">${h}</th>`)}</tr></thead>
  <tbody>${rows.map((cells) => html`<tr>${cells.map((c, i) => html`<td class="${/^(Amount|Score|Points|Baseline|Achieved|Target|Days live|Trained|Weekly active)$/.test(head[i]) ? "num" : ""}" data-label="${head[i]}">${c}</td>`)}</tr>`)}</tbody></table></div>`;
const card = (title, ico, body, { sub, flush = false, extra } = {}) => html`<section class="card">
  <div class="card-header"><div><h2>${icon(ico)}${title}</h2>${sub && html`<p class="card-sub">${sub}</p>`}</div>${extra ?? ""}</div>
  <div class="card-body ${flush ? "tight" : ""}">${body}</div></section>`;
const check = (ok, soft) => ok ? html`<span class="text-success">${icon("circle-check", { label: "passed" })}</span>`
  : soft ? html`<span class="text-warning">${icon("triangle-alert", { label: "condition" })}</span>` : html`<span class="text-danger">${icon("circle-x", { label: "failed" })}</span>`;
const unit = (c) => c.kpi_unit ? ` ${c.kpi_unit}` : "";

// ---- Overview ---------------------------------------------------------------------------
const FIELD = { outcome_statement: "Problem", kpi_name: "KPI", kpi_unit: "KPI unit", kpi_definition: "KPI definition", baseline_value: "Baseline",
  baseline_window: "Baseline window", baseline_source: "Baseline source", baseline_method: "Baseline method", comparison_unit: "Comparison unit",
  duration_days: "Duration", target_value: "Target", target_direction: "Target direction" };

function quality(q) {
  if (!q) return "";
  return card("Quality gate", "shield-check", html`
    <p class="small muted" style="margin-bottom:var(--s-3)">Checked by ${q.model ? html`rules and ${q.model}` : html`rules only${q.model_error ? " (the model didn't run)" : ""}`},
      against defect taxonomy v${q.taxonomy_version}. Findings are advisory: they never block publication.</p>
    ${q.defects.length ? html`<ul class="stack" style="list-style:none">${q.defects.map((d) => html`<li class="alert alert-warning">${icon("triangle-alert")}
      <div class="grow"><div class="alert-title">${d.label} <span class="chip" style="margin-left:4px">${FIELD[d.field] ?? d.field}</span> <span class="chip">${d.source === "model" ? "model" : "rule"}</span></div>
        <div>${d.span ? html`“${d.span}” — ` : ""}${d.why}</div></div></li>`)}</ul>`
      : html`<div class="alert alert-success">${icon("circle-check")}<div>No findings.</div></div>`}
    <p class="small" style="margin-top:var(--s-3)">${q.reviewed
      ? html`<span class="text-success">${icon("circle-check", { cls: "icon-sm" })}</span> Reviewed by ${q.reviewed.by} before publication · ${dateTime(q.reviewed.at)}`
      : html`<span class="muted">Not reviewed yet. The Programme Administrator confirms it when verifying the baseline.</span>`}</p>`,
    { extra: html`<span class="pill tone-${q.defects.length ? "warning" : "success"}">${q.defects.length ? plural(q.defects.length, "finding") : "Clean"}</span>` });
}

export function overview(b) {
  const { passport: p, challenge: c, record: r } = b;
  return html`<div class="stack-lg">
    <div class="grid-2">
      ${card("Challenge", "flask-conical", kv([
        ["Problem", c.outcome_statement], ["Department", c.department], ["District", c.district], ["Sector", c.sector],
        ["Owner", p.identity?.owner], ["Affected", p.identity?.affected_population],
        ["Indicative budget", p.identity?.indicative_budget_inr && lakh(p.identity.indicative_budget_inr)],
        ["Status", tonePill(r.passport_state)],
      ]))}
      ${card("Baseline", "target", kv([
        ["Measure", html`${c.kpi_name}${c.kpi_unit ? html` <span class="muted">(${c.kpi_unit})</span>` : ""}`], ["Definition", c.kpi_definition],
        ["Baseline", html`<strong>${num(c.baseline_value)}${unit(c)}</strong>${c.baseline_window ? html` <span class="muted">· ${c.baseline_window}</span>` : ""}`],
        ["Source", c.baseline_source], ["Method", c.baseline_method], ["Comparison", c.comparison_unit],
        ["Verification", p.baseline?.verified ? html`<span class="text-success">${icon("circle-check", { cls: "icon-sm" })} ${p.baseline.verified_by}</span><div class="small muted">${p.baseline.result}</div>` : html`<span class="muted">Not verified yet</span>`],
      ]))}
    </div>
    ${card("Success criteria", "lock", html`
      ${table(["KPI", "Baseline", "Target"], p.criteria.map((k) => [k.kpi, html`${num(k.baseline)} <span class="muted">${k.unit}</span>`, k.target]))}
      <div style="padding:var(--s-4) var(--s-5);border-top:1px solid var(--border)">${p.seal
        ? html`<div class="row small">${icon("lock", { cls: "icon-sm text-success" })}<span>Sealed ${dateTime(p.seal.sealed_at)}</span>${hashChip(p.seal.sha256, { label: "seal", n: 16 })}</div>`
        : html`<span class="small muted">Not sealed yet. Until it is, these targets can still change.</span>`}</div>`,
      { flush: true, sub: "Sealed with SHA-256 before anyone is chosen; the validator recomputes it before attesting." })}
    ${quality(p.quality)}
  </div>`;
}

// ---- Selection ----------------------------------------------------------------------------
function candidate(c, open) {
  const failed = c.hard.filter((h) => !h.pass && !h.soft);
  return html`<details class="card cand-card" ${open ? html`open` : ""}>
    <summary class="cand-head"><span class="grow"><strong>${c.name}</strong>
      <span class="small muted" style="display:block">${failed.length ? failed[0].why : c.components.map((x) => `${x.name} ${x.points}/${x.weight}`).join(" · ")}</span></span>
      ${tonePill(c.result)}${c.score != null ? html`<span class="cand-score"><strong>${c.score}</strong><small>/100</small></span>` : ""}
      ${icon("chevron-down", { cls: "icon-sm cand-caret" })}</summary>
    <div class="cand-body">
      ${c.components.length ? html`<div class="bars" style="margin-bottom:var(--s-4)">${c.components.map((x) => html`<div class="bar-row">
        <span>${x.name}</span><span class="bar-track" title="${x.why}"><span class="bar-fill" style="width:${(100 * x.points) / x.weight}%"></span></span>
        <span class="bar-val">${x.points}<span class="muted" style="font-weight:400">/${x.weight}</span></span></div>
        <p class="small muted" style="margin:-4px 0 4px">${x.why}</p>`)}</div>` : ""}
      <ul class="checks">${c.hard.map((h) => html`<li>${check(h.pass, h.soft)}<div><strong>${h.rule}</strong> <span class="muted">— ${h.why}</span>
        ${h.counterfactual && !h.pass ? html`<div class="small" style="margin-top:2px">${icon("arrow-right", { cls: "icon-xs" })} Would change if: ${h.counterfactual}</div>` : ""}</div></li>`)}</ul>
    </div></details>`;
}

function panel(entries) {
  if (!entries?.length) return "";
  const ids = [...new Map(entries.flatMap((e) => e.scores.map((x) => [x.user_id, x.name]))).entries()];
  return card("Panel scores", "users", html`
    ${table(["Startup", ...entries.map((e) => e.evaluator), "Average"], ids.map(([id, n]) => {
      const xs = entries.map((e) => e.scores.find((x) => x.user_id === id));
      const nums = xs.filter(Boolean).map((x) => x.score);
      return [n, ...xs.map((x) => x ? html`<strong>${x.score}</strong>${x.note ? html`<div class="small muted">${x.note}</div>` : ""}` : "—"),
        nums.length ? html`<strong>${Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)}</strong>` : "—"];
    }))}
    ${entries.filter((e) => e.dissent).map((e) => html`<div class="alert" style="margin:var(--s-3) var(--s-5)">${icon("circle-help")}<div><div class="alert-title">Dissent · ${e.evaluator}</div>${e.dissent}</div></div>`)}`,
    { flush: true, sub: "Each evaluator scored independently. The award is the Programme Administrator's, on the record." });
}

export function selection(b) {
  const p = b.passport;
  if (!p.risk && !p.screening && !p.startup) return null;
  const sc = p.screening;
  return html`<div class="stack-lg">
    ${p.risk && card("Risk envelope", "shield-check", kv([
      ["Users", p.risk.users], ["Systems", p.risk.systems], ["Data", p.risk.data],
      ["Write access", p.risk.allow_write === undefined ? "" : p.risk.allow_write ? "Allowed" : "Not allowed (read-only)"],
      ["Reversibility", p.risk.reversibility], ["Exit cost", p.risk.exit_cost], ["Planned start", p.risk.start_date && date(p.risk.start_date)],
      ["Total cap", p.risk.cap_inr && lakh(p.risk.cap_inr)], ["Relaxation", p.risk.relaxation],
    ]), { sub: "Binding: a startup that needs more access or more data than this is screened out." })}
    ${sc?.candidates ? html`<section class="stack">
      <div class="row-between"><h2 class="section-title" style="margin:0">Screening</h2>
        <span class="small muted">Weights: outcome fit ${sc.weights.outcome_fit} · evidence ${sc.weights.evidence} · data risk ${sc.weights.data_risk} · delivery ${sc.weights.delivery}</span></div>
      <p class="small muted">${sc.note}</p>
      ${sc.candidates.length ? sc.candidates.map((c, i) => candidate(c, p.startup?.user_id ? c.user_id === p.startup.user_id : i === 0))
        : html`<p class="muted">No startup accounts to screen.</p>`}</section>` : ""}
    ${Array.isArray(sc) ? card("Screening", "list-filter", table(["Applicant", "Result", "Why"], sc.map((s) => [html`<strong>${s.name}</strong>`, tonePill(s.result), html`<span class="small">${s.why}</span>`])),
      { flush: true, sub: "Every result carries its reason." }) : ""}
    ${p.evaluation?.scores ? card("Panel scores", "users", html`${table(["Startup", "Score", "Reason"], p.evaluation.scores.map((s) => [s.name, html`<strong>${s.total}</strong>`, html`<span class="small">${s.why}</span>`]))}
      ${p.evaluation.dissent ? html`<div class="alert" style="margin:var(--s-3) var(--s-5)">${icon("circle-help")}<div><div class="alert-title">Dissent</div>${p.evaluation.dissent}</div></div>` : ""}`,
      { flush: true, sub: p.evaluation.weights }) : ""}
    ${panel(p.evaluation?.panel)}
    ${p.startup && card(`Selected: ${p.startup.name}`, "rocket", kv([
      ["Contact", p.startup.contact], ["Location", p.startup.location],
      ["Match score", p.startup.match_score != null ? html`<strong>${p.startup.match_score}</strong>/100 · ${tonePill(p.startup.terms)}` : ""],
      ["Panel average", p.startup.panel_average != null ? `${p.startup.panel_average}/100` : ""],
      ["DPIIT", p.startup.verification?.dpiit], ["Udyam", p.startup.verification?.udyam], ["GST", p.startup.verification?.gst],
      ["Capability", p.startup.capability], ["Prior evidence", p.startup.prior_evidence],
      ["First government supplier", p.startup.first_government_supplier ? "Yes" : ""],
    ]))}
    ${p.design && card("Pilot design", "file-text", kv([
      ["Scope", p.design.scope], ["Sandbox", p.design.sandbox], ["Data access", p.design.data_access], ["IP", p.design.ip],
      ["Cybersecurity", p.design.cybersecurity], ["Pilot fee", p.design.fee_inr != null && lakh(p.design.fee_inr)],
    ]))}
  </div>`;
}

// ---- Delivery: milestones and evidence -----------------------------------------------------
export function delivery(b, me) {
  const p = b.passport;
  if (!p.milestones?.length) return null;
  const canDownload = me && me.role !== "public";
  return html`<div class="stack">${p.milestones.map((m) => {
    const ev = p.evidence.filter((e) => Number(e.milestone) === m.n);
    return html`<section class="card">
      <div class="card-header"><div class="row" style="gap:var(--s-3)"><span class="avatar" style="background:var(--accent-soft);color:var(--accent-text)">M${m.n}</span>
        <div><h2>${m.title}</h2><p class="card-sub">Due ${date(m.due)} · ${lakh(m.amount_inr)} · evidence expected: ${m.evidence_expected}</p></div></div>
        ${tonePill(m.state)}</div>
      ${ev.length ? html`<div class="card-body stack">${ev.map((e) => html`<div class="file-row">
        <span class="file-icon">${icon(e.file_id ? "file-text" : "file-check")}</span>
        <div class="grow"><div style="font-weight:500">${e.title}</div>
          <div class="small muted">${e.source}${e.bytes ? ` · ${bytes(e.bytes)}` : ""} · ${dateTime(e.submitted_at)}</div></div>
        ${hashChip(e.sha256, { label: "evidence hash" })}
        ${e.file_id && canDownload ? html`<a class="btn btn-sm" href="/api/evidence?id=${e.file_id}">${icon("download", { cls: "icon-sm" })}Download</a>` : ""}</div>`)}
        ${m.return_note ? html`<div class="alert alert-warning">${icon("rotate-ccw")}<div><div class="alert-title">Returned for more evidence</div>${m.return_note}</div></div>` : ""}</div>`
      : html`<div class="card-body small muted">No evidence submitted yet.</div>`}
    </section>`;
  })}</div>`;
}

// ---- Payments -------------------------------------------------------------------------------
export function payments(b, demo) {
  const p = b.passport;
  const due = (p.milestones ?? []).filter((m) => m.payment?.state !== "not due");
  if (!due.length) return null;
  const total = p.milestones.reduce((a, m) => a + Number(m.amount_inr), 0);
  const paid = p.milestones.filter((m) => /paid/.test(m.payment.state)).reduce((a, m) => a + Number(m.amount_inr), 0);
  return html`<div class="stack-lg">
    <section class="card card-body"><div class="row-between"><div><div class="stat-label">${icon("banknote", { cls: "icon-sm" })}Paid so far</div>
      <div class="stat-value">${lakh(paid)} <small>of ${lakh(total)}</small></div></div>
      <div style="flex:1 1 240px;max-width:420px"><div class="progress success"><span style="width:${total ? (100 * paid) / total : 0}%"></span></div>
        <p class="small muted" style="margin-top:6px">${demo ? "Scenario dates." : html`Payment is due ${p.milestones.find((m) => m.payment.sla_days)?.payment.sla_days ?? 30} days after a milestone is accepted (programme policy).`} No treasury or PFMS link.</p></div></div></section>
    ${card("Payment trace", "indian-rupee", table(["Milestone", "Amount", "Status", "Dates"],
      p.milestones.map((m, i) => {
        const y = m.payment, l = b.ledger?.[i];
        return [html`<strong>M${m.n}</strong><div class="small muted">${m.title}</div>`, lakh(m.amount_inr),
          html`<div class="stack" style="--g:4px">${tonePill(y.state)}${l && l.status !== "not due" ? html`<div>${tonePill(l.label, l.status === "overdue" ? "clock" : "")}</div>` : ""}
            ${l?.grievance ? html`<div class="small muted">Grievance open since ${date(l.grievance.opened_on)}; response due ${date(l.grievance.response_due)}${l.reason ? "" : " · no reason recorded"}</div>` : ""}
            ${y.delay_reason ? html`<div class="small muted">${y.delay_days ? `${y.delay_days} days late · ` : ""}${y.delay_reason}</div>` : ""}</div>`,
          y.packet_complete_on ? html`<div class="small nowrap">Packet ${date(y.packet_complete_on)}</div><div class="small nowrap">Due by ${date(y.expected_by)}</div>${y.paid_on ? html`<div class="small nowrap"><strong>Paid ${date(y.paid_on)}</strong></div>` : ""}` : html`<span class="muted">—</span>`];
      }), "responsive", "Payment trace"), { flush: true })}
  </div>`;
}

// ---- Validation -------------------------------------------------------------------------------
export function validation(b) {
  const { passport: p, challenge: c, record: r } = b;
  if (!p.validation) return null;
  const v = p.validation, met = v.kpis.every((k) => k.met);
  const points = trendPoints(b);
  return html`<div class="stack-lg">
    <div class="alert alert-${met ? "success" : "danger"}">${icon(met ? "badge-check" : "circle-x", { cls: "icon-lg" })}
      <div><div class="alert-title" style="font-size:var(--fs-lg)">${v.result}</div><div>${v.method}</div></div></div>
    ${card("Against the sealed criteria", "target", table(["KPI", "Baseline", "Achieved", "Target", "Result"],
      v.kpis.map((k) => [k.kpi, num(k.baseline), html`<strong>${num(k.achieved)}</strong>`, k.target, tonePill(k.met ? "met" : "missed", k.met ? "circle-check" : "circle-x")]), "", "Results against the sealed criteria"), { flush: true })}
    ${points.length > 1 ? card("KPI over time", "activity", trendChart({ points, baseline: c.baseline_value, target: targetOf(b),
      unit: c.kpi_unit, title: c.kpi_name })) : ""}
    ${card("Attestation", "stamp", kv([
      ["Effect", r.delta != null ? html`${num(r.delta)}${unit(c)}${r.ci_low != null ? html` <span class="muted">(95% CI ${num(r.ci_low)} to ${num(r.ci_high)})</span>` : ""}` : ""],
      ["Exceptions", v.exceptions], ["Attestation", v.attestation],
      ["Signed", (b.signatures ?? []).length ? html`${b.signatures.map((s) => html`<div>${s.signer_name}, ${s.signer_role} · ${dateTime(s.signed_at)}${s.dissent_note ? html`<div class="small muted">Dissent: ${s.dissent_note}</div>` : ""}</div>`)}` : ""],
    ]))}
  </div>`;
}

// The sealed target as a number, for the chart's reference line ("≤ 60" -> 60).
const targetOf = (b) => b.challenge.target_value ?? (Number(String(b.passport.criteria?.[0]?.target ?? "").replace(/[^\d.]/g, "")) || null);

// Real pilots: the sealed baseline, the validated result, then every adoption measurement.
// The demo's weekly readings already run from the start of the pilot to its result.
function trendPoints(b) {
  const readings = (b.readings ?? []).map((x) => ({ x: x.reading_date, y: Number(x.kpi_value), label: b.demo ? "Weekly reading" : "Measured after go-live" }));
  if (b.demo || !b.passport.seal) return readings;
  const validatedAt = b.audit.find((e) => e.detail?.to === "Independently validated")?.at;
  const v = b.passport.validation?.kpis?.[0];
  return [{ x: b.passport.seal.sealed_at, y: Number(b.challenge.baseline_value), label: "Baseline (sealed)" },
    ...(validatedAt && v ? [{ x: validatedAt, y: Number(v.achieved), label: "Validated" }] : []), ...readings]
    .sort((p, q) => String(p.x).localeCompare(String(q.x)));
}

// ---- Procurement -----------------------------------------------------------------------------
export function procurement(b) {
  const pr = b.passport.procurement;
  if (!pr) return null;
  return html`<div class="stack-lg">
    ${pr.accepted
      ? html`<div class="alert alert-success">${icon("scale", { cls: "icon-lg" })}<div><div class="alert-title" style="font-size:var(--fs-lg)">${pr.accepted.route}</div>
          <div>${pr.accepted.basis}${pr.accepted.next ? html` ${pr.accepted.next}` : ""}</div></div></div>`
      : html`<div class="alert alert-warning">${icon("book-open", { cls: "icon-lg" })}<div><div class="alert-title" style="font-size:var(--fs-lg)">No lawful route</div><div>${pr.outcome}</div></div></div>`}
    <div class="grid-2">
      ${card("Facts the rules read", "list-checks", html`<ul class="checks">${pr.facts.map((f) => html`<li>${icon("circle-dot", { cls: "icon-sm muted" })}<span>${f}</span></li>`)}</ul>`)}
      ${pr.accepted ? card("Approvals", "clipboard-check", html`<ul class="checks">${pr.approvals.map((a, i) => html`<li>
        ${i === 0 && pr.approved_by ? check(true) : icon("circle-dot", { cls: "icon-sm muted" })}<span>${a}${i === 0 && pr.approved_by ? html`<div class="small muted">${pr.approved_by}${pr.approved_at ? ` · ${dateTime(pr.approved_at)}` : ""}${pr.approval_note ? ` — ${pr.approval_note}` : ""}</div>` : ""}</span></li>`)}</ul>
        ${!pr.approved_by ? html`<p class="small muted" style="margin-top:var(--s-3)">Awaiting the department's route approval.</p>` : ""}`) : ""}
    </div>
    <section class="stack"><h2 class="section-title" style="margin:0">Routes not taken</h2>
      ${pr.rejected.map((x) => html`<div class="card card-body"><div class="row" style="margin-bottom:6px">${icon("ban", { cls: "text-danger" })}<strong>${x.route}</strong></div>
        <p class="small">${x.why}</p>${x.counterfactual ? html`<p class="small" style="margin-top:6px"><strong>Would change if:</strong> ${x.counterfactual}</p>` : ""}</div>`)}
      ${pr.counterfactual ? html`<div class="alert alert-info">${icon("info")}<div><div class="alert-title">Counterfactual</div>${pr.counterfactual}</div></div>` : ""}
      <p class="small muted">A rules table over the passport's own facts, not legal advice from a model.</p></section>
  </div>`;
}

// ---- Adoption and replication -----------------------------------------------------------------
export function adoption(b) {
  const { passport: p, challenge: c } = b;
  if (!p.deployment && !p.replication) return null;
  const d = p.deployment, a = p.adoption, rep = p.replication;
  const real = a?.measurements;
  const l = real ? a.latest : null;
  const VERDICT = { adopted: "success", "not adopted": "danger", "outcome not held": "warning" };
  return html`<div class="stack-lg">
    ${l ? html`<div class="alert alert-${VERDICT[l.verdict]}">${icon(l.verdict === "adopted" ? "gauge" : "triangle-alert", { cls: "icon-lg" })}
      <div><div class="alert-title" style="font-size:var(--fs-lg)">Latest verdict: ${l.verdict}</div><div>${l.why}</div></div></div>` : ""}
    ${d ? card("Deployment", "rocket", kv([["Order", d.order], ["Route", d.route], ["Sites", d.sites], ["Go-live", d.go_live && date(d.go_live)],
      ["Annual cost", d.annual_cost_inr != null && lakh(d.annual_cost_inr)], ["Staff to train", d.staff_to_train]])) : ""}
    ${real ? html`
      <div class="facts">${[["Baseline", l.outcome.baseline], ["Validated", l.outcome.validated ?? "—"], ["Now", l.outcome.now], ["Target", `${c.target_direction === "decrease" ? "≤" : "≥"} ${num(l.outcome.target)}`]]
        .map(([k, v]) => html`<div class="card fact"><div class="fact-label">${k}</div><div class="fact-value">${typeof v === "number" ? num(v) : v}<small>${unit(c)}</small></div></div>`)}</div>
      ${card("Measurements", "gauge", table(["Measured", "Days live", "Trained", "Weekly active", "Would keep", c.kpi_name, "Verdict"],
        a.measurements.map((m) => [date(m.measured_on), m.days_since_go_live, m.staff_trained, html`${m.weekly_active} <span class="muted">(${m.usage_pct}%)</span>`,
          m.survey ? html`${m.survey.would_keep}/${m.survey.respondents} <span class="muted">(${m.survey.would_keep_pct}%)</span>` : "—",
          html`${num(m.outcome.now)} ${m.outcome.held ? check(true) : check(false)}`, tonePill(m.verdict)]), "responsive"), { flush: true })}
      ${kv([["Drop-off", l.drop_off], ["Citizen impact", l.citizen_impact], ["Operational cost", l.operational_cost_inr != null && lakh(l.operational_cost_inr)], ["Unresolved risks", l.unresolved_risks]])}`
    : a ? card("Adoption", "gauge", kv([["Measured on", a.measured_on && date(a.measured_on)], ["Staff trained", a.staff_trained],
        ["Weekly active", a.weekly_active_staff != null && `${a.weekly_active_staff} (${a.usage_rate_pct}%)`], ["Drop-off", a.drop_off],
        ["Outcome held?", a.outcome_persistence], ["Citizen impact", a.citizen_impact], ["Operational cost", a.operational_cost_inr != null && lakh(a.operational_cost_inr)],
        ["Unresolved risks", a.unresolved_risks]])) : ""}
    ${rep ? card("Replication review", "route", kv([
      ["Decision", tonePill(rep.decision)], ["Basis", rep.basis],
      ["Reviewed by", rep.reviewed_by && `${rep.reviewed_by} · ${date(rep.reviewed_on)}`],
      ["Interested", (rep.interested ?? []).length ? html`${rep.interested.map((x) => html`<div>${x}</div>`)}` : ""],
      ["Reusable", Array.isArray(rep.reusable) ? rep.reusable.join(", ") : rep.reusable],
      ["Remaining risks", rep.remaining_risks], ["Next review", rep.next_review && date(rep.next_review)], ["Note", rep.note],
      ["Earlier reviews", (rep.history ?? []).slice(0, -1).map((h) => `${h.decision} · ${date(h.reviewed_on)}`).join("; ")],
    ]), { sub: "Another department can reuse this passport instead of starting from an unverified promise." }) : ""}
  </div>`;
}

// ---- Audit trail -----------------------------------------------------------------------------
export function audit(b) {
  const broken = b.chain.intact ? Infinity : b.chain.broken_at;
  const groups = [];
  b.audit.forEach((e, i) => {
    const day = dayKey(e.at);
    if (groups.at(-1)?.day !== day) groups.push({ day, items: [] });
    groups.at(-1).items.push([e, i]);
  });
  return html`<div class="stack-lg">
    <div class="alert alert-${b.chain.intact ? "success" : "danger"}">${icon(b.chain.intact ? "shield-check" : "triangle-alert", { cls: "icon-lg" })}
      <div><div class="alert-title">${b.chain.intact ? `Chain intact · ${plural(b.chain.events, "event")}` : `Chain broken at event ${b.chain.broken_at + 1}`}</div>
      <div>Each event's SHA-256 covers the event before it, and the database refuses edits to this log. Changing history breaks the chain.</div></div></div>
    <section class="card card-body"><ol class="timeline">${groups.map((g) => html`<li class="timeline-day">${g.day}</li>
      ${g.items.map(([e, i]) => html`<li class="tl-item ${i >= broken ? "broken" : ""}">
        <span class="avatar" aria-hidden="true">${initials(e.actor_name)}</span>
        <div><div class="tl-title">${e.action}</div>
          <div class="tl-meta"><span>${e.actor_role}</span><span>·</span><span>${e.actor_name}</span><span>·</span><time datetime="${e.at}">${dateTime(e.at)}</time>${hashChip(e.hash, { label: "event hash", n: 10 })}</div>
          <div class="tl-detail">
            ${e.detail?.from ? html`<span>${icon("arrow-right", { cls: "icon-xs" })} ${e.detail.from} → <strong>${e.detail.to}</strong></span>` : ""}
            ${e.detail?.seal ? html`<span class="row">Seal ${hashChip(e.detail.seal, { label: "seal" })}</span>` : ""}
            ${e.detail?.seal_recomputed ? html`<span class="row text-success">${icon("circle-check", { cls: "icon-xs" })} Recomputed seal matched ${hashChip(e.detail.seal_recomputed, { label: "seal" })}</span>` : ""}
            ${e.detail?.recomputed ? html`<span class="text-danger">Sealed ${e.detail.sealed?.slice(0, 12)}… ≠ recomputed ${e.detail.recomputed.slice(0, 12)}…</span>` : ""}
            ${(e.detail?.evidence ?? []).map((x) => html`<span class="row">${icon("file-check", { cls: "icon-xs" })} ${x.title} ${hashChip(x.sha256, { label: "evidence hash" })}</span>`)}
            ${e.detail?.note && !e.detail?.step ? html`<span class="muted">${e.detail.note}</span>` : ""}
          </div></div></li>`)}`)}</ol></section>
  </div>`;
}

export const TABS = [
  { id: "overview", label: "Overview", render: overview, always: true },
  { id: "selection", label: "Selection", render: selection, state: "Criteria sealed" },
  { id: "delivery", label: "Delivery", render: delivery, state: "Pilot active" },
  { id: "payments", label: "Payments", render: payments, state: "Pilot active" },
  { id: "validation", label: "Validation", render: validation, state: "Independently validated" },
  { id: "procurement", label: "Procurement", render: procurement, state: "Procurement-ready" },
  { id: "adoption", label: "Adoption", render: adoption, state: "Deployed" },
  { id: "audit", label: "Audit trail", render: audit, always: true },
];
export { toneOf };
