// The public programme dashboard: every pilot, by stage; results against each pilot's own
// baseline; adoption; routes. Filters and CSV export work on the anonymous rows /api/programme
// publishes (department and district, never a startup or a person).
import { html, render } from "../core/html.js";
import { api } from "../core/api.js";
import { num, plural } from "../core/format.js";
import { page, bindRetry } from "../ui/shell.js";
import { icon } from "../ui/icons.js";
import { STATES, LEARNING, tonePill } from "../ui/pills.js";
import { skeletonPage, empty, errorState } from "../ui/states.js";
import { downloadCsv } from "../ui/csv.js";

const { main } = await page({ active: "programme", auth: "optional", title: "Programme dashboard", crumbs: [{ label: "Programme" }, { label: "Dashboard" }] });
const f = { dept: "", district: "", samples: true };
let data;

async function load() {
  render(main, skeletonPage());
  try { data = await api("/api/programme"); }
  catch (err) { render(main, errorState(err)); bindRetry(main, load); return; }
  paint();
}

const keep = (r) => (f.samples || !r.sample) && (!f.dept || r.department === f.dept) && (!f.district || r.district === f.district);
const signed = (v) => (v == null ? "" : `${v > 0 ? "+" : ""}${num(v, 1)}%`);

function paint() {
  const pilots = data.pilots.filter(keep);
  const results = data.dashboard.results.filter(keep);
  const pay = data.payments.filter(keep);
  const paid = pay.filter((p) => p.status === "paid on time" || p.status === "paid late");
  const onTime = paid.filter((p) => p.status === "paid on time").length;
  const validated = pilots.filter((p) => p.met !== null), met = pilots.filter((p) => p.met);
  const measured = pilots.filter((p) => p.verdict), adopted = pilots.filter((p) => p.verdict === "adopted");
  const byState = [...STATES, LEARNING].map((s) => ({ s, n: pilots.filter((p) => p.state === s).length }));
  const max = Math.max(1, ...byState.map((x) => x.n));
  const routes = Object.entries(pilots.reduce((m, p) => (p.route ? ((m[p.route] = (m[p.route] ?? 0) + 1), m) : m), {}));
  const depts = [...new Set(data.pilots.map((p) => p.department))].sort();
  const districts = [...new Set(data.pilots.map((p) => p.district).filter(Boolean))].sort();

  render(main, html`
    <div class="page-head"><div><h1>Programme dashboard</h1>
      <p class="lede">Every pilot in the programme, from challenge to replication. Public; no startup or personal names. As of ${data.as_of}.</p></div>
      <div class="page-actions"><button class="btn" type="button" id="csv">${icon("download", { cls: "icon-sm" })}Export CSV</button></div></div>
    ${data.sample_pilots ? html`<div class="alert alert-info" style="margin-bottom:var(--s-4)">${icon("info")}<div>Includes ${plural(data.sample_pilots, "sample pilot")}: fictional, seeded to show the programme at work, and marked <span class="chip">Sample</span>. Untick “Include samples” to see only real pilots.</div></div>` : ""}
    <section class="card" style="margin-bottom:var(--s-5)"><div class="toolbar">
      <label class="sr-only" for="dept">Department</label><select class="select" id="dept"><option value="">All departments</option>${depts.map((d) => html`<option ${d === f.dept ? html`selected` : ""}>${d}</option>`)}</select>
      <label class="sr-only" for="district">District</label><select class="select" id="district"><option value="">All districts</option>${districts.map((d) => html`<option ${d === f.district ? html`selected` : ""}>${d}</option>`)}</select>
      <label class="check small"><input type="checkbox" id="samples" ${f.samples ? html`checked` : ""}>Include samples</label>
      <span class="small muted push">${plural(pilots.length, "pilot")} shown</span>
    </div></section>

    ${pilots.length ? html`
    <div class="stats" style="margin-bottom:var(--s-6)">${[
      ["Pilots", pilots.length, "", "flask-conical"],
      ["Met their sealed criteria", met.length, `of ${validated.length} validated`, "badge-check"],
      ["Adopted after go-live", adopted.length, `of ${measured.length} measured`, "gauge"],
      ["Ready to replicate", pilots.filter((p) => p.state === "Replication-ready").length, "", "route"],
      ["Learning records", pilots.filter((p) => p.state === LEARNING).length, "", "book-open"],
      ["Paid within the window", paid.length ? `${Math.round((100 * onTime) / paid.length)}%` : "—", paid.length ? `of ${plural(paid.length, "payment")}` : "", "indian-rupee"],
    ].map(([l, v, sub, i]) => html`<div class="card stat"><div class="stat-label">${icon(i, { cls: "icon-sm" })}${l}</div><div class="stat-value">${v}</div>${sub && html`<div class="stat-foot">${sub}</div>`}</div>`)}</div>

    <div class="grid-2" style="margin-bottom:var(--s-6)">
      <section class="card" aria-labelledby="pipe-title"><div class="card-header"><div><h2 id="pipe-title">${icon("activity")}Where every pilot is now</h2><p class="card-sub">Pilots by passport stage.</p></div></div>
        <div class="card-body"><div class="bars" role="img" aria-label="${byState.map((x) => `${x.s}: ${x.n}`).join("; ")}">${byState.map((x) => html`<div class="bar-row" title="${x.s}: ${plural(x.n, "pilot")}">
          <span class="small">${x.s}</span><span class="bar-track"><span class="bar-fill" style="width:${(100 * x.n) / max}%;${x.s === LEARNING ? "background:var(--warning)" : ""}"></span></span><span class="bar-val">${x.n}</span></div>`)}</div></div></section>
      <section class="card" aria-labelledby="route-title"><div class="card-header"><div><h2 id="route-title">${icon("scale")}How validated pilots were bought</h2><p class="card-sub">Routes compiled from each pilot's facts and approved by its department.</p></div></div>
        <div class="card-body">${routes.length ? html`<div class="bars">${routes.sort((a, b) => b[1] - a[1]).map(([name, n]) => html`<div class="bar-row"><span class="small">${name}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${(100 * n) / Math.max(...routes.map((x) => x[1]))}%"></span></span><span class="bar-val">${n}</span></div>`)}</div>`
          : html`<p class="muted small">No pilot has reached procurement yet.</p>`}
          <p class="small muted" style="margin-top:var(--s-4)">Tier 1 needs the state's deeming Government Resolution, which is not in force; Tier 2 needs two or more validated winners.</p></div></section>
    </div>

    <section class="card" aria-labelledby="results-title"><div class="card-header"><div><h2 id="results-title">${icon("target")}Results against baseline</h2>
      <p class="card-sub">Change toward each pilot's own sealed target, as a share of its baseline: positive is better, whichever way the KPI moves.</p></div></div>
      ${results.length ? html`<div class="table-wrap" tabindex="0" role="region" aria-label="Results against baseline"><table class="table responsive">
        <thead><tr><th>Department</th><th>KPI</th><th class="num">Baseline</th><th class="num">Target</th><th class="num">Validated</th><th class="num">Now</th><th class="num">Weekly use</th><th>Stage</th></tr></thead>
        <tbody>${results.map((r) => html`<tr>
          <td class="primary" data-label="Department"><div class="cell"><span class="cell-title">${r.department}</span><span class="cell-sub">${r.district ?? ""}</span></div></td>
          <td data-label="KPI"><div class="cell"><span>${r.kpi} <span class="muted">(${r.unit})</span></span>${r.sample ? html`<span class="chip">Sample</span>` : ""}</div></td>
          <td class="num" data-label="Baseline"><div class="cell">${num(r.baseline)}</div></td>
          <td class="num" data-label="Target"><div class="cell">${r.direction === "decrease" ? "≤" : "≥"} ${num(r.target)}</div></td>
          <td class="num" data-label="Validated"><div class="cell"><strong>${num(r.validated)}</strong><span class="small ${r.validated_gain_pct > 0 ? "text-success" : "text-danger"}">${signed(r.validated_gain_pct)}</span></div></td>
          <td class="num" data-label="Now"><div class="cell">${r.now != null ? html`<strong>${num(r.now)}</strong><span class="small ${r.now_gain_pct > 0 ? "text-success" : "text-danger"}">${signed(r.now_gain_pct)}</span>` : html`<span class="muted">—</span>`}</div></td>
          <td class="num" data-label="Weekly use"><div class="cell">${r.usage_pct != null ? html`${r.usage_pct}%${r.verdict ? html`${tonePill(r.verdict)}` : ""}` : html`<span class="muted">—</span>`}</div></td>
          <td data-label="Stage"><div class="cell">${tonePill(r.state)}</div></td></tr>`)}</tbody></table></div>`
      : html`<div class="card-body muted small">No pilot in this view has reached validation yet.</div>`}</section>
    <p class="small muted" style="margin-top:var(--s-4)">How promptly departments pay: <a href="/programme/payments">the payments ledger</a>.</p>`
    : html`<div class="card">${empty({ icon: "flask-conical", title: "No pilots in this view", body: "Change the filters, or include the sample pilots." })}</div>`}`);

  main.querySelector("#dept").addEventListener("change", (e) => { f.dept = e.target.value; paint(); });
  main.querySelector("#district").addEventListener("change", (e) => { f.district = e.target.value; paint(); });
  main.querySelector("#samples").addEventListener("change", (e) => { f.samples = e.target.checked; paint(); });
  main.querySelector("#csv").addEventListener("click", () => downloadCsv(`programme-results-${data.as_of}.csv`,
    ["department", "district", "kpi", "unit", "baseline", "direction", "target", "validated", "validated_gain_pct", "now", "now_gain_pct", "weekly_use_pct", "verdict", "stage", "route", "sample"],
    results.map((r) => [r.department, r.district, r.kpi, r.unit, r.baseline, r.direction, r.target, r.validated, r.validated_gain_pct, r.now, r.now_gain_pct, r.usage_pct, r.verdict, r.state, r.route, r.sample])));
}

load();
