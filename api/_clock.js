// The time an action is recorded at. Always the real time, except while a script replays
// history: scripts/seed-programme.mjs backdates its sample pilots so their audit trail,
// seals and payment dates read like a programme that ran over months. Nothing in the
// app sets it. SLA status is always judged against the real today, not this clock.
let fixed = null;
export const now = () => (fixed === null ? new Date() : new Date(fixed));
export const nowIso = () => now().toISOString();

// The programme runs on Indian dates: "today" is the date in IST, not UTC (which is 5½ hours
// behind, so a UTC date would still say yesterday until 05:30 IST).
const IST = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
export const istDate = (d) => IST.format(d);
export const todayIso = () => istDate(now());
// The real today, never the replay clock: payment windows are always judged against it.
export const realToday = () => istDate(new Date());
export function setClock(when) {
  fixed = when == null ? null : new Date(when).getTime();
}
