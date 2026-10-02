// Every pilot the signed-in user can see. Search, filters and sort live in the URL, so a
// filtered view can be shared or bookmarked.
import { html, render } from "../core/html.js";
import { pilots } from "../core/store.js";
import { ago, plural } from "../core/format.js";
import { page, bindRetry } from "../ui/shell.js";
import { icon } from "../ui/icons.js";
import { statePill, miniProgress, STATES, LEARNING } from "../ui/pills.js";
import { skeleton, empty, errorState } from "../ui/states.js";

const { user, main } = await page({ active: "pilots", title: "Pilots", crumbs: [{ label: "Pilots" }] });
const canCreate = user.role === "department" && !user.is_demo;
const params = new URLSearchParams(location.search);
const state = { q: params.get("q") ?? "", stage: params.get("stage") ?? "", dept: params.get("dept") ?? "",
  district: params.get("district") ?? "", mine: params.get("mine") === "1", sort: params.get("sort") ?? "activity" };
let rows = [];

render(main, html`<div class="page-head"><div><h1>Pilots <span class="muted" id="count" style="font-weight:500"></span></h1>
  <p class="lede">${user.is_demo ? "The fictional sample pilots, read-only." : "Every pilot and its Evidence Passport, most recently active first."}</p></div>
  <div class="page-actions">${canCreate && html`<a class="btn btn-primary" href="/pilots/new">${icon("plus", { cls: "icon-sm" })}New challenge</a>`}</div></div>
  <section class="card"><div class="toolbar">
    <div class="search">${icon("search")}<input class="input" id="q" type="search" placeholder="Search KPI, outcome, startup…" aria-label="Search pilots" value="${state.q}"></div>
    <label class="sr-only" for="stage">Stage</label><select class="select" id="stage"></select>
    <label class="sr-only" for="dept">Department</label><select class="select" id="dept"></select>
    <label class="sr-only" for="district">District</label><select class="select" id="district"></select>
    <label class="check small"><input type="checkbox" id="mine" ${state.mine ? html`checked` : ""}>Waiting on me</label>
    <span class="row push"><label class="small muted" for="sort">Sort</label>
      <select class="select" id="sort">
        ${[["activity", "Last activity"], ["newest", "Newest"], ["stage", "Furthest along"], ["kpi", "KPI (A–Z)"]].map(([v, l]) => html`<option value="${v}" ${state.sort === v ? html`selected` : ""}>${l}</option>`)}
      </select></span>
  </div>
  <div id="list">${skeleton(6)}</div></section>`);

const $ = (id) => main.querySelector(`#${id}`);
const options = (values, all, current) => html`<option value="">${all}</option>${values.map((v) => html`<option value="${v}" ${v === current ? html`selected` : ""}>${v}</option>`)}`;

async function load() {
  try { rows = await pilots(); }
  catch (err) { render($("list"), errorState(err)); bindRetry(main, () => { render($("list"), skeleton(6)); load(); }); return; }
  const uniq = (k) => [...new Set(rows.map((r) => r[k]).filter(Boolean))].sort();
  render($("stage"), options([...STATES, LEARNING].filter((s) => rows.some((r) => r.passport_state === s)), "All stages", state.stage));
  render($("dept"), options(uniq("department"), "All departments", state.dept));
  render($("district"), options(uniq("district"), "All districts", state.district));
  paint();
}

const rank = (s) => (s === LEARNING ? STATES.length : STATES.indexOf(s));
const SORTS = {
  activity: (a, b) => String(b.last_activity ?? "").localeCompare(String(a.last_activity ?? "")),
  newest: (a, b) => String(b.created_at).localeCompare(String(a.created_at)),
  stage: (a, b) => rank(b.passport_state) - rank(a.passport_state),
  kpi: (a, b) => a.kpi_name.localeCompare(b.kpi_name),
};

function paint() {
  const q = state.q.trim().toLowerCase();
  const shown = rows.filter((r) =>
    (!q || [r.kpi_name, r.outcome_statement, r.department, r.district, r.startup].some((v) => String(v ?? "").toLowerCase().includes(q)))
    && (!state.stage || r.passport_state === state.stage) && (!state.dept || r.department === state.dept)
    && (!state.district || r.district === state.district) && (!state.mine || r.my_actions.length)).sort(SORTS[state.sort] ?? SORTS.activity);

  $("count").textContent = rows.length ? `· ${shown.length === rows.length ? rows.length : `${shown.length} of ${rows.length}`}` : "";
  const filtered = q || state.stage || state.dept || state.district || state.mine;
  if (!rows.length) {
    render($("list"), empty({ icon: "flask-conical", title: "No pilots yet",
      body: canCreate ? "Create the first challenge: describe the problem, measure the baseline, and set the target." : "Pilots appear here once a department creates a challenge.",
      actions: canCreate ? html`<a class="btn btn-primary" href="/pilots/new">${icon("plus", { cls: "icon-sm" })}New challenge</a>` : "" }));
    return;
  }
  if (!shown.length) {
    render($("list"), empty({ icon: "list-filter", title: "No pilots match", body: "Try a different search or clear the filters.",
      actions: filtered ? html`<button class="btn" type="button" id="clear">Clear filters</button>` : "" }));
    $("clear")?.addEventListener("click", clear);
    return;
  }
  render($("list"), html`<div class="table-wrap"><table class="table responsive">
    <thead><tr><th>Challenge</th><th>Department</th><th>Startup</th><th>Stage</th><th>Next</th><th class="num">Activity</th></tr></thead>
    <tbody>${shown.map((r) => html`<tr class="clickable" data-href="/pilots/${r.id}">
      <td class="primary" data-label="Challenge" style="min-width:240px"><div class="cell"><div><a class="cell-title" href="/pilots/${r.id}">${r.kpi_name}</a>
        ${r.sample ? html` <span class="chip">Sample</span>` : ""}</div><div class="cell-sub">${r.outcome_statement}</div></div></td>
      <td data-label="Department"><div class="cell"><span>${r.department}</span><span class="cell-sub">${r.district ?? ""}</span></div></td>
      <td data-label="Startup"><div class="cell">${r.startup ?? html`<span class="muted">—</span>`}</div></td>
      <td data-label="Stage"><div class="cell">${statePill(r.passport_state)}
        <span class="row small muted" style="gap:6px">${miniProgress(r.passport_state)}${r.step ? `${r.step}/10` : ""}</span></div></td>
      <td data-label="Next"><div class="cell">${r.my_actions.length
        ? html`<span class="pill tone-accent">${icon("arrow-right")}${r.my_actions[0].label}</span>`
        : r.waiting_on.length ? html`<span class="small muted">Waiting on ${r.waiting_on.join(", ")}</span>` : html`<span class="small muted">—</span>`}
        ${r.overdue ? html`<span class="pill tone-danger">${icon("clock")}${plural(r.overdue, "payment")} overdue</span>` : ""}</div></td>
      <td class="num small muted nowrap" data-label="Activity" title="${r.last_activity ?? ""}"><div class="cell">${ago(r.last_activity)}</div></td></tr>`)}</tbody></table></div>`);
  $("list").querySelectorAll("tr[data-href]").forEach((tr) => tr.addEventListener("click", (e) => { if (!e.target.closest("a, button")) location.href = tr.dataset.href; }));
}

function sync() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.stage) p.set("stage", state.stage);
  if (state.dept) p.set("dept", state.dept);
  if (state.district) p.set("district", state.district);
  if (state.mine) p.set("mine", "1");
  if (state.sort !== "activity") p.set("sort", state.sort);
  history.replaceState(null, "", `${location.pathname}${p.size ? `?${p}` : ""}`);
  paint();
}
function clear() {
  Object.assign(state, { q: "", stage: "", dept: "", district: "", mine: false });
  $("q").value = ""; $("stage").value = ""; $("dept").value = ""; $("district").value = ""; $("mine").checked = false;
  sync();
}

$("q").addEventListener("input", (e) => { state.q = e.target.value; sync(); });
for (const k of ["stage", "dept", "district", "sort"]) $(k).addEventListener("change", (e) => { state[k] = e.target.value; sync(); });
$("mine").addEventListener("change", (e) => { state.mine = e.target.checked; sync(); });
load();
