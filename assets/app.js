// Shared by every page: calling the API, who is signed in, the nav bar, notifications.
window.App = (() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // GitHub Pages serves these files with no /api behind them.
  const STATIC_HOST = /(^|\.)leninjacobregi\.me$|\.github\.io$/.test(location.hostname);

  async function api(path, { method = "GET", body } = {}) {
    if (STATIC_HOST) throw new Error("this preview host has no backend.");
    const res = await fetch(path, {
      method, headers: body ? { "Content-Type": "application/json" } : {}, body: body && JSON.stringify(body),
    });
    if (!res.headers.get("content-type")?.includes("application/json")) throw new Error("the backend isn't reachable from this address.");
    const out = await res.json();
    if (!res.ok) { const e = new Error(out.error || "request failed"); e.status = res.status; e.body = out; throw e; }
    return out;
  }

  let me;
  async function user(refresh) {
    if (me === undefined || refresh) me = STATIC_HOST ? null : (await api("/api/auth").catch(() => ({ user: null }))).user;
    return me;
  }
  async function signInDemo(role) { me = (await api("/api/auth", { method: "POST", body: { action: "demo", role } })).user; nav(); return me; }
  async function signOut() { await api("/api/auth", { method: "POST", body: { action: "logout" } }); me = null; location.href = "login.html"; }

  const ROLE = { department: "Department Officer", admin: "Programme Administrator", startup: "Startup",
    evaluator: "Expert Evaluator", validator: "Independent Validator", finance: "Finance / Procurement Officer", public: "Public Viewer" };

  function nav() {
    let el = document.querySelector("nav.app");
    if (!el) { el = document.createElement("nav"); el.className = "app"; document.body.prepend(el); }
    el.innerHTML = `<a class="brand" href="pilots.html">GovStart Bridge</a>
      <a href="pilots.html">Pilots</a>
      ${me?.role === "department" && !me.is_demo ? '<a href="index.html">New challenge</a>' : ""}
      ${me?.role === "startup" && !me.is_demo ? '<a href="profile.html">My profile</a>' : ""}
      <a href="passport.html">Demo passport</a>
      <a href="dashboard.html">Dashboard</a>
      <a href="ledger.html">Payments ledger</a>
      <span class="me">${me ? `${esc(me.name)} · ${esc(ROLE[me.role])}${me.is_demo ? " (demo)" : ""} · <button class="link" id="signout">Sign out</button>`
                            : `<a href="login.html?next=${encodeURIComponent(location.pathname.slice(1) + location.search)}">Sign in</a>`}</span>`;
    el.querySelector("#signout")?.addEventListener("click", signOut);
  }

  function toast(msg) {
    let box = document.getElementById("toasts");
    if (!box) { box = document.createElement("div"); box.id = "toasts"; box.setAttribute("role", "status"); document.body.append(box); }
    const t = document.createElement("div");
    t.textContent = msg;
    box.append(t);
    setTimeout(() => t.remove(), 6000);
  }

  // Live audit events for one passport. Returns a function that stops listening.
  function watch(recordId, onEvent) {
    if (STATIC_HOST || !window.EventSource) return () => {};
    const es = new EventSource(`/api/events?record=${encodeURIComponent(recordId)}`);
    es.onmessage = (m) => { try { onEvent(JSON.parse(m.data)); } catch {} };
    return () => es.close();
  }

  return { esc, api, user, signInDemo, signOut, nav, toast, watch, ROLE, STATIC_HOST };
})();
