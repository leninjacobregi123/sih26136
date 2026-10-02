// Lucide icons from the self-hosted sprite (assets/icons.svg). Decorative by default;
// pass a label when the icon is the only thing saying what something is.
import { html } from "../core/html.js";

export const icon = (name, { cls = "", label } = {}) =>
  label
    ? html`<svg class="icon ${cls}" role="img" aria-label="${label}"><use href="/assets/icons.svg#${name}"></use></svg>`
    : html`<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="/assets/icons.svg#${name}"></use></svg>`;
