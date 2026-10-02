// Form fields with label, hint, required marker and an error slot wired with aria, plus the
// helpers forms share: read values, show the server's 422 on the right input, busy buttons.
import { html } from "../core/html.js";
import { icon } from "./icons.js";

let seq = 0;
const ids = (name) => { const id = `f-${name.replace(/[^\w-]/g, "-")}-${++seq}`; return { id, hint: `${id}-hint`, err: `${id}-err` }; };

const labelEl = (id, label, required, optional) => html`<label class="label" for="${id}">${label}${required ? html`<span class="req" aria-hidden="true">*</span>` : ""}${optional ? html`<span class="opt">(optional)</span>` : ""}</label>`;
const foot = (i, hint) => html`${hint && html`<div class="hint" id="${i.hint}">${hint}</div>`}<div class="error-text" id="${i.err}" hidden></div>`;
const describedBy = (i, hint) => [hint && i.hint, i.err].filter(Boolean).join(" ");

export function input({ name, label, hint, required, optional, type = "text", value = "", placeholder = "", prefix, suffix, attrs = "", inputmode }) {
  const i = ids(name);
  const control = html`<input class="input" id="${i.id}" name="${name}" type="${type}" value="${value ?? ""}" placeholder="${placeholder}"
    ${required ? html`required` : ""} ${inputmode ? html`inputmode="${inputmode}"` : ""} aria-describedby="${describedBy(i, hint)}" ${attrs}>`;
  return html`<div class="field" data-field="${name}">${labelEl(i.id, label, required, optional)}
    ${prefix || suffix ? html`<div class="input-group">${prefix && html`<span class="adorn">${prefix}</span>`}${control}${suffix && html`<span class="adorn">${suffix}</span>`}</div>` : control}
    ${foot(i, hint)}</div>`;
}

export function textarea({ name, label, hint, required, optional, value = "", rows = 3, placeholder = "", attrs = "" }) {
  const i = ids(name);
  return html`<div class="field" data-field="${name}">${labelEl(i.id, label, required, optional)}
    <textarea class="textarea" id="${i.id}" name="${name}" rows="${rows}" placeholder="${placeholder}" ${required ? html`required` : ""}
      aria-describedby="${describedBy(i, hint)}" ${attrs}>${value ?? ""}</textarea>${foot(i, hint)}</div>`;
}

export function select({ name, label, hint, required, options, value = "" }) {
  const i = ids(name);
  return html`<div class="field" data-field="${name}">${labelEl(i.id, label, required)}
    <select class="select" id="${i.id}" name="${name}" ${required ? html`required` : ""} aria-describedby="${describedBy(i, hint)}">
      ${options.map(([v, l, disabled]) => html`<option value="${v}" ${String(v) === String(value) ? html`selected` : ""} ${disabled ? html`disabled` : ""}>${l}</option>`)}
    </select>${foot(i, hint)}</div>`;
}

// options: [value, title, description?, disabled?]
export function choices({ name, legend, hint, required, options, value, type = "radio" }) {
  const i = ids(name);
  return html`<fieldset class="field" data-field="${name}" aria-describedby="${describedBy(i, hint)}">
    <legend class="label">${legend}${required ? html`<span class="req" aria-hidden="true">*</span>` : ""}</legend>
    <div class="choice-list">${options.map(([v, title, desc, disabled]) => html`<label class="choice">
      <input type="${type}" name="${name}" value="${v}" ${type === "radio" && required ? html`required` : ""} ${v === value || (Array.isArray(value) && value.includes(v)) ? html`checked` : ""} ${disabled ? html`disabled` : ""}>
      <span><span class="choice-title">${title}</span>${desc && html`<span class="choice-desc" style="display:block">${desc}</span>`}</span></label>`)}</div>
    ${foot(i, hint)}</fieldset>`;
}

export function checkbox({ name, label, required, checked }) {
  const i = ids(name);
  return html`<div class="field" data-field="${name}"><label class="check"><input type="checkbox" id="${i.id}" name="${name}" ${required ? html`required` : ""} ${checked ? html`checked` : ""} aria-describedby="${i.err}"><span>${label}</span></label>
    <div class="error-text" id="${i.err}" hidden></div></div>`;
}

// Values as the API wants them: checkboxes true/false, multi-checkbox groups as arrays.
export function readForm(form) {
  const data = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled || el.type === "file" || el.type === "submit" || el.type === "button") continue;
    if (el.type === "checkbox") {
      const group = form.querySelectorAll(`input[type=checkbox][name="${CSS.escape(el.name)}"]`);
      if (group.length > 1) { data[el.name] ??= []; if (el.checked) data[el.name].push(el.value); }
      else data[el.name] = el.checked;
    } else if (el.type === "radio") { if (el.checked) data[el.name] = el.value; }
    else data[el.name] = el.value;
  }
  return data;
}

export function clearErrors(form) {
  form.querySelectorAll(".error-text").forEach((e) => { e.hidden = true; e.textContent = ""; });
  form.querySelectorAll("[aria-invalid]").forEach((e) => e.removeAttribute("aria-invalid"));
}

// Put the message on the field the server named, or the first required field left empty.
// Returns false when it couldn't find a field (show the message elsewhere then).
export function showError(form, message, field) {
  const key = field?.split(".")[0];
  const wrap = key && form.querySelector(`[data-field="${CSS.escape(field)}"]`) || key && form.querySelector(`[data-field="${CSS.escape(key)}"]`);
  if (!wrap) return false;
  const err = wrap.querySelector(".error-text");
  err.innerHTML = `${icon("circle-alert")}<span></span>`;
  err.querySelector("span").textContent = message.charAt(0).toUpperCase() + message.slice(1) + (/[.!?]$/.test(message) ? "" : ".");
  err.hidden = false;
  const control = wrap.querySelector("input, select, textarea");
  control?.setAttribute("aria-invalid", "true");
  control?.focus();
  return true;
}

// Client-side check of required fields before sending, same style as server errors.
export function checkRequired(form) {
  for (const el of form.querySelectorAll("[required]")) {
    const empty = el.type === "radio" ? !form.querySelector(`input[name="${CSS.escape(el.name)}"]:checked`)
      : el.type === "checkbox" ? !el.checked : !String(el.value).trim();
    if (empty) {
      const wrap = el.closest("[data-field]");
      const name = wrap?.querySelector(".label, legend")?.textContent.replace(/\*|\(optional\)/g, "").trim() || "This field";
      showError(form, el.type === "checkbox" ? "Tick this to continue" : `${name} is required`, wrap?.dataset.field);
      return false;
    }
  }
  return true;
}

export async function busy(button, fn) {
  button.setAttribute("aria-busy", "true");
  button.disabled = true;
  try { return await fn(); } finally { button.removeAttribute("aria-busy"); button.disabled = false; }
}
