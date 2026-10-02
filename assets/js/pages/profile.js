// A startup's profile: what screening reads. Settings layout with a completeness meter and a
// save bar that appears when something changes.
import { html, render } from "../core/html.js";
import { api } from "../core/api.js";
import { dateTime } from "../core/format.js";
import { page, bindRetry } from "../ui/shell.js";
import { icon } from "../ui/icons.js";
import { input, textarea, select, checkbox, readForm, clearErrors, showError, busy } from "../ui/fields.js";
import { skeletonPage, empty, errorState, alert } from "../ui/states.js";
import { toast } from "../ui/toast.js";

const { user, main } = await page({ active: "profile", title: "Startup profile", crumbs: [{ label: "Startup profile" }] });

if (user.role !== "startup" || user.is_demo) {
  render(main, html`<div class="card" style="max-width:640px;margin:var(--s-8) auto">${empty({ icon: "rocket", title: "Profiles are for startup accounts",
    body: "A startup's profile is what screening reads when a department screens for a challenge." })}</div>`);
} else load();

// The parts of a profile screening leans on; the meter counts them.
const SIGNALS = [["capabilities", "What you do"], ["sectors", "Sectors"], ["data_needed", "Data you need"], ["prior_evidence", "Prior evidence"],
  ["prior_deployments", "Prior deployments"], ["dpiit_recognised", "DPIIT recognition"]];
const filled = (p) => SIGNALS.filter(([k]) => { const v = p?.[k]; return Array.isArray(v) ? v.length : k === "prior_deployments" ? Number(v) > 0 : !!v; });

async function load() {
  render(main, skeletonPage());
  let profile;
  try { ({ profile } = await api("/api/profile")); }
  catch (err) { render(main, errorState(err)); bindRetry(main, load); return; }
  const p = profile ?? { data_needed: "pseudonymised", prior_deployments: 0, gem_ratings: 0 };
  const list = (v) => (Array.isArray(v) ? v.join(", ") : v ?? "");

  render(main, html`<div class="page-head"><div><h1>Startup profile</h1>
      <p class="lede">${user.org ?? user.name}. Screening reads this when a department screens startups for a challenge. Registration details are self-declared and shown that way on every passport.</p></div></div>
    ${!profile ? html`<div style="margin-bottom:var(--s-4)">${alert("warning", { title: "Not filled in yet", body: "Until it is, screening rejects you with “No startup profile on file”." })}</div>` : ""}
    <div class="with-rail">
      <form id="profile" class="stack-lg" novalidate>
        <section class="card"><div class="card-header"><h2>${icon("rocket")}What you do</h2></div><div class="card-body">
          ${textarea({ name: "capabilities", label: "What your product does", required: true, rows: 4, value: p.capabilities,
            hint: "Plain words. Screening matches these against the challenge's outcome, KPI and definition." })}
          <div class="field-row" style="margin-top:var(--s-4)">${input({ name: "sectors", label: "Sectors", optional: true, value: list(p.sectors), placeholder: "Health, Urban services", hint: "Comma-separated." })}
            ${input({ name: "districts", label: "Districts served", optional: true, value: list(p.districts), placeholder: "Nagpur, Amravati", hint: "Leave empty if you work statewide." })}</div>
        </div></section>
        <section class="card"><div class="card-header"><div><h2>${icon("shield-check")}What a pilot would need</h2><p class="card-sub">Hard filters: needing more than a challenge's risk envelope allows screens you out of it.</p></div></div><div class="card-body">
          ${checkbox({ name: "needs_write_access", label: "We need to write to the department's systems", checked: p.needs_write_access })}
          <div class="field-row" style="margin-top:var(--s-4)">${select({ name: "data_needed", label: "Most sensitive data you need", required: true, value: p.data_needed,
              options: [["none", "None"], ["pseudonymised", "Pseudonymised"], ["personal", "Personal"]] })}
            ${input({ name: "available_from", label: "Available from", type: "date", optional: true, value: p.available_from ?? "" })}</div>
        </div></section>
        <section class="card"><div class="card-header"><div><h2>${icon("badge-check")}Registration and track record</h2><p class="card-sub">Self-declared until registry checks are integrated.</p></div></div><div class="card-body">
          ${checkbox({ name: "dpiit_recognised", label: "DPIIT-recognised (the GFR 173(i) relaxations apply)", checked: p.dpiit_recognised })}
          <div class="field-row" style="margin-top:var(--s-3)">${input({ name: "dpiit_number", label: "DPIIT certificate number", optional: true, value: p.dpiit_number })}</div>
          <div style="margin-top:var(--s-3)">${checkbox({ name: "udyam_registered", label: "Udyam-registered", checked: p.udyam_registered })}</div>
          <div class="field-row" style="margin-top:var(--s-4)">${input({ name: "prior_deployments", label: "Prior deployments", inputmode: "numeric", value: p.prior_deployments ?? 0 })}
            ${input({ name: "gem_ratings", label: "GeM buyer ratings", inputmode: "numeric", value: p.gem_ratings ?? 0, hint: "Three move a product to the full GeM catalogue." })}</div>
          ${textarea({ name: "prior_evidence", label: "Prior evidence", optional: true, rows: 3, value: p.prior_evidence,
            hint: "Measured results score higher than claims, e.g. “median wait down 41% over 90 days in two hospitals”." })}
        </div></section>
        <div class="save-bar" id="save-bar" hidden><span class="small">You have unsaved changes.</span>
          <span class="row"><button class="btn btn-ghost" type="button" id="revert">Discard</button><button class="btn btn-primary" type="submit" id="save">Save profile</button></span></div>
      </form>
      <aside class="rail"><section class="card" aria-labelledby="meter-title"><div class="card-header"><h2 id="meter-title">${icon("gauge")}Completeness</h2></div>
        <div class="card-body" id="meter"></div></section></aside>
    </div>`);

  const form = main.querySelector("#profile");
  const bar = main.querySelector("#save-bar");
  const snapshot = () => JSON.stringify(readForm(form));
  let saved = snapshot();
  const meter = () => {
    const d = readForm(form);
    d.sectors = d.sectors?.split(",").map((s) => s.trim()).filter(Boolean);
    const ok = filled(d);
    render(main.querySelector("#meter"), html`<div class="row-between"><strong class="stat-value" style="font-size:var(--fs-2xl);margin:0">${Math.round((100 * ok.length) / SIGNALS.length)}%</strong>
      <span class="small muted">${ok.length} of ${SIGNALS.length}</span></div>
      <div class="progress ${ok.length === SIGNALS.length ? "success" : ""}" style="margin:var(--s-3) 0"><span style="width:${(100 * ok.length) / SIGNALS.length}%"></span></div>
      <ul class="checks small">${SIGNALS.map(([k, l]) => html`<li>${ok.some(([x]) => x === k) ? html`<span class="text-success">${icon("circle-check", { cls: "icon-sm" })}</span>` : html`<span class="muted">${icon("circle-dot", { cls: "icon-sm" })}</span>`}<span>${l}</span></li>`)}</ul>
      ${profile?.updated_at ? html`<p class="small muted" style="margin-top:var(--s-3)">Last saved ${dateTime(profile.updated_at)}</p>` : ""}`);
  };
  meter();
  form.addEventListener("input", () => { bar.hidden = snapshot() === saved; meter(); });
  form.addEventListener("change", () => { bar.hidden = snapshot() === saved; meter(); });
  main.querySelector("#revert").addEventListener("click", () => load());
  addEventListener("beforeunload", (e) => { if (snapshot() !== saved) e.preventDefault(); });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(form);
    await busy(main.querySelector("#save"), async () => {
      try {
        ({ profile } = await api("/api/profile", { method: "POST", body: readForm(form) }));
        saved = snapshot();
        bar.hidden = true;
        toast("Profile saved. The next screening will use it.");
        meter();
      } catch (err) {
        if (!showError(form, err.message, err.field)) toast(err.message, { tone: "danger" });
      }
    });
  });
}
