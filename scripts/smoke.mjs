// Item 2 locally: one real LLM call, one real embedding call, and the DB check.
//   npm run smoke                 -> uses .env.local
//   npm run smoke -- --url=https://<app>.vercel.app   -> asks the deployed app instead
import { existsSync } from "node:fs";

const urlArg = process.argv.find((a) => a.startsWith("--url="));

if (urlArg) {
  const base = urlArg.slice(6).replace(/\/$/, "");
  const res = await fetch(`${base}/api/health?apis=1`);
  const body = await res.json();
  console.log(JSON.stringify(body, null, 2));
  process.exit(body.ok ? 0 : 1);
}

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const { runChecks } = await import("../api/_lib.js");
const names = ["llm", "embeddings", ...(process.env.DATABASE_URL ? ["db"] : [])];
const result = await runChecks(names);
for (const [name, r] of Object.entries(result)) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${name.padEnd(10)} ${r.ok ? JSON.stringify({ ...r, ok: undefined }) : r.error}`);
}
process.exit(Object.values(result).every((r) => r.ok) ? 0 : 1);
