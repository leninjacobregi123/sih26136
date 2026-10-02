// Passport states as pills and progress, with a tone each; never colour alone.
import { html } from "../core/html.js";
import { icon } from "./icons.js";

export const STATES = ["Draft", "Baseline verified", "Criteria sealed", "Pilot active", "Evidence submitted",
  "Independently validated", "Procurement-ready", "Deployed", "Adoption measured", "Replication-ready"];
export const LEARNING = "Learning record";

const TONE = {
  Draft: ["neutral", "square-pen"], "Baseline verified": ["info", "circle-check"], "Criteria sealed": ["info", "lock"],
  "Pilot active": ["accent", "activity"], "Evidence submitted": ["accent", "file-check"], "Independently validated": ["success", "badge-check"],
  "Procurement-ready": ["success", "scale"], Deployed: ["success", "rocket"], "Adoption measured": ["success", "gauge"],
  "Replication-ready": ["success", "route"], "Learning record": ["warning", "book-open"],
};

export const statePill = (state) => {
  const [tone, name] = TONE[state] ?? ["neutral", "circle-dot"];
  return html`<span class="pill tone-${tone}">${icon(name)}${state}</span>`;
};

export const stepOf = (state) => (state === LEARNING ? null : STATES.indexOf(state) + 1);

export const miniProgress = (state) => {
  const at = STATES.indexOf(state);
  const learning = state === LEARNING;
  return html`<span class="mini-progress" aria-hidden="true">${STATES.map((_, i) =>
    html`<i class="${learning ? "learning" : i <= at ? "on" : ""}"></i>`)}</span>`;
};

// Tones for SLA status, verdicts and screening results. Order matters: "not adopted" is
// danger before "adopted" can read as success.
export function toneOf(text) {
  const s = String(text ?? "").toLowerCase();
  if (/^not due|^planned/.test(s)) return "neutral";
  if (/overdue|rejected|missed|not adopted|broken|refused|disputed|mismatch/.test(s)) return "danger";
  if (/late|delayed|standard terms|outcome not held|returned|hold|learning/.test(s)) return "warning";
  if (/paid on time|^paid$|accepted|met|eligible|adopted|verified|intact|replicat/.test(s)) return "success";
  if (/on track|due|submitted|packet complete/.test(s)) return "info";
  return "neutral";
}

export const tonePill = (text, ico) => html`<span class="pill tone-${toneOf(text)}">${ico && icon(ico)}${text}</span>`;
