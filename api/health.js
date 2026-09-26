// GET /api/health          -> database only (free)
// GET /api/health?apis=1   -> database + one real LLM call + one real embedding call
import { runChecks } from "./_lib.js";

export default async function handler(req, res) {
  const names = req.query.apis ? ["db", "llm", "embeddings"] : ["db"];
  const result = await runChecks(names);
  const ok = Object.values(result).every((r) => r.ok);
  res.status(ok ? 200 : 500).json({ ok, ...result });
}
