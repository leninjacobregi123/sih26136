// GET /api/ledger -> public payment reporting: per department, how promptly accepted
// milestones were paid against the programme's SLA. Aggregates only, no startup names,
// no sign-in. Simulated demo data is left out.
import { db } from "./_lib.js";
import { route, HttpError } from "./_http.js";
import { slaStatus } from "./_procurement.js";
import { policy } from "./_matching.js";

export default route(async (req, res) => {
  if (req.method !== "GET") throw new HttpError(405, "GET only");
  const { rows } = await db().query(
    `select c.department, r.passport->'milestones' as milestones
       from records r join challenges c on c.id = r.challenge_id
      where r.passport is not null and not c.is_simulated`);
  const today = new Date().toISOString().slice(0, 10);
  const by = new Map();
  for (const r of rows) {
    const d = by.get(r.department) ?? { department: r.department, pilots: 0, accepted: 0, paid: 0, paid_on_time: 0,
      paid_late: 0, overdue: 0, on_track: 0, paid_inr: 0, days_to_pay: [] };
    d.pilots++;
    for (const m of r.milestones ?? []) {
      const s = slaStatus(m.payment, today);
      if (s.status === "not due") continue;
      d.accepted++;
      if (s.status === "paid on time" || s.status === "paid late") {
        d.paid++; d.paid_inr += Number(m.amount_inr) || 0;
        d[s.status === "paid late" ? "paid_late" : "paid_on_time"]++;
        d.days_to_pay.push(Math.round((Date.parse(m.payment.paid_on) - Date.parse(m.payment.packet_complete_on)) / 86400000));
      } else if (s.status === "overdue") d.overdue++;
      else d.on_track++;
    }
    by.set(r.department, d);
  }
  const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const departments = [...by.values()].map(({ days_to_pay, ...d }) => ({ ...d, median_days_to_pay: median(days_to_pay),
    on_time_pct: d.paid ? Math.round((100 * d.paid_on_time) / d.paid) : null }))
    .sort((a, b) => a.department.localeCompare(b.department));
  res.setHeader("Cache-Control", "public, max-age=60");
  return res.status(200).json({ as_of: today, sla_days: policy.payment_sla_days, sla_basis: policy.payment_sla_basis, departments });
});
