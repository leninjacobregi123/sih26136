// How numbers, money, dates and hashes read across the app (en-IN).
const IN = "en-IN";

// ₹ in lakh for amounts on cards ("₹3.75 L"); full rupees where precision matters.
export const lakh = (n) => (n == null || n === "" ? "—" : `₹${(Number(n) / 1e5).toLocaleString(IN, { maximumFractionDigits: 2 })} L`);
export const rupees = (n) => (n == null || n === "" ? "—" : `₹${Number(n).toLocaleString(IN, { maximumFractionDigits: 0 })}`);
export const num = (n, digits = 2) => (n == null || n === "" ? "—" : Number(n).toLocaleString(IN, { maximumFractionDigits: digits }));

const asDate = (d) => (d instanceof Date ? d : new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d));
export const date = (d) => (d ? asDate(d).toLocaleDateString(IN, { day: "numeric", month: "short", year: "numeric" }) : "—");
export const dateTime = (d) => (d ? asDate(d).toLocaleString(IN, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
export const dayKey = (d) => asDate(d).toLocaleDateString(IN, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const UNITS = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
const rtf = new Intl.RelativeTimeFormat(IN, { numeric: "auto" });
export function ago(d) {
  if (!d) return "—";
  const s = (asDate(d).getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) if (Math.abs(s) >= size || unit === "minute") return rtf.format(Math.round(s / size), unit);
}
export const daysBetween = (a, b) => Math.round((asDate(b) - asDate(a)) / 86400000);

export const shortHash = (h, n = 12) => (h ? `${h.slice(0, n)}…` : "—");
export const bytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
export const initials = (name) => String(name ?? "?").replace(/\(.*?\)/g, "").split(/[\s,]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
