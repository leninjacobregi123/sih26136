// Drawers and confirmations on the native <dialog>: focus is trapped, Esc closes, the page
// behind is inert, and focus returns to whatever opened it.
import { html, render } from "../core/html.js";
import { icon } from "./icons.js";

function open({ cls, view, onClose }) {
  const dlg = document.createElement("dialog");
  dlg.className = cls;
  render(dlg, view);
  document.body.append(dlg);
  const opener = document.activeElement;
  dlg.addEventListener("close", () => { dlg.remove(); onClose?.(dlg.returnValue); opener?.focus?.(); });
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close("cancel"); }); // click on the backdrop
  dlg.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => dlg.close("cancel")));
  dlg.showModal();
  (dlg.querySelector("[autofocus]") ?? dlg.querySelector("input, select, textarea, button:not([data-close])"))?.focus();
  return dlg;
}

const head = (title, sub) => html`<div class="dialog-head"><div class="grow"><h2>${title}</h2>${sub && html`<p class="card-sub">${sub}</p>`}</div>
  <button class="btn btn-ghost btn-icon btn-sm" type="button" data-close aria-label="Close">${icon("x")}</button></div>`;

// A side drawer holding a form. body: html; submit: the primary button's label.
export function drawer({ title, sub, body, submit, onClose }) {
  return open({
    cls: "drawer", onClose,
    view: html`${head(title, sub)}<form class="dialog-form" novalidate style="display:contents">
      <div class="dialog-body">${body}</div>
      <div class="dialog-foot"><button class="btn" type="button" data-close>Cancel</button>
        <button class="btn btn-primary" type="submit">${submit}</button></div></form>`,
  });
}

// Resolves true when confirmed. tone "danger" for destructive actions.
export function confirm({ title, body, confirmLabel = "Confirm", tone = "primary" }) {
  return new Promise((resolve) => {
    open({
      cls: "modal", onClose: (v) => resolve(v === "ok"),
      view: html`${head(title)}<div class="dialog-body">${body}</div>
        <form method="dialog" class="dialog-foot"><button class="btn" value="cancel" type="submit">Cancel</button>
          <button class="btn btn-${tone}" value="ok" type="submit" autofocus>${confirmLabel}</button></form>`,
    });
  });
}
