// Shared by every function. Files starting with "_" are not routed by Vercel.
import pg from "pg";
import OpenAI from "openai";

// Grok via xAI's OpenAI-compatible API; override the model without a code change.
export const LLM_MODEL = process.env.LLM_MODEL || "grok-4.7";
export const EMBED_MODEL = "text-embedding-3-small"; // 1536 dims, matches records.embedding

let pool;
export function db() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    pool = new pg.Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 3 });
  }
  return pool;
}

// The three fields the composer refuses to submit without.
export const BASELINE_GATE = ["baseline_value", "baseline_source", "baseline_method"];

export const CHALLENGE_FIELDS = [
  "department", "sector", "district", "outcome_statement", "kpi_name", "kpi_unit",
  "kpi_definition", "baseline_value", "baseline_window", "baseline_source",
  "baseline_method", "comparison_unit", "duration_days",
];

export async function checkDb() {
  const { rows } = await db().query(
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_name = any($1)`,
    [["challenges", "records", "readings", "signatures"]],
  );
  const found = rows.map((r) => r.table_name).sort();
  if (found.length !== 4) throw new Error(`expected 4 tables, found: ${found.join(", ") || "none"}`);
  return found;
}

let grok;
export function llm() {
  if (!grok) {
    if (!process.env.XAI_API_KEY) throw new Error("XAI_API_KEY is not set");
    grok = new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: "https://api.x.ai/v1" });
  }
  return grok;
}

export async function checkLlm() {
  const response = await llm().chat.completions.create({
    model: LLM_MODEL,
    max_tokens: 256,
    messages: [{ role: "user", content: "Reply with exactly: register ok" }],
  });
  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("LLM answered with no text");
  return { model: response.model, text };
}

export async function checkEmbeddings() {
  const client = new OpenAI();
  const out = await client.embeddings.create({ model: EMBED_MODEL, input: "complaint-to-collection time" });
  const vec = out.data[0]?.embedding ?? [];
  if (vec.length !== 1536) throw new Error(`expected a 1536-dim vector, got ${vec.length}`);
  return { model: EMBED_MODEL, dims: vec.length };
}

// Runs each check independently so one failure doesn't hide the others.
export async function runChecks(names) {
  const checks = { db: checkDb, llm: checkLlm, embeddings: checkEmbeddings };
  const result = {};
  for (const name of names) {
    try {
      result[name] = { ok: true, ...wrap(await checks[name]()) };
    } catch (err) {
      result[name] = { ok: false, error: err.message };
    }
  }
  return result;
}

const wrap = (v) => (Array.isArray(v) ? { tables: v } : v);
