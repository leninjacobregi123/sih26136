// Explainable matching: hard filters first, then a score on published weights.
// No model and no hidden score: every number on the page comes with its reason, every
// rejection with what would have changed it. The panel decides; this only ranks.
import { nowIso } from "./_clock.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
export const policy = require("../shared/policy.json");

const DATA_RANK = { none: 0, pseudonymised: 1, personal: 2 };
const STOP = new Set(("the and for from with that this into over under per are was were has have not but all any each " +
  "out who what when how its their them they than then also more less time cut reduce increase improve make").split(" "));

export const terms = (s) => new Set(String(s ?? "").toLowerCase().match(/[a-z][a-z0-9]{2,}/g)?.filter((w) => !STOP.has(w)) ?? []);

// challenge: the challenges row; envelope: the risk envelope the admin set; p: a startup_profiles row + name.
export function screenOne(challenge, envelope, p) {
  const hard = [];
  const fail = (rule, why, counterfactual) => hard.push({ rule, pass: false, why, counterfactual });
  const pass = (rule, why) => hard.push({ rule, pass: true, why });

  if (!p.has_profile) {
    fail("Profile", "No startup profile on file, so nothing can be checked.", "Eligible for screening once the startup completes its profile.");
    return { result: "rejected", hard, score: null, components: [] };
  }
  if (p.needs_write_access && !envelope.allow_write) {
    fail("System access", "Needs write access to department systems; the risk envelope allows read-only.",
      "Would pass if the envelope allowed writes — which raises the pilot's risk class and needs a new approval.");
  } else pass("System access", p.needs_write_access ? "Needs write access; the envelope allows it." : "Works read-only.");

  if (DATA_RANK[p.data_needed] > DATA_RANK[envelope.data_class]) {
    fail("Data class", `Needs ${p.data_needed} data; the envelope allows ${envelope.data_class}.`,
      `Would pass with ${envelope.data_class} data, or if the envelope allowed ${p.data_needed} data under a DPDP-compliant agreement.`);
  } else pass("Data class", `Needs ${p.data_needed} data; within the ${envelope.data_class} envelope.`);

  if (p.available_from && envelope.start_date && String(p.available_from) > envelope.start_date) {
    fail("Availability", `Not available until ${p.available_from}; the pilot starts ${envelope.start_date}.`,
      `Would pass with a start date on or after ${p.available_from}.`);
  } else pass("Availability", envelope.start_date ? `Available for a ${envelope.start_date} start.` : "No availability limit declared.");

  const rejected = hard.some((h) => !h.pass);
  // Not a filter: decides the terms, not whether it may compete.
  const terms173 = p.dpiit_recognised
    ? { rule: "GFR 173(i) relaxation", pass: true, why: "DPIIT-recognised (self-declared), so prior-turnover and experience conditions are waived." }
    : { rule: "GFR 173(i) relaxation", pass: false, soft: true, why: "Not DPIIT-recognised, so 173(i) does not reach it: standard turnover conditions apply.",
        counterfactual: "With DPIIT recognition the 173(i) relaxation would apply." };
  hard.push(terms173);
  if (rejected) return { result: "rejected", hard, score: null, components: [] };

  const w = policy.match_weights;
  const want = terms([challenge.outcome_statement, challenge.kpi_name, challenge.kpi_definition, challenge.sector].join(" "));
  const have = terms([p.capabilities, p.prior_evidence, ...(p.sectors ?? [])].join(" "));
  const shared = [...want].filter((t) => have.has(t));
  const fit = Math.min(1, shared.length / Math.min(Math.max(want.size, 1), 6));
  const numbers = /\d/.test(p.prior_evidence ?? "");
  const evidence = Math.min(1, (p.prior_deployments >= 2 ? 0.8 : p.prior_deployments === 1 ? 0.5 : 0) + (numbers ? 0.2 : 0));
  const dataRisk = Math.max(0, { none: 1, pseudonymised: 0.7, personal: 0.3 }[p.data_needed] - (p.needs_write_access ? 0.3 : 0));
  const sectorHit = (p.sectors ?? []).some((s) => s.toLowerCase() === String(challenge.sector ?? "").toLowerCase());
  const districts = p.districts ?? [];
  const districtHit = districts.some((d) => d.toLowerCase() === String(challenge.district ?? "").toLowerCase());
  const delivery = (sectorHit ? 0.5 : 0) + (districtHit ? 0.5 : districts.length === 0 ? 0.3 : 0);

  const components = [
    { name: "Outcome fit", weight: w.outcome_fit, score: fit,
      why: shared.length ? `Its capabilities share these terms with the challenge: ${shared.slice(0, 8).join(", ")}.` : "No terms in common with the challenge." },
    { name: "Evidence", weight: w.evidence, score: evidence,
      why: `${p.prior_deployments} prior deployment${p.prior_deployments === 1 ? "" : "s"}${numbers ? ", with measured results" : ", no measured result stated"}.` },
    { name: "Data risk", weight: w.data_risk, score: dataRisk,
      why: `Needs ${p.data_needed} data${p.needs_write_access ? " and write access" : ", read-only"}. Less data, less risk.` },
    { name: "Delivery", weight: w.delivery, score: delivery,
      why: `${sectorHit ? "Works in this sector" : "Sector not declared"}; ${districtHit ? `serves ${challenge.district}` : districts.length ? `serves ${districts.join(", ")}, not ${challenge.district}` : "statewide"}.` },
  ].map((c) => ({ ...c, points: Math.round(c.weight * c.score) }));
  return {
    result: p.dpiit_recognised ? "eligible" : "standard terms",
    hard, components,
    score: components.reduce((a, c) => a + c.points, 0),
  };
}

export function screenAll(challenge, envelope, profiles) {
  const candidates = profiles.map((p) => ({ user_id: p.user_id, name: p.org || p.name, ...screenOne(challenge, envelope, p) }));
  candidates.sort((a, b) => (a.result === "rejected") - (b.result === "rejected") || (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name));
  return {
    ran_at: nowIso(),
    weights: policy.match_weights,
    note: "Ranking is advisory. Hard filters are binding; the panel chooses among the rest.",
    candidates,
  };
}
