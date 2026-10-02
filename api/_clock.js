// The time an action is recorded at. Always the real time, except while a script replays
// history: scripts/seed-programme.mjs backdates its sample pilots so their audit trail,
// seals and payment dates read like a programme that ran over months. Nothing in the
// app sets it. SLA status is always judged against the real today, not this clock.
let fixed = null;
export const now = () => (fixed === null ? new Date() : new Date(fixed));
export const nowIso = () => now().toISOString();
export const todayIso = () => nowIso().slice(0, 10);
export function setClock(when) {
  fixed = when == null ? null : new Date(when).getTime();
}
