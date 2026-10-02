// Seed a fictional sample programme: 11 pilots across Maharashtra at every stage, driven
// through the real actions (so every seal, evidence hash, screening, route trace and audit
// chain is genuine) with the clock set back so the history reads like months of work.
// Everything is marked sample (pr_id SAMPLE-nn, records.is_synthetic) and labelled
// "Sample pilot — fictional" on every page. Sample accounts have no password.
//   npm run seed:programme              -> seed (refuses if a sample programme exists)
//   npm run seed:programme -- --replace -> remove the old sample programme, then seed
//   npm run seed:programme -- --remove  -> remove it and stop
//   add --no-model to skip the quality gate's model call (rules only)
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const args = new Set(process.argv.slice(2));
if (args.has("--no-model")) process.env.LLM_API_KEY = "";

const { db } = await import("../api/_lib.js");
const { setClock } = await import("../api/_clock.js");
const { createChallenge, runAction } = await import("../api/_actions.js");

const DAY = 86400000;
const TODAY = new Date();
// n days ago, at 11:00 IST, so timestamps look like office hours.
const ago = (n) => { const d = new Date(TODAY.getTime() - n * DAY); d.setUTCHours(5, 30, 0, 0); return d; };
const iso = (n) => ago(n).toISOString().slice(0, 10);
const b64 = (s) => Buffer.from(s).toString("base64");

// ---- removal ----------------------------------------------------------------------

const SAMPLE = "r.is_synthetic and c.pr_id like 'SAMPLE-%'";
async function remove() {
  const client = await db().connect();
  try {
    await client.query("begin");
    const recs = `select r.id from records r join challenges c on c.id = r.challenge_id where ${SAMPLE}`;
    const n = (await client.query(`select count(*)::int as n from (${recs}) x`)).rows[0].n;
    for (const t of ["audit_events", "evidence_files", "readings", "signatures"]) {
      await client.query(`delete from ${t} where record_id in (${recs})`);
    }
    await client.query(`delete from records where id in (${recs})`);
    await client.query(`delete from challenges where pr_id like 'SAMPLE-%'
                          and not exists (select 1 from records r where r.challenge_id = challenges.id)`);
    await client.query("delete from startup_profiles where user_id in (select id from users where email like '%@sample.invalid')");
    await client.query("delete from users where email like '%@sample.invalid'");
    await client.query("commit");
    console.log(`removed the sample programme (${n} pilots)`);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

const existing = (await db().query(`select count(*)::int as n from records r join challenges c on c.id = r.challenge_id where ${SAMPLE}`)).rows[0].n;
if (args.has("--remove")) { await remove(); await db().end(); process.exit(0); }
if (existing && !args.has("--replace")) {
  console.error(`a sample programme already exists (${existing} pilots). Use --replace to rebuild it, or --remove.`);
  await db().end();
  process.exit(1);
}
if (existing) await remove();

// ---- people (no passwords: nobody can sign in as them) -----------------------------

async function person(key, role, name, org = null) {
  const { rows: [u] } = await db().query(
    "insert into users (email, name, role, org) values ($1, $2, $3, $4) returning id, name, role, org, is_demo",
    [`${key}@sample.invalid`, name, role, org]);
  return u;
}
const admin = await person("msins-desk", "admin", "Programme desk, MSInS (sample)");
const finance = await person("accounts-cell", "finance", "Accounts & procurement cell (sample)");
const evaluators = [await person("panel-1", "evaluator", "Evaluator A — public systems (sample)"),
                    await person("panel-2", "evaluator", "Evaluator B — health & data (sample)")];
const validators = [await person("validator-1", "validator", "Independent validation agency 1 (sample)"),
                    await person("validator-2", "validator", "Independent validation agency 2 (sample)")];

const STARTUPS = {
  queuesense: ["QueueSense Systems", ["Nagpur"], "Token-free OPD flow: median wait from registration and consultation timestamps, read-only, with anonymous BLE beacons.", 2, "2 trust hospitals; median wait down 41% over 90 days", 2],
  jaldrishti: ["JalDrishti Labs", [], "Acoustic leak detection on water supply mains; non-revenue water and supply losses mapped by district metered area.", 3, "Non-revenue water down from 41% to 29% in 2 municipal zones", 1],
  kachratrack: ["KachraTrack", ["Pune", "Pimpri-Chinchwad"], "Waste complaint to collection routing from grievance system exports; vehicle GPS, read-only.", 2, "Complaint-to-collection time down 33% in one ward", 0],
  krishiclaim: ["KrishiClaim Analytics", [], "Crop insurance claim settlement: satellite crop-loss estimates matched to claim files to cut verification days.", 1, "Claim verification in 9 days instead of 31 in one taluka", 0],
  haajiri: ["HaajiriSetu", [], "School attendance reporting over SMS and WhatsApp for schools without connectivity; same-day attendance data.", 2, "Same-day reporting rose to 86% of schools in one block", 1],
  bhulekh: ["BhuLekh Digital", [], "Land record mutation workflow tracking: mutation entries, pending days, talathi workload.", 1, "", 0],
  safarsense: ["SafarSense Mobility", ["Ratnagiri", "Sindhudurg"], "Bus punctuality and depot schedule adherence from vehicle GPS feeds; read-only.", 1, "On-time departures up 14 points on 2 depots", 0],
  poshan: ["PoshanWatch", ["Gadchiroli", "Chandrapur"], "Anganwadi growth monitoring: weighing and height capture offline, coverage of children monitored each month.", 1, "Monthly growth-monitoring coverage from 52% to 81% in one project", 0],
  raksha: ["RakshaRoute", [], "Ambulance dispatch and response time: nearest-vehicle routing from call centre timestamps.", 2, "Median response time down 6 minutes in a city pilot", 1],
  tankertrack: ["TankerTrack", ["Latur", "Osmanabad"], "Water tanker scheduling and delivery tracking for drought villages; delivery confirmation by village.", 1, "Missed tanker trips down by half in one taluka", 0],
  carebridge: ["CareBridge Enterprise", [], "Queue display hardware and token software for large hospitals and offices; OPD and registration counters.", 4, "Installed in 3 hospitals", 3],
  medflow: ["MedFlow Analytics", [], "Hospital staffing and triage optimiser; writes rosters back into the hospital system to cut OPD wait.", 3, "3 private hospital chains", 0],
};
const startups = {};
for (const [key, [org, districts, capabilities, deployments, evidence, gem]] of Object.entries(STARTUPS)) {
  const u = await person(`startup-${key}`, "startup", `Founder, ${org} (sample)`, org);
  const writes = key === "medflow", personal = ["poshan", "bhulekh", "medflow"].includes(key);
  await db().query(
    `insert into startup_profiles (user_id, dpiit_recognised, dpiit_number, udyam_registered, sectors, districts, capabilities,
       needs_write_access, data_needed, prior_deployments, prior_evidence, gem_ratings)
     values ($1, $2, $3, true, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [u.id, key !== "carebridge", key !== "carebridge" ? `DIPP-S${100000 + Object.keys(startups).length * 7919}` : null,
     [{ queuesense: "Health", carebridge: "Health", medflow: "Health", raksha: "Health", poshan: "Women & Child Development",
        jaldrishti: "Water", tankertrack: "Water", kachratrack: "Urban services", krishiclaim: "Agriculture", haajiri: "Education",
        bhulekh: "Revenue", safarsense: "Transport" }[key]],
     districts, capabilities, writes, personal ? "personal" : "pseudonymised", deployments, evidence, gem]);
  startups[key] = u;
}

// ---- the pilots ---------------------------------------------------------------------

const PILOTS = [
  { dept: "Public Health Department", district: "Nagpur", sector: "Health", startup: "queuesense", start: 330, stop: "replicate",
    outcome: "Cut median wait from registration to first clinician contact at the district hospital OPD, with no extra sanctioned staff and no change to the existing HMIS",
    kpi: "Median wait, registration to clinician", unit: "minutes", def: "Median of (first consultation − registration) over all OPD visits in the window, from HMIS timestamps",
    baseline: 94, target: 60, dir: "decrease", source: "District hospital HMIS export", method: "All 61,480 OPD visits; 3.1% with a missing timestamp excluded and reported",
    comparison: "Second district hospital OPD, no deployment", data: "pseudonymised",
    milestones: [["Sandbox and baseline re-measured", "Independent baseline study", 300000], ["Read-only instrumentation live", "Access-log extract: zero writes", 450000], ["90-day window complete", "Raw timestamp dataset and analysis", 750000]],
    achieved: 55, late: { 2: 9 }, scale_up: "yes",
    adoption: [[30, 46, 29, 61, 18, 13], [75, 46, 36, 58, 20, 16], [120, 46, 38, 57, 22, 19]],
    review: { decision: "replicate", interested: "District hospital, Amravati\nDistrict hospital, Akola\nDistrict hospital, Wardha",
      reusable: ["Baseline method", "Sealed KPIs", "Risk envelope", "Validator method", "Exit annexure"], remaining_risks: "No owner yet for beacon battery replacement" } },

  { dept: "Water Supply & Sanitation Department", district: "Chhatrapati Sambhajinagar", sector: "Water", startup: "jaldrishti", start: 300, stop: "adoption",
    outcome: "Reduce water lost between the treatment plant and consumer meters in two district metered areas",
    kpi: "Non-revenue water", unit: "% of supply", def: "(System input volume − billed authorised consumption) ÷ system input volume, monthly, per district metered area",
    baseline: 38, target: 30, dir: "decrease", source: "Bulk meter and billing records", method: "Monthly water balance for 12 months, IWA method",
    comparison: "Two similar metered areas, no leak survey", data: "pseudonymised",
    milestones: [["Acoustic survey of 40 km of mains", "Leak map with GPS points", 600000], ["Repairs verified on 80% of found leaks", "Repair log with photos", 600000]],
    achieved: 28.5, late: {}, scale_up: "yes",
    adoption: [[45, 12, 10, 29.5, 10, 9]] },

  { dept: "Solid Waste Management, Municipal Corporation", district: "Pune", sector: "Urban services", startup: "kachratrack", start: 260, stop: "deployed",
    outcome: "Cut the time between a citizen's waste complaint and its collection",
    kpi: "Complaint-to-collection time", unit: "hours", def: "Median hours from complaint registration to collection confirmed, from the grievance system",
    baseline: 41.6, target: 30, dir: "decrease", source: "Municipal grievance system export", method: "All 18,204 waste complaints over 3 months",
    comparison: "Ward 12, no deployment", data: "pseudonymised",
    milestones: [["Routing live in 3 wards", "Route sheets and GPS traces", 400000], ["60-day window complete", "Complaint dataset and analysis", 500000]],
    achieved: 27.2, late: {}, scale_up: "no" },

  { dept: "Agriculture Department", district: "Amravati", sector: "Agriculture", startup: "krishiclaim", start: 230, stop: "procurement",
    outcome: "Settle crop insurance claims sooner after a notified crop loss",
    kpi: "Claim settlement time", unit: "days", def: "Median days from claim intimation to settlement credited, from the insurance portal",
    baseline: 74, target: 45, dir: "decrease", source: "Crop insurance portal claim records", method: "All 9,842 claims for the 2025 kharif season in 3 talukas",
    comparison: "Two talukas with the usual process", data: "pseudonymised",
    milestones: [["Satellite loss estimates for 3 talukas", "Loss estimate maps and method note", 500000], ["Season's claims processed", "Claim-level dataset", 700000]],
    achieved: 41, late: {}, scale_up: "yes" },

  { dept: "School Education Department", district: "Nashik", sector: "Education", startup: "haajiri", start: 200, stop: "validated",
    outcome: "Get attendance from every school to the block office on the same day",
    kpi: "Schools reporting attendance the same day", unit: "% of schools", def: "Share of schools whose daily attendance reaches the block office by 17:00, monthly average",
    baseline: 41, target: 80, dir: "increase", source: "Block education office registers", method: "All 312 schools in 2 blocks, 60 school days",
    comparison: "A third block, no deployment", data: "pseudonymised",
    milestones: [["SMS reporting live in 2 blocks", "Enrolment of schools and test messages", 250000], ["One term complete", "Daily reporting log", 350000]],
    achieved: 84, late: {} },

  { dept: "Revenue Department", district: "Kolhapur", sector: "Revenue", startup: "bhulekh", start: 210, stop: "missed",
    outcome: "Shorten the time to complete a land record mutation after a registered sale",
    kpi: "Mutation completion time", unit: "days", def: "Median days from registered sale to mutation entry certified, from the land records system",
    baseline: 38, target: 21, dir: "decrease", source: "Land records system export", method: "All 4,410 mutations over 6 months in 2 talukas",
    comparison: "Two talukas with the usual process", data: "personal",
    milestones: [["Tracking live in 2 talukas", "Workflow configuration and training log", 300000], ["90 days complete", "Mutation dataset", 400000]],
    achieved: 29, late: {}, scale_up: "no" },

  { dept: "Maharashtra State Road Transport Corporation", district: "Ratnagiri", sector: "Transport", startup: "safarsense", start: 150, stop: "evidence",
    outcome: "Make rural bus departures leave on schedule",
    kpi: "On-time departures", unit: "% of trips", def: "Share of scheduled trips leaving the depot within 5 minutes of schedule, from vehicle GPS",
    baseline: 62, target: 80, dir: "increase", source: "Depot logbooks and vehicle GPS", method: "All 21,600 scheduled trips over 3 months at 2 depots",
    comparison: "A third depot, no deployment", data: "pseudonymised",
    milestones: [["GPS feeds live at 2 depots", "Feed health report", 250000], ["Schedule adherence dashboard used", "Depot manager usage log", 250000], ["90 days complete", "Trip dataset", 300000]],
    late: { 2: 12 } },

  { dept: "Women & Child Development Department", district: "Gadchiroli", sector: "Women & Child Development", startup: "poshan", start: 120, stop: "active",
    outcome: "Monitor every young child's growth at the anganwadi each month",
    kpi: "Children with growth monitored", unit: "% of children 0–6", def: "Share of enrolled children weighed and measured in the month, from anganwadi registers",
    baseline: 55, target: 85, dir: "increase", source: "Anganwadi monthly progress reports", method: "All 214 anganwadis in 2 ICDS projects, 6 months",
    comparison: "A third ICDS project, no deployment", data: "personal",
    milestones: [["Devices and training in 214 anganwadis", "Training attendance and device log", 350000], ["Two months of offline capture", "Monthly capture dataset", 350000], ["Six months complete", "Coverage dataset", 500000]],
    doneMilestones: 2, overdue: { 2: "Awaiting the state share of ICDS funds" } },

  { dept: "Public Health Department", district: "Thane", sector: "Health", startup: null, start: 40, stop: "scored",
    outcome: "Get an ambulance to emergency callers sooner",
    kpi: "Ambulance response time", unit: "minutes", def: "Median minutes from call answered to ambulance at scene, from the call centre system",
    baseline: 28, target: 20, dir: "decrease", source: "108 call centre records", method: "All 11,930 emergency calls over 3 months",
    comparison: "Palghar district, no deployment", data: "pseudonymised" },

  { dept: "Rural Development Department", district: "Beed", sector: "Rural development", startup: null, start: 6, stop: "draft",
    outcome: "Develop a mobile app so MGNREGA workers get wages faster",
    kpi: "Wage payment delay", unit: "days", def: "",
    baseline: 19, target: 10, dir: "decrease", source: "NREGASoft payment records", method: "All muster rolls closed in 3 months",
    comparison: "", data: "pseudonymised" },

  { dept: "Water Supply & Sanitation Department", district: "Latur", sector: "Water", startup: "tankertrack", start: 280, stop: "not-adopted",
    outcome: "Make sure drought-hit villages get every scheduled water tanker",
    kpi: "Scheduled tanker trips missed", unit: "% of trips", def: "Share of scheduled tanker trips with no delivery confirmed by the village, monthly",
    baseline: 22, target: 10, dir: "decrease", source: "Tehsil tanker registers", method: "All 7,300 scheduled trips in summer 2025, 2 talukas",
    comparison: "A third taluka, no deployment", data: "pseudonymised",
    milestones: [["Tracking live for 60 tankers", "Device and app enrolment log", 300000], ["One summer complete", "Trip dataset", 450000]],
    achieved: 9, late: {}, scale_up: "no",
    adoption: [[40, 64, 21, 13, 30, 11]],
    review: { decision: "learning record", note: "Validated in the pilot summer, but tehsil staff went back to paper registers; the drivers' app was not maintained." } },
];

const ORDER = ["draft", "verified", "sealed", "screened", "scored", "active", "evidence", "validated", "missed", "procurement", "deployed", "adoption", "replicate", "not-adopted"];
const reached = (p, stage) => {
  const at = { draft: 0, sealed: 2, scored: 4, active: 5, evidence: 6, validated: 7, missed: 8, procurement: 9, deployed: 10, adoption: 11, replicate: 12, "not-adopted": 12 }[p.stop];
  return ORDER.indexOf(stage) <= at;
};

const officers = {};
async function officer(p) {
  const key = `${p.dept}|${p.district}`;
  return (officers[key] ??= await person(`officer-${Object.keys(officers).length + 1}`, "department",
    `Nodal officer, ${p.district} (sample)`, `${p.dept}, ${p.district}`));
}

// Steps on the same day get later times, half an hour apart, so the trail reads in order.
let sameDay = new Map();
const act = async (days, user, id, name, input) => {
  if (days < 0) throw new Error(`step ${name} would be in the future`);
  sameDay.set(days, (sameDay.get(days) ?? 0) + 1);
  setClock(ago(days).getTime() + sameDay.get(days) * 1800000);
  return runAction(user, id, name, input, { sample: true });
};

for (const [i, p] of PILOTS.entries()) {
  const dept = await officer(p);
  const s = p.start;
  sameDay = new Map();
  setClock(ago(s));
  const { id: challengeId, record_id: id } = await createChallenge(dept, {
    department: p.dept, district: p.district, sector: p.sector, outcome_statement: p.outcome, kpi_name: p.kpi, kpi_unit: p.unit,
    kpi_definition: p.def, baseline_value: p.baseline, baseline_window: "the 3 months before the challenge", baseline_source: p.source,
    baseline_method: p.method, comparison_unit: p.comparison, target_value: p.target, target_direction: p.dir, duration_days: 90 });
  await db().query("update challenges set pr_id = $1 where id = $2", [`SAMPLE-${String(i + 1).padStart(2, "0")}`, challengeId]);
  await db().query("update records set is_synthetic = true where id = $1", [id]);
  console.log(`SAMPLE-${String(i + 1).padStart(2, "0")}  ${p.district.padEnd(26)} ${p.kpi}`);
  if (p.stop === "draft") continue;

  await act(s - 4, admin, id, "verify_baseline", { result: `Re-derived ${p.baseline} ${p.unit} from the source: ${p.source}.`, quality_ack: true });
  await act(s - 7, dept, id, "seal", {});
  await act(s - 12, admin, id, "screen", {
    users: "Department staff only; no change for citizens during the pilot", systems: `Read-only extract: ${p.source}`,
    allow_write: "no", data_class: p.data, reversibility: "Removable in a day; existing system untouched",
    exit_cost: "Nil beyond the data deletion certificate", cap_inr: 1500000, start_date: iso(s - 20) });
  const { rows: [{ passport }] } = await db().query("select passport from records where id = $1", [id]);
  const shortlist = passport.screening.candidates.filter((c) => c.result !== "rejected");
  for (const [k, e] of evaluators.entries()) {
    await act(s - 15, e, id, "score", { scores: shortlist.map((c, j) => ({ user_id: c.user_id,
      score: Math.max(30, Math.min(95, (c.score ?? 50) + (c.user_id === startups[p.startup]?.id ? 6 : -4) + (k ? -3 : 2) - j)),
      note: c.user_id === startups[p.startup]?.id ? "Closest fit, measured prior result" : "Weaker evidence for this outcome" })),
      dissent: k === 1 && i % 3 === 0 ? "Wants the exit and data-deletion terms checked before award" : "" });
  }
  if (p.stop === "scored") continue;

  const span = Math.round(90 / p.milestones.length);
  await act(s - 20, admin, id, "award", { startup_user_id: startups[p.startup].id,
    scope: `${p.district}: ${p.comparison.startsWith("Two") || p.comparison.startsWith("A third") ? "two units" : "one unit"}, 90 days, staff-facing`,
    data_access: `${p.data === "none" ? "No personal data" : p.data === "personal" ? "Personal data under a DPDP-compliant agreement" : "Pseudonymised records only"}; read-only`,
    ip: "Startup keeps product IP; the department keeps the data and a licence to the pilot reports",
    milestones: p.milestones.map(([title, evidence, amount], k) => ({ title, evidence_expected: evidence, due: iso(s - 20 - span * (k + 1)), amount_inr: amount })) });

  // Everything after the award is scheduled first, then run in date order: a late payment
  // happens after the next milestone's evidence, and the trail has to read that way.
  const plan = [];
  const at = (days, user, name, input) => plan.push({ days, user, name, input });
  const done = p.doneMilestones ?? p.milestones.length;
  let lastAccept = s - 20, lastPaid = s - 20;
  for (let k = 0; k < done; k++) {
    const n = k + 1, due = s - 20 - span * n;
    at(due + 2, startups[p.startup], "upload_evidence", { milestone: n, title: p.milestones[k][1],
      filename: `M${n}-${p.milestones[k][1].toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.csv`, mime: "text/csv",
      data: b64(`pilot,${p.district}\nmilestone,${n}\nkpi,${p.kpi}\nbaseline,${p.baseline}\nnote,sample evidence file\n`) });
    at(due - 1, dept, "review_milestone", { milestone: n, decision: "accept", note: "" });
    lastAccept = due - 1;
    if (p.overdue?.[n]) {
      // Accepted, never paid: overdue today against the SLA, with the reason on record.
      at(Math.max(0, due - 1 - 31), finance, "record_payment", { milestone: n, outcome: "delayed", delay_reason: p.overdue[n] });
      continue;
    }
    const lag = p.late?.[n] ? 30 + p.late[n] : 12 + (k % 3) * 4;
    if (due - 1 - lag < 0) continue; // not paid yet; still inside its window
    at(due - 1 - lag, finance, "record_payment", { milestone: n, outcome: "paid", paid_on: iso(due - 1 - lag) });
    lastPaid = Math.min(lastPaid, due - 1 - lag);
  }
  const validated = reached(p, "validated") || p.stop === "missed";
  // The validator signs after the last acceptance and after the last payment.
  const attestOn = Math.max(Math.min(lastAccept - 12, lastPaid - 3), 1);
  if (validated) {
    at(attestOn, validators[i % 2], "attest", { achieved: p.achieved,
      method: `Difference-in-differences against the comparison unit (${p.comparison}); same KPI definition as the baseline`,
      exceptions: i % 4 === 0 ? "Two days of missing data excluded and disclosed; result unchanged with them included" : "" });
  }
  const routeOn = Math.max(attestOn - 6, 1), goLive = routeOn - 25;
  if (validated && p.stop !== "validated") at(routeOn, finance, "compile_route", { same_department: "yes", scale_up: p.scale_up ?? "no" });
  if (["deployed", "adoption", "replicate", "not-adopted"].includes(p.stop)) {
    at(routeOn - 4, dept, "approve_route", { note: "Order through the GeM Startup Runway catalogue" });
    at(goLive, dept, "record_deployment", { order_reference: `GEMC-5116${String(870 + i)}`, sites: `${p.district}: the pilot units, now permanent`,
      go_live: iso(goLive), annual_cost_inr: Math.round(p.milestones.reduce((a, m) => a + m[2], 0) * 0.18), staff_to_train: p.adoption?.[0]?.[1] ?? 20 });
  }
  if (["adoption", "replicate", "not-adopted"].includes(p.stop)) {
    for (const [after, trained, active, kpiNow, surveyed, keep] of p.adoption) {
      at(goLive - after, dept, "record_adoption", { measured_on: iso(goLive - after), staff_trained: trained, weekly_active: active, kpi_value: kpiNow,
        survey_respondents: surveyed, survey_would_keep: keep,
        drop_off: active / trained < 0.5 ? "Most staff returned to the paper registers after the first month" : "Night-shift staff use it least",
        citizen_impact: "", unresolved_risks: active / trained < 0.5 ? "No one owns the app after the pilot team left" : "" });
    }
  }
  if (["replicate", "not-adopted"].includes(p.stop)) {
    at(Math.max(goLive - p.adoption.at(-1)[0] - 7, 0), admin, "replication_review", { ...p.review, next_review: iso(-60) });
  }
  // Most days ago first; same-day steps keep the order they were planned in.
  plan.sort((x, y) => y.days - x.days);
  for (const step of plan) await act(step.days, step.user, id, step.name, step.input);
}
setClock(null);

const { rows } = await db().query(
  `select c.pr_id, c.district, r.passport_state from records r join challenges c on c.id = r.challenge_id where ${SAMPLE} order by c.pr_id`);
console.log("\n" + rows.map((r) => `${r.pr_id}  ${r.passport_state.padEnd(24)} ${r.district}`).join("\n"));
await db().end();
