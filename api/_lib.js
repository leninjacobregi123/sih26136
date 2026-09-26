// Shared by every function. Files starting with "_" are not routed by Vercel.
import pg from "pg";
import OpenAI from "openai";

// Either Groq or xAI (Grok); both speak the OpenAI API. Picked from the key's
// prefix so switching provider is a key swap, not a code change.
const PROVIDERS = {
  gsk_: { name: "groq", baseURL: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b" },
  "xai-": { name: "xai", baseURL: "https://api.x.ai/v1", model: "grok-4.7" },
};
function provider() {
  const key = process.env.LLM_API_KEY?.trim();
  if (!key) throw new Error("LLM_API_KEY is not set");
  const p = Object.entries(PROVIDERS).find(([prefix]) => key.startsWith(prefix))?.[1];
  if (!p) throw new Error("LLM_API_KEY is neither a Groq (gsk_) nor an xAI (xai-) key");
  return { ...p, key, model: process.env.LLM_MODEL || p.model };
}

// Embeddings run on this laptop's Ollama, never on Vercel: records are embedded
// once by scripts/seed-records.mjs and the live site only compares stored vectors.
export const EMBED_MODEL = "mxbai-embed-large";
export const EMBED_DIMS = 1024; // must match records.embedding in db/schema.sql
const OLLAMA = process.env.OLLAMA_URL || "http://localhost:11434";

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

let client;
export function llm() {
  if (!client) {
    const p = provider();
    client = new OpenAI({ apiKey: p.key, baseURL: p.baseURL });
    client.model = p.model;
    client.providerName = p.name;
  }
  return client;
}

export async function checkLlm() {
  const response = await llm().chat.completions.create({
    model: llm().model,
    max_tokens: 256,
    messages: [{ role: "user", content: "Reply with exactly: register ok" }],
  });
  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("LLM answered with no text");
  return { provider: llm().providerName, model: response.model, text };
}

export async function embed(texts) {
  let res;
  try {
    res = await fetch(`${OLLAMA}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
    });
  } catch {
    throw new Error(`Ollama is not reachable at ${OLLAMA}; start it with: ollama serve`);
  }
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const { embeddings } = await res.json();
  if (embeddings[0]?.length !== EMBED_DIMS) {
    throw new Error(`expected ${EMBED_DIMS}-dim vectors from ${EMBED_MODEL}, got ${embeddings[0]?.length}`);
  }
  return embeddings;
}

export async function checkEmbeddings() {
  const [vec] = await embed(["complaint-to-collection time"]);
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
