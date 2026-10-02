// The passport's "Next step": the actions open to you as drawer forms (validated inline, with a
// confirm step for anything that can't be undone), what the pilot waits on from everyone else,
// and the guided demo's controls.
import { html, render } from "../../core/html.js";
import { api } from "../../core/api.js";
import { signInDemo } from "../../core/session.js";
import { updateUser } from "../../ui/shell.js";
import { roleLabel } from "../../core/roles.js";
import { lakh, date, num, bytes } from "../../core/format.js";
import { icon } from "../../ui/icons.js";
import { drawer, confirm } from "../../ui/dialog.js";
import { toast } from "../../ui/toast.js";
import { alert } from "../../ui/states.js";
import { input, textarea, select, choices, checkbox, readForm, clearErrors, showError, checkRequired, busy } from "../../ui/fields.js";

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);

// What each action is for, in one line, shown on the rail card.
const HELP = {
  verify_baseline: "Re-derive the baseline from its source and read the quality report before anything is published.",
  seal: "Hash the baseline, target and KPI with SHA-256 and publish the hash. After this, a change breaks the seal.",
  screen: "Set the risk envelope and screen every startup profile against it.",
  score: "Score the shortlist independently, from 0 to 100.",
  award: "Choose a startup that passed screening, and set the scope and paid milestones.",
  upload_evidence: "Upload the evidence for a milestone. It is hashed when it arrives.",
  review_milestone: "Look at the evidence and accept the milestone, or return it with a note.",
  record_payment: "Record a payment, or a delay and its reason, against the payment window.",
  attest: "Recompute the seal, then attest whether the sealed criteria were met.",
  compile_route: "Run the procurement rules over this pilot's facts.",
  approve_route: "Approve the lawful route the rules found.",
  record_deployment: "Record the purchase going live.",
  record_adoption: "Measure use and the KPI again. Repeat at 30, 60, 90 days.",
  replication_review: "Recommend replication, hold for another measurement, or close as a learning record.",
};
const ICON = { verify_baseline: "clipboard-check", seal: "lock", screen: "list-filter", score: "users", award: "badge-check", upload_evidence: "upload",
  review_milestone: "file-check", record_payment: "banknote", attest: "stamp", compile_route: "scale", approve_route: "circle-check",
  record_deployment: "rocket", record_adoption: "gauge", replication_review: "route" };

// ---- forms --------------------------------------------------------------------------------
const msOptions = (b, ns) => ns.map((n) => { const m = b.passport.milestones.find((x) => x.n === n); return [n, `M${n} · ${m?.title ?? ""}`]; });

const FORMS = {
  verify_baseline: (b, a) => ({
    title: "Verify the baseline", submit: "Mark the baseline verified",
    body: html`${textarea({ name: "result", label: "What you checked, and what you found", required: true, rows: 3,
        hint: `The baseline on record is ${num(b.challenge.baseline_value)} ${b.challenge.kpi_unit ?? ""} (${b.challenge.baseline_source}).` })}
      ${a.quality ? html`<div class="field"><div class="label">Quality report</div>
        ${a.quality.defects.length ? html`<ul class="stack" style="list-style:none">${a.quality.defects.map((d) => html`<li class="alert alert-warning">${icon("triangle-alert")}<div><div class="alert-title">${d.label}</div>${d.span ? html`“${d.span}” — ` : ""}${d.why}</div></li>`)}</ul>`
          : html`<div class="alert alert-success">${icon("circle-check")}<div>No findings.</div></div>`}</div>
        ${checkbox({ name: "quality_ack", required: true, label: html`I have read the quality report (${a.quality.defects.length} finding${a.quality.defects.length === 1 ? "" : "s"}). The findings are advisory; the notice can be published as it stands.` })}` : ""}`,
  }),
  screen: (b) => {
    const r = b.passport.risk ?? {};
    return {
      title: b.passport.screening ? "Screen again" : "Set the envelope and screen startups", submit: b.passport.screening ? "Screen again" : "Screen startups",
      sub: "The envelope binds: a startup needing more access or more data than this is screened out, with the reason.",
      body: html`${input({ name: "users", label: "Users affected", required: true, value: r.users, placeholder: "One OPD, staff only; no patient-facing change" })}
        ${input({ name: "systems", label: "Systems touched", required: true, value: r.systems, placeholder: "Registration and consultation timestamps" })}
        <div class="field-row">${choices({ name: "allow_write", legend: "System access", required: true, value: r.allow_write ? "yes" : "no",
          options: [["no", "Read-only"], ["yes", "Writes allowed", "Raises the risk class"]] })}
          ${select({ name: "data_class", label: "Most sensitive data allowed", required: true, value: r.data_class ?? "pseudonymised",
            options: [["none", "None"], ["pseudonymised", "Pseudonymised"], ["personal", "Personal (DPDP agreement)"]] })}</div>
        ${input({ name: "reversibility", label: "Reversibility", required: true, value: r.reversibility, placeholder: "Removed in a day; existing system untouched" })}
        ${input({ name: "exit_cost", label: "Exit cost", optional: true, value: r.exit_cost, placeholder: "Nil beyond the data deletion certificate" })}
        <div class="field-row">${input({ name: "cap_inr", label: "Total cap", required: true, prefix: "₹", inputmode: "numeric", value: r.cap_inr, hint: "In rupees." })}
          ${input({ name: "start_date", label: "Planned start", required: true, type: "date", value: r.start_date })}</div>`,
    };
  },
  score: (b, a) => ({
    title: "Score the shortlist", submit: "Submit scores",
    sub: "Score each startup independently. The match score is shown for reference; it isn't your score.",
    body: html`<div class="stack">${a.shortlist.map((c) => html`<div class="card card-body score-row" data-id="${c.id}">
        <div class="row-between"><strong>${c.name}</strong><span class="small muted">Match ${c.score}/100</span></div>
        <div class="field-row" style="margin-top:var(--s-3)">${input({ name: `score_${c.id}`, label: "Your score", required: true, suffix: "/ 100", inputmode: "numeric", value: c.mine?.score ?? "" })}
          ${input({ name: `note_${c.id}`, label: "Reason", optional: true, value: c.mine?.note ?? "" })}</div></div>`)}
      ${textarea({ name: "dissent", label: "Dissent", optional: true, rows: 2, hint: "Recorded with your scores, on the passport." })}</div>`,
    collect: (form, data) => ({ dissent: data.dissent, scores: a.shortlist.map((c) => ({ user_id: c.id, score: data[`score_${c.id}`], note: data[`note_${c.id}`] })) }),
  }),
  award: (b, a) => ({
    title: "Award the pilot", submit: "Review the award",
    sub: "Only startups that passed the hard filters can be chosen.",
    body: html`${select({ name: "startup_user_id", label: "Startup", required: true,
        options: a.startups.map((s) => [s.id, `${s.name} · match ${s.score}${s.panel != null ? ` · panel ${s.panel}` : ""}${s.terms === "standard terms" ? " · standard terms" : ""}`]) })}
      ${input({ name: "scope", label: "Scope", required: true, placeholder: "One district hospital OPD, 90 days, staff-facing only" })}
      ${input({ name: "data_access", label: "Data access", required: true, placeholder: "Pseudonymised timestamps only; read-only" })}
      ${input({ name: "ip", label: "IP terms", optional: true, placeholder: "Startup keeps product IP; the department keeps the data" })}
      <fieldset class="field" data-field="milestones" style="margin-top:var(--s-5)"><legend class="label">Paid milestones<span class="req" aria-hidden="true">*</span></legend>
        <div class="hint">Between 1 and 8. Payment falls due 30 days after each is accepted.</div>
        <div class="stack" id="ms-rows" style="margin-top:var(--s-3)">${[0, 1].map((i) => msRow(i))}</div>
        <div class="row-between" style="margin-top:var(--s-3)"><button class="btn btn-sm" type="button" id="ms-add">${icon("plus", { cls: "icon-sm" })}Add a milestone</button>
          <span class="small">Pilot fee <strong id="ms-total">₹0</strong></span></div>
        <div class="error-text" hidden></div></fieldset>`,
    wire: (form) => {
      const rows = form.querySelector("#ms-rows");
      const total = () => { const t = [...rows.querySelectorAll('[name$=".amount_inr"]')].reduce((s, el) => s + (Number(el.value) || 0), 0); form.querySelector("#ms-total").textContent = lakh(t); };
      form.querySelector("#ms-add").addEventListener("click", () => {
        const n = rows.children.length;
        if (n >= 8) return;
        rows.insertAdjacentHTML("beforeend", String(msRow(n)));
        rows.lastElementChild.querySelector("input").focus();
      });
      rows.addEventListener("click", (e) => { const rm = e.target.closest("[data-remove]"); if (rm && rows.children.length > 1) { rm.closest(".ms-card").remove(); renumber(rows); total(); } });
      rows.addEventListener("input", total);
    },
    collect: (form, data) => ({ startup_user_id: data.startup_user_id, scope: data.scope, data_access: data.data_access, ip: data.ip,
      milestones: [...form.querySelectorAll(".ms-card")].map((card, i) => ({ title: data[`milestones.${i}.title`], evidence_expected: data[`milestones.${i}.evidence_expected`],
        due: data[`milestones.${i}.due`], amount_inr: data[`milestones.${i}.amount_inr`] })) }),
    confirm: (data) => ({ title: "Award this pilot?", confirmLabel: "Award the pilot",
      body: html`<p>The award is recorded with its design and ${data.milestones.length} paid milestone${data.milestones.length === 1 ? "" : "s"} (${lakh(data.milestones.reduce((s, m) => s + (Number(m.amount_inr) || 0), 0))}).
        The startup can then submit evidence. This can't be undone.</p>` }),
  }),
  upload_evidence: (b, a) => ({
    title: "Submit evidence", submit: "Upload and hash",
    body: html`${select({ name: "milestone", label: "Milestone", required: true, options: msOptions(b, a.milestones.map((m) => m.n)) })}
      ${input({ name: "title", label: "What this is", required: true, placeholder: "Access-log extract, days 1–20" })}
      <div class="field" data-field="file"><span class="label">File<span class="req" aria-hidden="true">*</span></span>
        <label class="dropzone" id="drop">${icon("upload", { cls: "icon-lg" })}<span><strong>Choose a file</strong> or drop it here</span>
          <span class="small muted">PDF, image, CSV, text, JSON, Excel or Word · up to 3 MB</span>
          <input type="file" name="file" id="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.txt,.json,.xlsx,.docx"></label>
        <div id="file-info"></div><div class="error-text" hidden></div></div>`,
    wire: (form) => {
      const drop = form.querySelector("#drop"), file = form.querySelector("#file");
      const show = async () => {
        const f = file.files[0];
        if (!f) return;
        const hash = await sha256(f);
        form.dataset.hash = hash;
        render(form.querySelector("#file-info"), html`<div class="file-row" style="margin-top:var(--s-2)"><span class="file-icon">${icon("file-text")}</span>
          <div class="grow"><div style="font-weight:500">${f.name}</div><div class="small muted">${bytes(f.size)} · SHA-256 ${hash.slice(0, 16)}… (computed here)</div></div></div>`);
      };
      file.addEventListener("change", show);
      ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
      ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove("over")));
      drop.addEventListener("drop", (e) => { e.preventDefault(); if (e.dataTransfer.files.length) { file.files = e.dataTransfer.files; show(); } });
    },
    collect: async (form, data) => {
      const f = form.querySelector("#file").files[0];
      if (!f) throw Object.assign(new Error("choose a file"), { field: "file" });
      if (f.size > 3 * 1024 * 1024) throw Object.assign(new Error("files are limited to 3 MB"), { field: "file" });
      const mime = Object.values(MIME).includes(f.type) ? f.type : MIME[f.name.split(".").pop().toLowerCase()];
      if (!mime) throw Object.assign(new Error("that file type isn't accepted"), { field: "file" });
      return { milestone: data.milestone, title: data.title, filename: f.name, mime, data: await base64(f), _hash: await sha256(f) };
    },
  }),
  review_milestone: (b, a) => {
    const files = (n) => b.passport.evidence.filter((e) => Number(e.milestone) === Number(n));
    return {
      title: "Review a milestone", submit: "Record the decision",
      body: html`${select({ name: "milestone", label: "Milestone", required: true, options: msOptions(b, a.milestones.map((m) => m.n)) })}
        <div id="evidence-list" class="field"></div>
        ${choices({ name: "decision", legend: "Decision", required: true, options: [["accept", "Accept", "Completes the payment packet; the payment window starts."], ["return", "Return for more evidence", "Needs a note saying what is missing."]] })}
        ${textarea({ name: "note", label: "Note", optional: true, rows: 2, hint: "Required when returning." })}`,
      wire: (form) => {
        const paint = () => render(form.querySelector("#evidence-list"), html`<div class="label">Evidence submitted</div>${files(form.milestone.value).map((e) => html`<div class="file-row">
          <span class="file-icon">${icon("file-text")}</span><div class="grow"><div style="font-weight:500">${e.title}</div><div class="small muted">${e.source} · ${date(e.submitted_at)} · SHA-256 ${e.sha256.slice(0, 12)}…</div></div>
          ${e.file_id ? html`<a class="btn btn-sm" href="/api/evidence?id=${e.file_id}">${icon("download", { cls: "icon-sm" })}Open</a>` : ""}</div>`)}`);
        form.milestone.addEventListener("change", paint);
        paint();
      },
    };
  },
  record_payment: (b, a) => {
    const m0 = b.passport.milestones.find((m) => m.n === a.milestones[0]?.n);
    return {
      title: "Record a payment", submit: "Record",
      body: html`${select({ name: "milestone", label: "Milestone", required: true, options: a.milestones.map((x) => {
          const m = b.passport.milestones.find((y) => y.n === x.n);
          return [x.n, `M${x.n} · ${lakh(m.amount_inr)} · due by ${date(m.payment.expected_by)}${m.payment.state === "delayed" ? " · delayed" : ""}`];
        }) })}
        ${choices({ name: "outcome", legend: "Outcome", required: true, options: [["paid", "Paid"], ["delayed", "Delayed", "The reason stays on the record and the public ledger counts it."]] })}
        <div class="field-row">${input({ name: "paid_on", label: "Paid on", type: "date", value: today(), attrs: html`max="${today()}" min="${m0?.payment.packet_complete_on ?? ""}"` })}</div>
        ${input({ name: "delay_reason", label: "Delay reason", optional: true, hint: "Required when delayed." })}`,
    };
  },
  attest: (b) => ({
    title: "Validate and attest", submit: "Review the attestation",
    sub: "The seal is recomputed first. If the criteria changed after sealing, this is refused and the refusal is logged.",
    body: html`${input({ name: "achieved", label: `Achieved: ${b.challenge.kpi_name}`, required: true, inputmode: "decimal", suffix: b.challenge.kpi_unit || "",
        hint: `Baseline ${num(b.challenge.baseline_value)}; sealed target ${b.passport.criteria[0]?.target}.` })}
      ${textarea({ name: "method", label: "Method", required: true, rows: 3, placeholder: "How the achieved value was measured and compared" })}
      ${textarea({ name: "exceptions", label: "Exceptions", optional: true, rows: 2 })}
      ${textarea({ name: "dissent", label: "Dissent", optional: true, rows: 2 })}`,
    confirm: (data) => ({ title: "Sign this attestation?", confirmLabel: "Sign",
      body: html`<p>You attest that <strong>${b.challenge.kpi_name}</strong> reached <strong>${data.achieved} ${b.challenge.kpi_unit ?? ""}</strong> against a sealed target of ${b.passport.criteria[0]?.target}.
        Your signature is recorded with the passport and can't be withdrawn.</p>` }),
  }),
  compile_route: () => ({
    title: "Compile the procurement route", submit: "Compile",
    sub: "A rules table over this pilot's facts: every route considered, why each is open or closed, and what would change it.",
    body: html`${choices({ name: "same_department", legend: "Is the buyer the department that ran the pilot?", required: true, options: [["yes", "Yes"], ["no", "No, another department"]] })}
      ${choices({ name: "scale_up", legend: "Will it spread to other departments or districts?", required: true, options: [["yes", "Yes"], ["no", "No"]] })}`,
    confirm: () => ({ title: "Compile the route?", confirmLabel: "Compile", body: html`<p>The route is compiled once, from these facts, and recorded. If no lawful route is open, the pilot closes as a learning record.</p>` }),
  }),
  approve_route: (b) => ({
    title: "Approve the procurement route", submit: "Approve",
    body: html`<div class="alert alert-success">${icon("scale")}<div><div class="alert-title">${b.passport.procurement?.accepted?.route}</div>${b.passport.procurement?.accepted?.basis}</div></div>
      ${textarea({ name: "note", label: "Note", optional: true, rows: 2 })}`,
    confirm: () => ({ title: "Approve this route?", confirmLabel: "Approve", body: html`<p>Approval puts the route on the record against the evidence that justified it. Nothing is ordered automatically.</p>` }),
  }),
  record_deployment: () => ({
    title: "Record the deployment", submit: "Record",
    body: html`${input({ name: "order_reference", label: "Order reference", required: true, placeholder: "GeM order number" })}
      ${input({ name: "sites", label: "Sites", required: true, placeholder: "District hospital OPD, Nagpur" })}
      <div class="field-row">${input({ name: "go_live", label: "Go-live", required: true, type: "date", attrs: html`max="${today()}"` })}
        ${input({ name: "staff_to_train", label: "Staff to train", required: true, inputmode: "numeric" })}</div>
      ${input({ name: "annual_cost_inr", label: "Annual cost", required: true, prefix: "₹", inputmode: "numeric" })}`,
  }),
  record_adoption: (b) => ({
    title: "Record an adoption measurement", submit: "Record",
    sub: `Below ${b.adoption_threshold_pct ?? 50}% weekly use, a validated pilot counts as not adopted.`,
    body: html`${input({ name: "measured_on", label: "Measured on", required: true, type: "date", value: today(), attrs: html`max="${today()}" min="${b.passport.deployment?.go_live ?? ""}"` })}
      <div class="field-row">${input({ name: "staff_trained", label: "Staff trained", required: true, inputmode: "numeric" })}
        ${input({ name: "weekly_active", label: "Weekly active staff", required: true, inputmode: "numeric" })}</div>
      ${input({ name: "kpi_value", label: `${b.challenge.kpi_name} now`, required: true, inputmode: "decimal", suffix: b.challenge.kpi_unit || "", hint: "Same definition as the baseline." })}
      <div class="field-row">${input({ name: "survey_respondents", label: "Staff surveyed", optional: true, inputmode: "numeric", value: "0" })}
        ${input({ name: "survey_would_keep", label: "…who would keep it", optional: true, inputmode: "numeric", value: "0" })}</div>
      ${input({ name: "drop_off", label: "Drop-off", optional: true, placeholder: "Who uses it least, and why" })}
      ${input({ name: "citizen_impact", label: "Citizen impact", optional: true })}
      ${input({ name: "operational_cost_inr", label: "Operational cost per year", optional: true, prefix: "₹", inputmode: "numeric" })}
      ${input({ name: "unresolved_risks", label: "Unresolved risks", optional: true })}`,
  }),
  replication_review: (b, a) => {
    const ok = a.latest?.verdict === "adopted";
    return {
      title: "Review for replication", submit: "Review the decision",
      body: html`${alert(ok ? "success" : "warning", { title: `Latest measurement: ${a.latest?.verdict}`, body: a.latest?.why })}
        <div style="margin-top:var(--s-4)">${choices({ name: "decision", legend: "Decision", required: true, options: [
          ["replicate", "Recommend replication", ok ? "Another department can reuse this passport." : "Needs an adopted verdict.", !ok],
          ["hold", "Hold for another measurement", "Needs a review date."], ["learning record", "Close as a learning record", "Tested and recorded, not spread."]] })}</div>
        ${textarea({ name: "interested", label: "Interested departments", optional: true, rows: 2, hint: "One per line." })}
        ${choices({ name: "reusable", legend: "What another department can reuse", type: "checkbox",
          options: ["Baseline method", "Sealed KPIs", "Risk envelope", "Validator method", "Exit annexure", "Milestone plan"].map((x) => [x, x]) })}
        ${input({ name: "remaining_risks", label: "Remaining risks", optional: true })}
        ${input({ name: "next_review", label: "Next review", type: "date", optional: true, hint: "Required when holding.", attrs: html`min="${addDays(today(), 1)}"` })}
        ${textarea({ name: "note", label: "Note", optional: true, rows: 2 })}`,
      confirm: (data) => ({ title: "Record this review?", confirmLabel: "Record", body: html`<p>Decision: <strong>${data.decision}</strong>. ${data.decision === "learning record" ? "The pilot closes as a learning record." : data.decision === "replicate" ? "The passport becomes replication-ready." : "The pilot stays under review."}</p>` }),
    };
  },
};

const msRow = (i) => html`<div class="card card-body ms-card" data-i="${i}">
  <div class="row-between" style="margin-bottom:var(--s-2)"><strong class="ms-label">Milestone ${i + 1}</strong>
    <button class="btn btn-ghost btn-sm" type="button" data-remove aria-label="Remove milestone ${i + 1}">${icon("x", { cls: "icon-sm" })}</button></div>
  ${input({ name: `milestones.${i}.title`, label: "Title", required: true, placeholder: "Sandbox provisioned, baseline re-measured" })}
  ${input({ name: `milestones.${i}.evidence_expected`, label: "Evidence expected", required: true, placeholder: "Independent baseline study" })}
  <div class="field-row">${input({ name: `milestones.${i}.due`, label: "Due", required: true, type: "date" })}
    ${input({ name: `milestones.${i}.amount_inr`, label: "Amount", required: true, prefix: "₹", inputmode: "numeric" })}</div></div>`;

function renumber(rows) {
  [...rows.children].forEach((card, i) => {
    card.dataset.i = i;
    card.querySelector(".ms-label").textContent = `Milestone ${i + 1}`;
    card.querySelectorAll("[data-field]").forEach((f) => { f.dataset.field = f.dataset.field.replace(/^milestones\.\d+\./, `milestones.${i}.`); });
    card.querySelectorAll("[name]").forEach((el) => { el.name = el.name.replace(/^milestones\.\d+\./, `milestones.${i}.`); });
  });
}

const MIME = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", csv: "text/csv", txt: "text/plain",
  json: "application/json", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
async function sha256(file) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const base64 = (file) => new Promise((ok, no) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(",")[1] ?? "");
  r.onerror = () => no(r.error);
  r.readAsDataURL(file);
});

// Opens the drawer for one action; resolves with the new bundle once it's done.
async function openAction(ctx, a) {
  const b = ctx.bundle;
  if (a.name === "seal") {
    const ok = await confirm({ title: "Seal and publish the success criteria?", confirmLabel: "Seal and publish",
      body: html`<p>The baseline, target and KPI are hashed with SHA-256 and the hash is published. After this, changing any of them breaks the seal, and the validator will refuse to attest.</p>
        <div class="alert alert-info" style="margin-top:var(--s-3)">${icon("lock")}<div>${b.passport.criteria.map((k) => html`<div><strong>${k.kpi}</strong>: ${num(k.baseline)} ${k.unit} → ${k.target}</div>`)}</div></div>` });
    if (ok) await run(ctx, { action: "seal" }, "Sealed. The criteria are published.");
    return;
  }
  const spec = FORMS[a.name](b, a);
  const dlg = drawer({ title: spec.title, sub: spec.sub, submit: spec.submit, body: html`<div id="form-error"></div>${spec.body}` });
  const form = dlg.querySelector("form");
  spec.wire?.(form);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(form);
    render(form.querySelector("#form-error"), "");
    if (!checkRequired(form)) return;
    const submitBtn = form.querySelector('button[type="submit"]');
    await busy(submitBtn, async () => {
      let body;
      try { body = spec.collect ? await spec.collect(form, readForm(form)) : readForm(form); }
      catch (err) { if (!showError(form, err.message, err.field)) render(form.querySelector("#form-error"), alert("danger", { body: err.message })); return; }
      if (spec.confirm) {
        const c = spec.confirm(body);
        if (!(await confirm({ ...c, body: c.body }))) return;
      }
      const hash = body._hash;
      delete body._hash;
      try {
        const out = await post(ctx, { action: a.name, ...body });
        dlg.close();
        if (a.name === "upload_evidence") {
          const match = out.files?.some((f) => f.sha256 === hash);
          toast(match ? "Uploaded. The server's SHA-256 matches the one computed in your browser." : "Uploaded.", { tone: "success" });
        } else toast(`Done: ${out.audit?.at(-1)?.action ?? spec.title}.`);
        ctx.update(out);
      } catch (err) {
        if (err.status === 409 && err.body?.passport) { dlg.close(); toast(err.message, { tone: "danger", timeout: 9000 }); ctx.update(err.body); return; }
        if (!showError(form, err.message, err.field)) render(form.querySelector("#form-error"), alert("danger", { body: err.message }));
      }
    });
  });
}

async function run(ctx, body, done) {
  try { const out = await post(ctx, body); toast(done); ctx.update(out); }
  catch (err) { toast(err.message, { tone: "danger", timeout: 9000 }); if (err.body?.passport) ctx.update(err.body); }
}
const post = (ctx, body) => api("/api/passports", { method: "POST", body: { id: ctx.id, ...body } });

// ---- the rail card ------------------------------------------------------------------------
export function nextStepCard(ctx) {
  const b = ctx.bundle, me = ctx.user;
  const mine = b.actions ?? [];
  const others = (b.pending ?? []).filter((p) => !mine.some((m) => m.name === p.action) || p.role !== me?.role);
  const done = b.record.passport_state === "Replication-ready" || b.record.passport_state === "Learning record";
  return html`<section class="card" aria-labelledby="next-title">
    <div class="card-header"><h2 id="next-title">${icon("arrow-right")}Next step</h2></div>
    <div class="card-body stack">
      ${mine.map((a) => html`<div class="next-action"><div class="row" style="gap:10px;align-items:flex-start">
        <span class="file-icon">${icon(ICON[a.name] ?? "circle-dot")}</span><div class="grow"><strong>${a.label}</strong>
        ${a.milestones?.length ? html`<span class="small muted"> · M${a.milestones.map((m) => m.n).join(", M")}</span>` : ""}
        <p class="small muted" style="margin-top:2px">${HELP[a.name] ?? ""}</p></div></div>
        <button class="btn btn-primary btn-block" type="button" data-action="${a.name}" style="margin-top:var(--s-3)">${a.label}</button></div>`)}
      ${mine.length && others.length ? html`<hr style="margin:var(--s-2) 0">` : ""}
      ${others.length ? html`<div><div class="small muted" style="margin-bottom:6px">${mine.length ? "Also waiting on" : "Waiting on"}</div>
        <ul class="checks">${others.map((p) => html`<li>${icon("hourglass", { cls: "icon-sm muted" })}<span><strong>${p.role_label}</strong> · ${p.label}${p.milestones?.length ? ` (M${p.milestones.join(", M")})` : ""}</span></li>`)}</ul></div>` : ""}
      ${!mine.length && !others.length ? html`<p class="small muted">${done
        ? b.record.passport_state === "Learning record" ? "Closed as a learning record: tested, recorded, not bought or spread." : "Complete: ready for another department to replicate."
        : b.sample ? "A sample pilot: read-only." : "Nothing is waiting on anyone right now."}</p>` : ""}
      ${b.sample ? html`<p class="small muted">${icon("info", { cls: "icon-xs" })} Sample pilots are read-only; the forms don't open.</p>` : ""}
    </div></section>`;
}

export function bindNextStep(root, ctx) {
  root.querySelectorAll("[data-action]").forEach((btn) => btn.addEventListener("click", () => {
    const a = ctx.bundle.actions.find((x) => x.name === btn.dataset.action);
    if (a) openAction(ctx, a);
  }));
}

// ---- guided demo controls -----------------------------------------------------------------
export function demoCard(ctx) {
  const d = ctx.bundle, me = ctx.user;
  if (!d.loaded) return html`<section class="card demo-card"><div class="card-body stack">
    <div class="row">${icon("circle-play")}<strong>Guided demo</strong></div>
    <p class="small muted">Load the scenario to start a district-hospital OPD pilot at Draft, then play each role in turn.</p>
    <button class="btn btn-primary btn-block" type="button" data-demo="load">${icon("play", { cls: "icon-sm" })}Load the demo scenario</button></div></section>`;
  const n = d.next;
  const mine = me?.is_demo && n && me.role === n.role;
  return html`<section class="card demo-card" aria-labelledby="demo-title">
    <div class="card-header"><h2 id="demo-title">${icon("circle-play")}Guided demo</h2><span class="small muted">${n ? `Step ${n.step} of ${d.total_steps}` : "Complete"}</span></div>
    <div class="card-body stack">
      <div class="progress"><span style="width:${(100 * ((n ? n.step - 1 : d.total_steps))) / d.total_steps}%"></span></div>
      ${n ? html`<div><div class="small muted">Next · ${roleLabel(n.role)}</div><strong>${n.action}</strong>
          <div class="small muted">as it will read in the audit trail</div>
          <p class="small" style="margin-top:6px">${n.note}</p></div>
        ${mine ? html`<button class="btn btn-primary btn-block" type="button" data-demo="advance">${icon("skip-forward", { cls: "icon-sm" })}Advance</button>`
          : html`<button class="btn btn-primary btn-block" type="button" data-demo="switch" data-role="${n.role}">${icon("users", { cls: "icon-sm" })}Switch to ${roleLabel(n.role)}</button>
            <p class="small muted">You're acting as ${me ? `${roleLabel(me.role)}${me.is_demo ? "" : " (a real account)"}` : "nobody yet"}. Each step belongs to one role; the server refuses it from any other.</p>`}`
      : html`<p class="small">The pilot reached ${d.record.passport_state}. Download the passport, or reset to walk it again.</p>`}
      <div class="row"><button class="btn btn-sm" type="button" data-demo="load">${icon("rotate-ccw", { cls: "icon-sm" })}Restart</button>
        <button class="btn btn-ghost btn-sm" type="button" data-demo="reset">Clear the demo</button></div>
    </div></section>`;
}

export function bindDemo(root, ctx) {
  root.querySelectorAll("[data-demo]").forEach((btn) => btn.addEventListener("click", () => busy(btn, async () => {
    const what = btn.dataset.demo;
    try {
      const wasSignedOut = !ctx.user;
      if (what === "switch") {
        ctx.user = await signInDemo(btn.dataset.role);
        if (wasSignedOut) { location.reload(); return; }
        updateUser(ctx.user);
        toast(`You're now the ${roleLabel(ctx.user.role)}.`);
        ctx.update(ctx.bundle);
        return;
      }
      if (!ctx.user?.is_demo) {
        ctx.user = await signInDemo(what === "advance" ? ctx.bundle.next?.role ?? "admin" : "admin");
        if (!wasSignedOut) updateUser(ctx.user);
      }
      const out = await api("/api/demo", { method: "POST", body: { action: what } });
      if (wasSignedOut) { location.reload(); return; }
      toast(what === "load" ? "Demo loaded at Draft." : what === "reset" ? "Demo cleared. Nothing simulated is left." : `Done: ${out.audit?.at(-1)?.action}.`);
      ctx.update(out);
    } catch (err) {
      toast(err.message, { tone: "danger", timeout: 9000 });
      if (err.body?.loaded !== undefined) ctx.update(err.body);
    }
  })));
}
