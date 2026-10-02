// Tabs per the WAI-ARIA pattern: arrow keys, Home/End, roving tabindex; the selected tab is
// kept in the URL hash. Every panel stays in the DOM (hidden), so print shows them all.
import { html } from "../core/html.js";

export const tabList = (tabs, selected, label) => html`<div class="tabs" role="tablist" aria-label="${label}">
  ${tabs.map((t) => html`<button class="tab" role="tab" type="button" id="tab-${t.id}" aria-controls="panel-${t.id}"
    aria-selected="${t.id === selected}" tabindex="${t.id === selected ? 0 : -1}">${t.mark !== undefined ? html`<span class="tab-mark ${t.mark ? "filled" : ""}" aria-hidden="true"></span>` : ""}${t.label}</button>`)}
</div>`;

export const tabPanel = (t, selected, body) => html`<section class="tab-panel" role="tabpanel" id="panel-${t.id}" aria-labelledby="tab-${t.id}"
  data-title="${t.label}" tabindex="0" ${t.id === selected ? "" : html`hidden`}>${body}</section>`;

export function bindTabs(root, { onChange } = {}) {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const select = (tab, focus) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      root.querySelector(`#${t.getAttribute("aria-controls")}`).hidden = !on;
    }
    if (focus) tab.focus();
    const id = tab.id.replace(/^tab-/, "");
    history.replaceState(null, "", `#${id}`);
    onChange?.(id);
  };
  for (const t of tabs) {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (e) => {
      const i = tabs.indexOf(t);
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select(tabs[(next + tabs.length) % tabs.length], true);
    });
  }
}
