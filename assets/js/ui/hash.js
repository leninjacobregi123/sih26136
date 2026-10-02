// A SHA-256 shown short, with the full value on hover and a copy button.
import { html } from "../core/html.js";
import { icon } from "./icons.js";

export const hashChip = (hash, { label = "hash", n = 12 } = {}) => hash ? html`<span class="hash" title="${hash}">
  <span>${hash.slice(0, n)}…</span><button type="button" data-copy="${hash}" data-copy-msg="Full ${label} copied." aria-label="Copy the full ${label}">${icon("copy", { cls: "icon-xs" })}</button></span>` : "";
