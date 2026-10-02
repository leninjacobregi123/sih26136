// Toasts: short confirmations and live activity. Polite live region; never steal focus.
import { html, render } from "../core/html.js";
import { icon } from "./icons.js";

const TONES = { success: "circle-check", info: "info", danger: "circle-alert", activity: "activity" };

function region() {
  let el = document.getElementById("toasts");
  if (!el) {
    el = document.createElement("div");
    el.id = "toasts";
    el.className = "toasts";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.append(el);
  }
  return el;
}

export function toast(message, { tone = "success", action, timeout = 6000 } = {}) {
  const el = document.createElement("div");
  el.className = "toast";
  render(el, html`${icon(TONES[tone] ?? "info")}<div class="grow">${message}
    ${action && html` <a href="${action.href}">${action.label}</a>`}</div>
    <button class="toast-close" type="button" aria-label="Dismiss">${icon("x", { cls: "icon-sm" })}</button>`);
  el.querySelector(".toast-close").addEventListener("click", () => el.remove());
  const box = region();
  box.append(el);
  // At most three at once: a burst of activity shouldn't bury the page.
  while (box.children.length > 3) box.firstElementChild.remove();
  if (timeout) setTimeout(() => el.remove(), timeout);
  return el;
}
