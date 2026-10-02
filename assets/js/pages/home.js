// "/": a short landing page for visitors; "My work" for anyone signed in — what is waiting on
// them across every pilot, the numbers their role cares about, and what changed recently.
import { html, render } from "../core/html.js";
import { api } from "../core/api.js";
import { pilots } from "../core/store.js";
import { ROLES, roleLabel } from "../core/roles.js";
import { ago, plural } from "../core/format.js";
import { page, bindRetry } from "../ui/shell.js";
import { icon } from "../ui/icons.js";
import { statePill, miniProgress, STATES, LEARNING } from "../ui/pills.js";
import { skeletonPage, empty, alert, errorState } from "../ui/states.js";

const { user, main } = await page({ active: "home", auth: "optional", title: "Home", crumbs: [{ label: "My work" }] });
if (user) await myWork(); else await landing();

// ---- landing (signed out) -----------------------------------------------------------
async function landing() {
  render(main, html`
    <section class="hero">
      <span class="eyebrow">${icon("flask-conical", { cls: "icon-sm" })}Smart India Hackathon 2026 · SIH26136</span>
      <h1>Innovation pilots a department can trust, and buy.</h1>
      <p>GovStart Bridge keeps one record per pilot, the <strong>Pilot Evidence Passport</strong>: a sealed baseline, a controlled
        pilot, milestone evidence and payments, independent validation, a lawful route to purchase, and adoption measured after.</p>
      <div class="row" style="gap:var(--s-3);margin-top:var(--s-2)">
        <a class="btn btn-primary btn-lg" href="/demo">${icon("circle-play")}Try the guided demo</a>
        <a class="btn btn-lg" href="/programme">${icon("chart-column")}See the programme</a>
        <a class="btn btn-ghost btn-lg" href="/sign-in">Sign in</a>
      </div>
    </section>
    <section aria-labelledby="numbers-title" class="stack">
      <h2 id="numbers-title" class="section-title">The programme today</h2>
      <div id="numbers">${html`<div class="stats">${[1, 2, 3, 4].map(() => html`<div class="card stat"><span class="skeleton" style="width:60%"></span><span class="skeleton lg" style="margin-top:12px"></span></div>`)}</div>`}</div>
    </section>
    <section aria-labelledby="flow-title" class="stack" style="margin-top:var(--s-10)">
      <h2 id="flow-title" class="section-title">How a pilot moves</h2>
      <div class="flow">${[
        ["Seal the baseline", "The department measures the problem, sets a target, and the criteria are hashed and published before anyone is chosen."],
        ["Screen and award", "Hard filters bind, every score has its reason, and the panel decides. No opaque AI score picks the winner."],
        ["Evidence and payments", "Each milestone's evidence is hashed on upload; every payment is measured against a published payment window."],
        ["Validate independently", "The validator recomputes the seal first. Change a target after sealing and validation is refused, on the record."],
        ["Buy, then measure use", "A rules table shows the lawful route and what would open the others; adoption is measured after go-live."],
      ].map(([t, d]) => html`<div class="card flow-step"><h3>${t}</h3><p>${d}</p></div>`)}</div>
    </section>
    <section aria-labelledby="checked-title" class="stack" style="margin-top:var(--s-10)">
      <h2 id="checked-title" class="section-title">Checked, not claimed</h2>
      <div class="grid-3">${[
        ["fingerprint", "Sealed criteria", "SHA-256 over the baseline and target, kept with the challenge."],
        ["history", "Tamper-evident trail", "Every action hash-chained to the one before; the database refuses edits."],
        ["scale", "Lawful routes only", "Tier 1, 2 or 3 under the GFR, never an invented one; a missed result becomes a learning record."],
      ].map(([i, t, d]) => html`<div class="card card-body"><div class="row" style="margin-bottom:6px"><span class="file-icon">${icon(i)}</span><h3>${t}</h3></div><p class="muted small">${d}</p></div>`)}</div>
    </section>`);
  try {
    const p = await api("/api/programme");
    const d = p.dashboard;
    const paid = p.departments.reduce((a, x) => a + x.paid, 0), onTime = p.departments.reduce((a, x) => a + x.paid_on_time, 0);
    render(main.querySelector("#numbers"), html`<div class="stats">${[
      ["Pilots", d.pilots, "", "flask-conical"],
      ["Met their sealed criteria", d.met, ` of ${d.validated} validated`, "badge-check"],
      ["Adopted after go-live", d.adoption.adopted, ` of ${d.adoption.measured} measured`, "gauge"],
      ["Payments within the window", paid ? `${Math.round((100 * onTime) / paid)}%` : "—", "", "indian-rupee"],
    ].map(([l, v, sub, i]) => html`<div class="card stat"><div class="stat-label">${icon(i, { cls: "icon-sm" })}${l}</div>
      <div class="stat-value">${v}<small>${sub}</small></div></div>`)}</div>
      ${p.sample_pilots ? html`<p class="small muted" style="margin-top:var(--s-3)">${icon("info", { cls: "icon-xs" })} Includes ${plural(p.sample_pilots, "fictional sample pilot")}, seeded to show the programme at work.</p>` : ""}`);
  } catch {
    render(main.querySelector("#numbers"), html`<p class="muted">Programme numbers are unavailable right now.</p>`);
  }
}

// ---- my work (signed in) ------------------------------------------------------------
function greeting(u) {
  const h = new Date().getHours();
  const hello = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  // Demo accounts are named after a desk, not a person.
  if (u.is_demo) return hello;
  return `${hello}, ${String(u.name).replace(/\(.*?\)/g, "").trim().split(/\s+/)[0]}`;
}

async function myWork() {
  render(main, skeletonPage());
  let rows;
  try { rows = await pilots(); }
  catch (err) { render(main, errorState(err)); bindRetry(main, myWork); return; }

  let profileMissing = false;
  if (user.role === "startup" && !user.is_demo) {
    profileMissing = !(await api("/api/profile").catch(() => ({}))).profile;
  }
  const mine = rows.filter((r) => r.my_actions.length);
  const overdue = rows.reduce((a, r) => a + r.overdue, 0);
  const active = rows.filter((r) => ["Pilot active", "Evidence submitted"].includes(r.passport_state)).length;
  const done = rows.filter((r) => STATES.indexOf(r.passport_state) >= STATES.indexOf("Independently validated")).length;
  const learning = rows.filter((r) => r.passport_state === LEARNING).length;

  const stats = [
    ["Waiting on you", mine.length, "inbox", mine.length ? "text-accent" : ""],
    ...(["finance", "department", "admin"].includes(user.role) ? [["Payments overdue", overdue, "clock", overdue ? "text-danger" : ""]] : []),
    ["Pilots running", active, "activity", ""],
    ["Validated or further", done, "badge-check", ""],
    ...(learning ? [["Learning records", learning, "book-open", ""]] : []),
  ];

  render(main, html`
    <div class="page-head"><div>
      <h1>${greeting(user)}</h1>
      <p class="lede">${roleLabel(user.role)}${user.is_demo ? " · demo account" : ""}. ${ROLES[user.role]?.does}</p>
    </div>
    <div class="page-actions">
      ${user.role === "department" && !user.is_demo && html`<a class="btn btn-primary" href="/pilots/new">${icon("plus", { cls: "icon-sm" })}New challenge</a>`}
      <a class="btn" href="/pilots">${icon("list-checks", { cls: "icon-sm" })}All pilots</a>
    </div></div>

    ${user.is_demo && html`<div style="margin-bottom:var(--s-5)">${alert("info", { title: "You're in a demo account",
      body: html`Run the <a href="/demo">guided demo</a> to move a pilot through all sixteen steps yourself, or open any of the fictional sample pilots below. Nothing here touches real pilots.` })}</div>`}
    ${profileMissing && html`<div style="margin-bottom:var(--s-5)">${alert("warning", { title: "Complete your startup profile",
      body: html`Screening reads your profile to decide which challenges you can be awarded. <a href="/profile">Fill it in</a>.` })}</div>`}

    <div class="stats" style="margin-bottom:var(--s-6)">${stats.map(([l, v, i, cls]) => html`<div class="card stat">
      <div class="stat-label">${icon(i, { cls: "icon-sm" })}${l}</div><div class="stat-value ${cls}">${v}</div></div>`)}</div>

    <div class="grid-2" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)">
      <section class="card" aria-labelledby="queue-title">
        <div class="card-header"><h2 id="queue-title">${icon("inbox")}Waiting on you</h2>${mine.length ? html`<span class="count">${mine.length}</span>` : ""}</div>
        ${mine.length ? html`<div class="table-wrap"><table class="table responsive">
          <thead><tr><th>Pilot</th><th>What to do</th><th>Stage</th><th class="num">Updated</th></tr></thead>
          <tbody>${mine.map((r) => html`<tr class="clickable" data-href="/pilots/${r.id}">
            <td class="primary" data-label="Pilot"><div class="cell"><a class="cell-title" href="/pilots/${r.id}">${r.kpi_name}</a>
              <span class="cell-sub">${r.department}${r.district ? ` · ${r.district}` : ""}</span></div></td>
            <td data-label="What to do"><div class="cell">${r.my_actions.map((a) => html`<span class="row" style="gap:6px">${icon("arrow-right", { cls: "icon-xs text-accent" })}<span>${a.label}${a.milestones?.length ? ` (M${a.milestones.join(", M")})` : ""}</span></span>`)}
              ${r.overdue ? html`<span class="pill tone-danger">${icon("clock")}${plural(r.overdue, "payment")} overdue</span>` : ""}</div></td>
            <td data-label="Stage"><div class="cell">${statePill(r.passport_state)}</div></td>
            <td class="num small muted" data-label="Updated"><div class="cell">${ago(r.last_activity)}</div></td></tr>`)}</tbody></table></div>`
        : empty({ icon: "circle-check", title: "You're all caught up", body: user.is_demo
            ? "Demo accounts can't act on the sample pilots. The guided demo is where a demo role takes its turn."
            : "When a pilot needs something from you, it appears here.",
          actions: user.is_demo ? html`<a class="btn btn-primary" href="/demo">Run the guided demo</a>` : "" })}
      </section>

      <section class="card" aria-labelledby="recent-title">
        <div class="card-header"><h2 id="recent-title">${icon("history")}Recently updated</h2><a class="small" href="/pilots">All pilots</a></div>
        ${rows.length ? html`<ul style="list-style:none">${rows.slice(0, 7).map((r) => html`<li style="border-bottom:1px solid var(--border)">
          <a href="/pilots/${r.id}" class="search-hit" style="padding:12px var(--s-5);border-radius:0">
            <span class="row-between"><span class="cell-title truncate grow">${r.kpi_name}</span>${r.sample ? html`<span class="chip">Sample</span>` : ""}</span>
            <span class="row-between"><small>${r.district || r.department} · ${ago(r.last_activity)}</small>${miniProgress(r.passport_state)}</span></a></li>`)}</ul>`
        : empty({ icon: "flask-conical", title: "No pilots yet", body: user.role === "department" && !user.is_demo ? "Create the first challenge to start a pilot." : "Pilots appear here once a department creates one." })}
      </section>
    </div>`);

  main.querySelectorAll("tr[data-href]").forEach((tr) => tr.addEventListener("click", (e) => { if (!e.target.closest("a, button")) location.href = tr.dataset.href; }));
}
