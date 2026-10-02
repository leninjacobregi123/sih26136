// The procurement route compiler and the payment SLA ledger. Both are rule tables, not
// models: a route is offered only when every one of its conditions holds, and each
// condition that fails says what fact would have to change.
import { policy } from "./_matching.js";

// Each condition: the fact it reads, the test, why it fails, and what would make it pass.
const ROUTES = [
  {
    id: 1, route: "Tier 1 — Proprietary Article Certificate",
    basis: "GFR Rule 166(i), reached the way DAP 2020 reaches it for iDEX winners: the programme authority deems the validated solution proprietary.",
    approvals: ["Department Officer (route approval)", "Competent financial authority (PAC sanction)", "Finance / Procurement Officer (order)"],
    when: [
      ["met", (f) => f.met, "The validator did not find the sealed criteria met.", "Available only after a validated success."],
      ["winners", (f) => f.winners === 1, "Needs exactly one validated winner.", null],
      ["same_department", (f) => f.same_department, "The buyer is not the department that ran the pilot.", "Available if the piloting department itself buys."],
      ["gr", (f) => f.gr_in_force, "The state deeming Government Resolution is not in force; 'won our challenge' is not a lawful ground under Rule 166.",
        "If the deeming Government Resolution were in force, Tier 1 would be available for this purchase."],
    ],
  },
  {
    id: 2, route: "Tier 2 — Limited tender to the winners",
    basis: "Modelled on the iDEX multi-winner provision in DAP 2020 Chapter III: a limited tender restricted to the cohort that proved the outcome.",
    approvals: ["Department Officer (route approval)", "Tender committee (limited tender)", "Finance / Procurement Officer (order)"],
    when: [
      ["met", (f) => f.met, "The validator did not find the sealed criteria met.", "Available only after a validated success."],
      ["winners", (f) => f.winners >= 2, "Needs two or more validated winners; this pilot validated one.",
        "If two or more startups had met the sealed criteria in parallel pilots, Tier 2 would be available."],
      ["same_department", (f) => f.same_department, "The buyer is not the department that ran the pilot.", "Available if the piloting department itself buys."],
    ],
  },
  {
    id: 3, route: "Tier 3 — GeM Startup Runway replication",
    basis: "GeM Startup Runway listing procedure, with GFR 173(i) and 170(i) supplying the entry waivers.",
    approvals: ["Department Officer (route approval)", "Finance / Procurement Officer (GeM order)"],
    when: [
      ["met", (f) => f.met, "The validator did not find the sealed criteria met.", "Available only after a validated success."],
      ["dpiit", (f) => f.dpiit, "Startup Runway is for DPIIT-recognised startups; this one is not.",
        "With DPIIT recognition the product could be listed on Startup Runway."],
    ],
  },
];

// facts: { met, winners, same_department, scale_up, gr_in_force, dpiit, gem_ratings }
export function compileRoute(facts, p = policy) {
  const f = { gr_in_force: p.deeming_gr_in_force, ...facts };
  const evaluated = ROUTES.map((r) => {
    const failed = r.when.filter(([, test]) => !test(f)).map(([fact, , why, cf]) => ({ fact, why, counterfactual: cf }));
    return { ...r, failed };
  });
  // Spreading to other departments goes through the catalogue; otherwise the most specific route wins.
  const order = f.scale_up ? [3, 1, 2] : [1, 2, 3];
  const ok = order.map((id) => evaluated.find((r) => r.id === id)).find((r) => !r.failed.length);
  const ratingsNote = (r) => r.id === 3
    ? (f.gem_ratings >= p.gem_ratings_for_full_catalogue
        ? `Holds ${f.gem_ratings} buyer ratings: moves to the full GeM catalogue, where any department can buy it.`
        : `Holds ${f.gem_ratings} of ${p.gem_ratings_for_full_catalogue} buyer ratings needed for the full catalogue; this pilot counts as a Runway trial.`)
    : null;

  return {
    compiled_at: new Date().toISOString(),
    facts: [
      `Validation: ${f.met ? "met the sealed criteria" : "missed the sealed criteria"}`,
      `Validated winners: ${f.winners}`,
      `Buyer: ${f.same_department ? "the piloting department" : "another department"}`,
      `Scale-up beyond this department: ${f.scale_up ? "planned" : "not planned"}`,
      `State deeming GR: ${f.gr_in_force ? "in force" : "not issued"} (programme policy)`,
      `Startup DPIIT recognition: ${f.dpiit ? "yes (self-declared)" : "no"}`,
      `GeM buyer ratings: ${f.gem_ratings ?? 0}`,
    ],
    accepted: ok ? { route: ok.route, basis: ok.basis, next: ratingsNote(ok) } : null,
    rejected: evaluated.filter((r) => r !== ok).map((r) => ({
      route: r.route,
      why: r.failed.length ? r.failed.map((x) => x.why).join(" ") : "Available, but another route fits these facts better.",
      counterfactual: r.failed.map((x) => x.counterfactual).filter(Boolean)[0] ?? null,
    })),
    approvals: ok ? ok.approvals : [],
    learning_record: !ok,
    outcome: ok ? null : "No lawful route — nothing is bought. The passport stands as a learning record of what was tested and what it cost.",
  };
}

// ---- payment SLA --------------------------------------------------------------

const DAY = 86400000;
export const addDays = (iso, n) => new Date(Date.parse(iso) + n * DAY).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

// Where a milestone's payment stands against the SLA, today.
export function slaStatus(payment, today = new Date().toISOString().slice(0, 10), p = policy) {
  const y = payment ?? {};
  if (!y.expected_by) return { status: "not due", label: "Not due" };
  if (y.paid_on) {
    const late = daysBetween(y.expected_by, y.paid_on);
    return late > 0 ? { status: "paid late", label: `Paid ${late} day${late === 1 ? "" : "s"} late`, days_late: late }
      : { status: "paid on time", label: "Paid on time" };
  }
  const left = daysBetween(today, y.expected_by);
  if (left >= 0) return { status: "on track", label: left === 0 ? "Due today" : `Due in ${left} day${left === 1 ? "" : "s"}`, days_left: left };
  const over = -left;
  return {
    status: "overdue", label: `Overdue by ${over} day${over === 1 ? "" : "s"}`, days_overdue: over,
    grievance: { opened_on: addDays(y.expected_by, 1), response_due: addDays(y.expected_by, 1 + p.grievance_response_days) },
    reason: y.delay_reason ?? null,
  };
}
