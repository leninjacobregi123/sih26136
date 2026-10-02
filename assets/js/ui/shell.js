// The frame every page sits in. Signed in: sidebar, top bar (search, notifications, user menu)
// and footer. Signed out: a public header. Pages call page() and render into the <main> it returns.
import "./behaviors.js";
import { html, render } from "../core/html.js";
import { api, signInUrl } from "../core/api.js";
import { currentUser, signOut } from "../core/session.js";
import { pilots } from "../core/store.js";
import { roleLabel } from "../core/roles.js";
import { ago, initials } from "../core/format.js";
import { icon } from "./icons.js";
import { popover } from "./popover.js";
import { themePref, setTheme } from "./theme.js";

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};

const footer = () => html`<footer class="site-footer">
  <span>Student prototype for Smart India Hackathon 2026 (SIH26136). Not an official Government of Maharashtra service.
    Demo and sample pilots are fictional.</span>
  <span class="row"><a href="/programme">Programme</a><a href="/programme/payments">Payments ledger</a><a href="/demo">Guided demo</a></span>
</footer>`;

const themeSwitch = () => {
  const pref = themePref();
  return html`<div class="segmented" role="radiogroup" aria-label="Theme">
    ${[["light", "Light", "sun"], ["dark", "Dark", "moon"], ["system", "System", "monitor"]].map(([v, l, i]) => html`<label>
      <input type="radio" name="theme" value="${v}" ${pref === v ? html`checked` : ""}><span>${icon(i, { cls: "icon-xs" })}${l}</span></label>`)}
  </div>`;
};

function wireTheme(root) {
  root.querySelectorAll('input[name="theme"]').forEach((r) => r.addEventListener("change", () => setTheme(r.value)));
}

const navItem = (href, label, name, active, extra = "") => html`<a class="nav-item" href="${href}" ${active ? html`aria-current="page"` : ""}>
  ${icon(name)}<span class="nav-text">${label}</span>${extra}</a>`;

function sidebar(user, active) {
  const dept = user.role === "department" && !user.is_demo;
  const startup = user.role === "startup" && !user.is_demo;
  return html`<aside class="sidebar" id="sidebar" aria-label="Main navigation">
    <a class="brand" href="/"><span class="brand-mark" aria-hidden="true">GB</span>
      <span class="brand-name">GovStart Bridge<small>Pilot register</small></span></a>
    <nav class="nav-group" aria-label="Work">
      <div class="nav-label">Work</div>
      ${navItem("/", "My work", "house", active === "home", html`<span class="count" id="work-count" hidden></span>`)}
      ${navItem("/pilots", "Pilots", "list-checks", active === "pilots")}
      ${dept && navItem("/pilots/new", "New challenge", "file-plus", active === "new")}
    </nav>
    <nav class="nav-group" aria-label="Programme">
      <div class="nav-label">Programme</div>
      ${navItem("/programme", "Dashboard", "chart-column", active === "programme")}
      ${navItem("/programme/payments", "Payments ledger", "indian-rupee", active === "payments")}
    </nav>
    <nav class="nav-group" aria-label="More">
      <div class="nav-label">More</div>
      ${startup && navItem("/profile", "Startup profile", "rocket", active === "profile")}
      ${navItem("/demo", "Guided demo", "circle-play", active === "demo")}
    </nav>
    <div class="sidebar-foot">
      <button class="nav-item desktop-only" type="button" id="collapse" style="border:0;background:none;width:100%" aria-label="Collapse the sidebar">
        ${icon("panel-left")}<span class="nav-text">Collapse</span></button>
      <p class="sidebar-note">Student prototype · SIH26136</p>
    </div>
  </aside>`;
}

function topbar(user, crumbs) {
  return html`<header class="topbar">
    <button class="btn btn-ghost btn-icon mobile-only" type="button" id="nav-toggle" aria-controls="sidebar" aria-expanded="false" aria-label="Open navigation">${icon("menu")}</button>
    <nav class="crumbs" aria-label="Breadcrumb" id="crumbs">${crumbTrail(crumbs)}</nav>
    <div class="topbar-tools">
      <div class="search popover-anchor" role="search">${icon("search")}
        <input class="input" id="search" type="search" role="combobox" placeholder="Search pilots" aria-label="Search pilots" autocomplete="off"
          aria-controls="search-results" aria-expanded="false" aria-autocomplete="list"><kbd aria-hidden="true">/</kbd>
        <div class="popover search-results" id="search-results" role="listbox" aria-label="Matching pilots" hidden></div>
      </div>
      <div class="popover-anchor">
        <button class="btn btn-ghost btn-icon" type="button" id="bell" aria-label="Recent activity" aria-expanded="false" aria-controls="feed">
          ${icon("bell")}<span class="bell-dot" id="bell-dot" hidden></span></button>
        <div class="popover feed" id="feed" hidden></div>
      </div>
      <div class="popover-anchor">
        <button class="user-btn" type="button" id="user-btn" aria-expanded="false" aria-controls="user-menu" aria-label="Account: ${user.name}">
          <span class="avatar" aria-hidden="true">${initials(user.name)}</span>${icon("chevron-down", { cls: "icon-sm" })}</button>
        <div class="popover" id="user-menu" hidden>
          <div style="padding:8px 10px 10px"><div style="font-weight:600">${user.name}</div>
            <div class="row" style="margin-top:6px"><span class="pill tone-accent">${roleLabel(user.role)}</span>${user.is_demo && html`<span class="pill tone-warning">Demo account</span>`}</div>
            ${!user.is_demo && user.email && html`<div class="small muted" style="margin-top:6px">${user.email}</div>`}</div>
          <div class="menu-sep"></div>
          <div class="menu-label">Theme</div><div style="padding:4px 8px 8px">${themeSwitch()}</div>
          <div class="menu-sep"></div>
          ${user.role === "startup" && !user.is_demo && html`<a class="menu-item" href="/profile">${icon("rocket")}Startup profile</a>`}
          <button class="menu-item" type="button" id="sign-out">${icon("log-out")}Sign out</button>
        </div>
      </div>
    </div>
  </header>`;
}

const crumbTrail = (crumbs) => crumbs.map((c, i) => i === crumbs.length - 1
  ? html`<span aria-current="page">${c.label}</span>`
  : html`<a href="${c.href}">${c.label}</a>${icon("chevron-right")}`);

function banners(user) {
  if (!user?.is_demo) return "";
  return html`<div class="banner info no-print">${icon("info")}<span>You're using a <b>demo account</b> (${roleLabel(user.role)}). It can drive the
    <a href="/demo">guided demo</a> and read the fictional sample pilots; it can't see or change real pilots.</span></div>`;
}

// ---- search: pilots by KPI, outcome, department, district, startup -------------------------
function wireSearch(root) {
  const input = root.querySelector("#search");
  const box = root.querySelector("#search-results");
  let hits = [], active = -1;
  const show = (open) => { box.hidden = !open; input.setAttribute("aria-expanded", String(open)); };
  const paint = () => {
    render(box, hits.length
      ? hits.map((p, i) => html`<a class="search-hit ${i === active ? "active" : ""}" href="/pilots/${p.id}" id="hit-${i}" role="option" aria-selected="${i === active}">
          <span>${p.kpi_name}</span><small>${p.department}${p.district ? ` · ${p.district}` : ""} · ${p.passport_state}</small></a>`)
      : html`<div class="search-hit" role="option" aria-disabled="true" aria-selected="false"><small>No pilots match.</small></div>`);
    input.setAttribute("aria-activedescendant", active >= 0 ? `hit-${active}` : "");
  };
  input.addEventListener("input", async () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { show(false); return; }
    const all = await pilots().catch(() => []);
    hits = all.filter((p) => [p.kpi_name, p.outcome_statement, p.department, p.district, p.startup, p.passport_state]
      .some((v) => String(v ?? "").toLowerCase().includes(q))).slice(0, 8);
    active = hits.length ? 0 : -1;
    paint(); show(true);
  });
  input.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % Math.max(hits.length, 1);
      paint();
    } else if (e.key === "Enter" && hits[active]) {
      location.href = `/pilots/${hits[active].id}`;
    } else if (e.key === "Escape") { show(false); input.blur(); }
  });
  document.addEventListener("click", (e) => { if (!root.querySelector(".search").contains(e.target)) show(false); });
}

// ---- recent activity -------------------------------------------------------------------
async function wireFeed(root) {
  const bell = root.querySelector("#bell"), box = root.querySelector("#feed"), dot = root.querySelector("#bell-dot");
  let items = [];
  const seen = () => store.get("feed-seen") || "";
  const paint = () => {
    const since = seen();
    render(box, html`<div class="menu-label">Recent activity</div>${items.length
      ? items.map((e) => html`<a class="feed-item ${e.at > since ? "unread" : ""}" href="/pilots/${e.record_id}#audit">
          <span>${e.action}</span><small>${e.kpi_name}${e.district ? ` · ${e.district}` : ""} · ${e.actor_role} · ${ago(e.at)}</small></a>`)
      : html`<div class="feed-item"><small>Nothing yet. Actions on pilots you can see appear here.</small></div>`}`);
    dot.hidden = !items.some((e) => e.at > since);
  };
  const load = async () => { items = (await api("/api/passports?feed=1").catch(() => ({ events: [] }))).events ?? []; paint(); };
  popover(bell, box, { onOpen: () => { paint(); if (items[0]) store.set("feed-seen", items[0].at); setTimeout(() => (dot.hidden = true), 0); } });
  await load();
  setInterval(() => { if (document.visibilityState === "visible") load(); }, 60000);
}

function wireNav(root) {
  const shell = root.querySelector(".shell");
  const toggle = root.querySelector("#nav-toggle");
  const setOpen = (open) => { shell.classList.toggle("nav-open", open); toggle.setAttribute("aria-expanded", String(open)); if (open) root.querySelector("#sidebar a")?.focus(); };
  toggle.addEventListener("click", () => setOpen(!shell.classList.contains("nav-open")));
  shell.addEventListener("click", (e) => { if (e.target === shell) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && shell.classList.contains("nav-open")) { setOpen(false); toggle.focus(); } });
  const collapse = root.querySelector("#collapse");
  const setCollapsed = (c) => { shell.classList.toggle("collapsed", c); collapse.setAttribute("aria-label", c ? "Expand the sidebar" : "Collapse the sidebar"); store.set("nav-collapsed", c ? "1" : ""); };
  setCollapsed(store.get("nav-collapsed") === "1");
  collapse.addEventListener("click", () => setCollapsed(!shell.classList.contains("collapsed")));
}

// ---- entry point ------------------------------------------------------------------------
// auth: "required" sends signed-out visitors to sign in; "optional" gives them the public header.
export async function page({ active, crumbs = [], auth = "required", title }) {
  if (title) document.title = `${title} · GovStart Bridge`;
  const user = await currentUser();
  if (!user && auth === "required") { location.replace(signInUrl()); await new Promise(() => {}); }
  const root = document.getElementById("app");
  if (user) {
    render(root, html`<a class="skip-link" href="#main">Skip to content</a>
      <div class="shell">${sidebar(user, active)}<div class="shell-main">${topbar(user, crumbs)}
        <div class="banners" id="banners">${banners(user)}</div>
        <main id="main" class="page" tabindex="-1"></main>${footer()}</div></div>
      <div class="toasts" id="toasts" role="status" aria-live="polite"></div>`);
    wireNav(root); wireSearch(root); wireTheme(root); wireFeed(root);
    popover(root.querySelector("#user-btn"), root.querySelector("#user-menu"));
    root.querySelector("#sign-out").addEventListener("click", signOut);
    pilots().then((rows) => {
      const n = rows.filter((p) => p.my_actions?.length).length;
      const c = root.querySelector("#work-count");
      c.hidden = !n; c.textContent = n; c.setAttribute("aria-label", `${n} waiting on you`);
    }).catch(() => {});
  } else {
    render(root, html`<a class="skip-link" href="#main">Skip to content</a>
      <header class="public-header"><div class="public-header-inner">
        <a class="brand" href="/"><span class="brand-mark" aria-hidden="true">GB</span><span class="brand-name">GovStart Bridge<small>Pilot register</small></span></a>
        <nav class="public-nav" aria-label="Main">
          <a href="/programme" class="hide-sm" ${active === "programme" ? html`aria-current="page"` : ""}>Programme</a>
          <a href="/programme/payments" class="hide-sm" ${active === "payments" ? html`aria-current="page"` : ""}>Payments</a>
          <a href="/demo" ${active === "demo" ? html`aria-current="page"` : ""}>Guided demo</a>
        </nav>
        <div class="topbar-tools">
          <div class="popover-anchor"><button class="btn btn-ghost btn-icon" type="button" id="theme-btn" aria-label="Theme" aria-expanded="false" aria-controls="theme-menu">${icon("sun")}</button>
            <div class="popover" id="theme-menu" hidden><div class="menu-label">Theme</div><div style="padding:4px 8px 8px">${themeSwitch()}</div></div></div>
          ${active !== "sign-in" && html`<a class="btn btn-primary btn-sm" href="${signInUrl()}">${icon("log-in", { cls: "icon-sm" })}Sign in</a>`}
        </div>
      </div></header>
      <div class="banners" id="banners"></div>
      <main id="main" class="page" tabindex="-1"></main>${footer()}
      <div class="toasts" id="toasts" role="status" aria-live="polite"></div>`);
    wireTheme(root);
    popover(root.querySelector("#theme-btn"), root.querySelector("#theme-menu"));
  }
  return { user, main: root.querySelector("#main"), setCrumbs: (c) => { const el = root.querySelector("#crumbs"); if (el) render(el, crumbTrail(c)); } };
}

// The account changed under the page (the guided demo switches roles): refresh what the top
// bar shows without reloading.
export function updateUser(user) {
  const btn = document.getElementById("user-btn");
  if (!btn) return;
  btn.setAttribute("aria-label", `Account: ${user.name}`);
  btn.querySelector(".avatar").textContent = initials(user.name);
  const menu = document.getElementById("user-menu");
  const head = menu?.firstElementChild;
  if (head) render(head, html`<div style="font-weight:600">${user.name}</div>
    <div class="row" style="margin-top:6px"><span class="pill tone-accent">${roleLabel(user.role)}</span>${user.is_demo && html`<span class="pill tone-warning">Demo account</span>`}</div>`);
  const banner = document.getElementById("banners");
  if (banner) render(banner, banners(user));
}

// Pages call this when their data fails, with a retry that re-runs their load.
export function bindRetry(main, load) {
  main.querySelector("[data-retry]")?.addEventListener("click", load);
}
