// The challenge quality gate (A1 critique). Two sources, one report:
//  - rules: checks that need no model and always run;
//  - the model, given Pranjal's defect taxonomy (shared/defect_taxonomy.json).
// Findings are advisory, as the taxonomy says: they never block. What the gate requires
// is a person — the Programme Administrator — reading the report before publication.
import { nowIso } from "./_clock.js";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { llm } from "./_lib.js";

const require = createRequire(import.meta.url);
export const taxonomy = require("../shared/defect_taxonomy.json");
const LABEL = Object.fromEntries(taxonomy.classes.map((c) => [c.code, c.label]));

// The fields a reader of the published notice sees.
export const NOTICE_FIELDS = ["outcome_statement", "kpi_name", "kpi_unit", "kpi_definition", "baseline_value", "baseline_window",
  "baseline_source", "baseline_method", "comparison_unit", "duration_days", "target_value", "target_direction"];

const SOLUTION_WORDS = /\b(mobile app|app|application|portal|software|platform|dashboard|chatbot|website|blockchain|drone|iot|ai|artificial intelligence|machine learning)\b/i;
const BUILD_VERBS = /\b(develop|build|create|deploy|implement|install|procure|launch|design)\b/i;

function finding(code, field, span, why, source) {
  return { code, label: LABEL[code] ?? code, field, span: span || null, why, source };
}

export function ruleCheck(c) {
  const out = [];
  if (!c.kpi_unit?.trim()) {
    out.push(finding("KPI_NOT_MEASURABLE", "kpi_unit", null, "The KPI has no unit, so two people could measure it differently.", "rule"));
  }
  if (!c.kpi_definition?.trim()) {
    out.push(finding("KPI_NOT_MEASURABLE", "kpi_definition", null, "The KPI has no definition: what is counted, over what, from which records.", "rule"));
  }
  if (!c.comparison_unit?.trim()) {
    out.push(finding("OUTCOME_NOT_ATTRIBUTABLE", "comparison_unit", null,
      "No comparison unit. Without a similar unit that doesn't get the solution, a seasonal or unrelated change could pass for success.", "rule"));
  }
  const text = c.outcome_statement ?? "";
  const word = text.match(SOLUTION_WORDS);
  if (word && BUILD_VERBS.test(text)) {
    out.push(finding("SOLUTION_PRESUPPOSED", "outcome_statement", word[0],
      `Names a solution ("${word[0]}") instead of the problem, which rules out approaches the market might offer.`, "rule"));
  }
  const days = Number(c.duration_days);
  if (!c.duration_days && c.duration_days !== 0) {
    out.push(finding("TIMELINE_INFEASIBLE", "duration_days", null, "No pilot duration is given.", "rule"));
  } else if (days < 30 || days > 365) {
    out.push(finding("TIMELINE_INFEASIBLE", "duration_days", String(c.duration_days),
      days < 30 ? "Under 30 days rarely gives enough readings to tell a change from noise." : "Over a year is a deployment, not a pilot.", "rule"));
  }
  return out;
}

const SYSTEM = `You review a government innovation challenge notice before it is published.
Report only real defects, using exactly these classes:
${taxonomy.classes.map((c) => `- ${c.code}: ${c.description} Bad: "${c.example_bad}" Good: "${c.example_good}"`).join("\n")}

Answer with JSON only: {"defects": [{"code": "<CLASS>", "field": "<field name from the notice>", "span": "<exact words copied from that field, or empty>", "why": "<one plain sentence>"}]}.
An empty list is a good answer when the notice is sound. Never invent text that is not in the notice.`;

async function modelCheck(c) {
  const notice = Object.fromEntries(NOTICE_FIELDS.filter((f) => c[f] != null && c[f] !== "").map((f) => [f, String(c[f])]));
  const client = llm();
  const res = await client.chat.completions.create({
    model: client.model,
    temperature: 0,
    max_tokens: 1200,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify(notice) }],
  }, { timeout: 20000, maxRetries: 0 });
  const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
  const list = Array.isArray(parsed.defects) ? parsed.defects : [];
  // Keep only what can be checked: a known class, a real field, and a span that is really there.
  return {
    model: res.model,
    findings: list.filter((d) => LABEL[d?.code] && NOTICE_FIELDS.includes(d.field) && typeof d.why === "string")
      .slice(0, 12)
      .map((d) => {
        const span = typeof d.span === "string" && d.span && String(c[d.field] ?? "").includes(d.span) ? d.span : null;
        return finding(d.code, d.field, span, d.why.slice(0, 400), "model");
      }),
  };
}

// The report stored with the challenge. The model is optional: if it is unreachable the
// rule findings still stand, and the report says the model did not run.
export async function qualityReport(c, { useModel = true } = {}) {
  const rules = ruleCheck(c);
  let model = null, model_error = null, found = [];
  if (useModel) {
    try { ({ model, findings: found } = await modelCheck(c)); }
    catch (err) { model_error = err.message.slice(0, 200); }
  }
  const seen = new Set(rules.map((r) => `${r.code}:${r.field}`));
  const defects = [...rules, ...found.filter((f) => !seen.has(`${f.code}:${f.field}`))];
  const text = JSON.stringify(Object.fromEntries(NOTICE_FIELDS.map((f) => [f, c[f] ?? null])));
  return {
    checked_at: nowIso(),
    text_sha256: createHash("sha256").update(text).digest("hex"),
    taxonomy_version: taxonomy.version,
    model, model_error,
    defects,
  };
}
