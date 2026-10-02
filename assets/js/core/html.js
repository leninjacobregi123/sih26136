// Markup with escaping by default. Every value interpolated into html`` is escaped unless
// it is itself html`` (or an array of them), or wrapped in raw() — which is for markup the
// code wrote, never for data.
class Html {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

// null, undefined, false and true render as nothing, so `${cond && html`…`}` works.
const part = (v) =>
  v instanceof Html ? v.s
  : Array.isArray(v) ? v.map(part).join("")
  : v == null || v === false || v === true ? ""
  : esc(v);

export const html = (strings, ...values) =>
  new Html(strings.reduce((out, s, i) => out + s + (i < values.length ? part(values[i]) : ""), ""));
export const raw = (s) => new Html(String(s));
export const isHtml = (v) => v instanceof Html;

export function render(el, view) {
  el.innerHTML = part(view);
  return el;
}
