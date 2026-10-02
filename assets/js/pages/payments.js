// The public payments ledger: per department, how promptly accepted milestones were paid
// against the programme's payment window. Built from anonymous rows, so it can drop the
// sample pilots and export what it shows.
import { html, render } from "../core/html.js";
import { api } from "../core/api.js";
import { lakh, plural } from "../core/format.js";
import { page, bindRetry } from "../ui/shell.js";
import { icon } from "../ui/icons.js";
import { skeletonPage, empty, errorState } from "../ui/states.js";
import { downloadCsv } from "../ui/csv.js";

const { main } = await page({ active: "payments", auth: "optional", title: "Payments ledger", crumbs: [{ label: "Programme" }, { label: "Payments ledger" }] });
let data, samples = true;

async function load() {
  render(main, skeletonPage());
  try { data = await api("/api/programme"); }
  catch (err) { render(main, errorState(err)); bindRetry(main, load); return; }
  paint();
}

const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

function aggregate(rows) {
  const by = new Map();
  for (const r of rows) {
    const d = by.get(r.department) ?? { department: r.department, accepted: 0, paid: 0, on_time: 0, late: 0, overdue: 0, on_track: 0, paid_inr: 0, days: [] };
    d.accepted++;
    if (r.status === "paid on time" || r.status === "paid late") {
      d.paid++; d.paid_inr += r.amount_inr; d[r.status === "paid late" ? "late" : "on_time"]++;
      if (r.days_to_pay != null) d.days.push(r.days_to_pay);
    } else if (r.status === "overdue") d.overdue++; else d.on_track++;
    by.set(r.department, d);
  }
  return [...by.values()].map((d) => ({ ...d, median: median(d.days), pct: d.paid ? Math.round((100 * d.on_time) / d.paid) : null }))
    .sort((a, b) => a.department.localeCompare(b.department));
}

function paint() {
  const rows = data.payments.filter((r) => samples || !r.sample);
  const deps = aggregate(rows);
  const all = aggregate(rows.map((r) => ({ ...r, department: "All" })))[0];
  render(main, html`
    <div class="page-head"><div><h1>Payments ledger</h1>
      <p class="lede">How promptly departments pay startups for accepted milestones, against a ${data.sla_days}-day payment window. ${data.sla_basis} Public; no startup names. As of ${data.as_of}.</p></div>
      <div class="page-actions"><button class="btn" type="button" id="csv">${icon("download", { cls: "icon-sm" })}Export CSV</button></div></div>
    <section class="card" style="margin-bottom:var(--s-5)"><div class="toolbar">
      <label class="check small"><input type="checkbox" id="samples" ${samples ? html`checked` : ""}>Include sample pilots</label>
      ${data.sample_pilots ? html`<span class="small muted">${plural(data.sample_pilots, "sample pilot")} in the programme; fictional.</span>` : ""}
    </div></section>
    ${all ? html`<div class="stats" style="margin-bottom:var(--s-6)">${[
      ["Paid within the window", all.pct != null ? `${all.pct}%` : "—", `${all.on_time} of ${plural(all.paid, "payment")}`, "circle-check"],
      ["Paid late", all.late, "after the window closed", "clock"],
      ["Overdue now", all.overdue, all.overdue ? "grievance clocks running" : "none", "triangle-alert"],
      ["Median days to pay", all.median ?? "—", "from a complete packet", "hourglass"],
      ["Paid in total", lakh(all.paid_inr), "", "indian-rupee"],
    ].map(([l, v, sub, i]) => html`<div class="card stat"><div class="stat-label">${icon(i, { cls: "icon-sm" })}${l}</div>
      <div class="stat-value ${l === "Overdue now" && all.overdue ? "text-danger" : ""}">${v}</div>${sub && html`<div class="stat-foot">${sub}</div>`}</div>`)}</div>
    <section class="card"><div class="card-header"><div><h2>${icon("building-2")}By department</h2><p class="card-sub">Accepted milestones only; a payment window starts when a milestone is accepted.</p></div></div>
      <div class="table-wrap" tabindex="0" role="region" aria-label="Payments by department"><table class="table responsive">
      <thead><tr><th>Department</th><th class="num">Accepted</th><th style="min-width:180px">Paid within the window</th><th class="num">Paid late</th><th class="num">Overdue now</th><th class="num">Median days</th><th class="num">Paid</th></tr></thead>
      <tbody>${deps.map((d) => html`<tr>
        <td class="primary" data-label="Department"><div class="cell"><span class="cell-title">${d.department}</span></div></td>
        <td class="num" data-label="Accepted"><div class="cell">${d.accepted}</div></td>
        <td data-label="Paid within the window"><div class="cell" style="min-width:150px">${d.paid ? html`<div class="row" style="gap:8px;width:100%"><span class="progress success" style="flex:1"><span style="width:${d.pct}%"></span></span><strong class="num">${d.pct}%</strong></div>
          <span class="small muted">${d.on_time} of ${d.paid}</span>` : html`<span class="muted">—</span>`}</div></td>
        <td class="num" data-label="Paid late"><div class="cell">${d.late}</div></td>
        <td class="num" data-label="Overdue now"><div class="cell">${d.overdue ? html`<strong class="text-danger">${d.overdue}</strong>` : 0}</div></td>
        <td class="num" data-label="Median days"><div class="cell">${d.median ?? "—"}</div></td>
        <td class="num" data-label="Paid"><div class="cell">${lakh(d.paid_inr)}</div></td></tr>`)}</tbody></table></div></section>`
    : html`<div class="card">${empty({ icon: "indian-rupee", title: "No payments yet", body: "Payments appear here once a department accepts a milestone." })}</div>`}`);
  main.querySelector("#samples").addEventListener("change", (e) => { samples = e.target.checked; paint(); });
  main.querySelector("#csv").addEventListener("click", () => downloadCsv(`payments-ledger-${data.as_of}.csv`,
    ["department", "accepted", "paid", "paid_within_window", "paid_late", "overdue_now", "median_days_to_pay", "paid_inr"],
    deps.map((d) => [d.department, d.accepted, d.paid, d.on_time, d.late, d.overdue, d.median, d.paid_inr])));
}

load();
