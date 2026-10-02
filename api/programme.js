// GET /api/programme -> the public view of the programme, no sign-in:
//   departments: per department, how promptly accepted milestones were paid against the SLA
//   dashboard:   pilots by state, outcomes against baseline, adoption, routes, replications
//   pilots, payments: the same facts as anonymous rows (department and district, never a
//                startup or a person), so the public pages can filter and export them
// Demo data is left out; seeded sample pilots are flagged so a page can include or drop them.
import { db } from "./_lib.js";
import { route, HttpError } from "./_http.js";
import { slaStatus } from "./_procurement.js";
import { policy } from "./_matching.js";
import { STATES, LEARNING } from "./_passport.js";

export default route(async (req, res) => {
  if (req.method !== "GET") throw new HttpError(405, "GET only");
  const { rows } = await db().query(
    `select c.department, c.district, c.kpi_name, c.kpi_unit, c.baseline_value, c.target_value, c.target_direction,
            r.passport_state, r.post_value, (r.is_synthetic and c.pr_id like 'SAMPLE-%') as sample, r.passport->'milestones' as milestones,
            r.passport->'validation'->>'result' as validation, r.passport->'procurement'->'accepted'->>'route' as route,
            r.passport->'adoption'->'latest' as adoption, r.passport->'replication'->>'decision' as replication,
            (select max(at) from audit_events a where a.record_id = r.id) as last_activity
       from records r join challenges c on c.id = r.challenge_id
      where r.passport is not null and not c.is_simulated`);
  const today = new Date().toISOString().slice(0, 10);
  const payments = [];
  const by = new Map();
  for (const r of rows) {
    const d = by.get(r.department) ?? { department: r.department, pilots: 0, accepted: 0, paid: 0, paid_on_time: 0,
      paid_late: 0, overdue: 0, on_track: 0, paid_inr: 0, days_to_pay: [] };
    d.pilots++;
    for (const m of r.milestones ?? []) {
      const s = slaStatus(m.payment, today);
      if (s.status === "not due") continue;
      payments.push({ department: r.department, district: r.district, sample: r.sample, status: s.status,
        amount_inr: Number(m.amount_inr) || 0, days_overdue: s.days_overdue ?? null, days_late: s.days_late ?? null,
        days_to_pay: m.payment.paid_on ? Math.round((Date.parse(m.payment.paid_on) - Date.parse(m.payment.packet_complete_on)) / 86400000) : null });
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
  return res.status(200).json({
    as_of: today, sample_pilots: rows.filter((r) => r.sample).length, sla_days: policy.payment_sla_days, sla_basis: policy.payment_sla_basis, departments,
    dashboard: dashboard(rows),
    pilots: rows.map((r) => ({ department: r.department, district: r.district, state: r.passport_state, sample: r.sample,
      met: r.validation ? r.validation === "Met the sealed criteria" : null, verdict: r.adoption?.verdict ?? null, route: r.route ?? null })),
    payments,
  });
});

function dashboard(rows) {
  const count = (f) => rows.filter(f).length;
  const by = (key) => Object.entries(rows.reduce((m, r) => (r[key] ? ((m[r[key]] = (m[r[key]] ?? 0) + 1), m) : m), {}))
    .map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
  const validated = rows.filter((r) => r.validation);
  const measured = rows.filter((r) => r.adoption);
  // Improvement toward the target, as a share of the baseline: positive is better either way.
  const gain = (r, value) => {
    const b = Number(r.baseline_value);
    return b ? Math.round((1000 * (r.target_direction === "decrease" ? b - value : value - b)) / b) / 10 : null;
  };
  return {
    pilots: rows.length,
    by_state: [...STATES, LEARNING].map((state) => ({ state, n: count((r) => r.passport_state === state) })),
    validated: validated.length,
    met: count((r) => r.validation === "Met the sealed criteria"),
    routes: by("route"),
    adoption: {
      measured: measured.length,
      adopted: count((r) => r.adoption?.verdict === "adopted"),
      threshold_pct: policy.adoption_threshold_pct,
    },
    replications: count((r) => r.passport_state === "Replication-ready"),
    learning_records: count((r) => r.passport_state === LEARNING),
    // One row per pilot that has reached a result. Department-level only.
    results: rows.filter((r) => r.validation)
      .map((r) => ({
        department: r.department, district: r.district, kpi: r.kpi_name, unit: r.kpi_unit,
        baseline: Number(r.baseline_value), target: Number(r.target_value), direction: r.target_direction,
        validated: r.post_value != null ? Number(r.post_value) : null,
        validated_gain_pct: r.post_value != null ? gain(r, Number(r.post_value)) : null,
        now: r.adoption ? r.adoption.outcome.now : null,
        now_gain_pct: r.adoption ? gain(r, r.adoption.outcome.now) : null,
        usage_pct: r.adoption?.usage_pct ?? null,
        verdict: r.adoption?.verdict ?? null,
        state: r.passport_state, route: r.route, sample: r.sample,
      }))
      .sort((a, b) => a.department.localeCompare(b.department) || a.kpi.localeCompare(b.kpi)),
  };
}
