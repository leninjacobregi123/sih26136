// One-shot: create the Supabase project, write DATABASE_URL into .env.local,
// and create the four tables. Needs SUPABASE_ACCESS_TOKEN in .env.local
// (supabase.com/dashboard/account/tokens). Never prints the token or password.
//   npm run supabase:setup
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const ENV = ".env.local";
if (existsSync(ENV)) process.loadEnvFile(ENV);

const API = process.env.SUPABASE_API || "https://api.supabase.com";
const NAME = process.env.SUPABASE_PROJECT || "sih26136";
const REGION = "ap-south-1"; // Mumbai
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();

if (!token) stop(`Add SUPABASE_ACCESS_TOKEN=<token> to ${ENV} (create one at supabase.com/dashboard/account/tokens).`);
if (process.env.DATABASE_URL && !/@host\//.test(process.env.DATABASE_URL)) {
  stop(`DATABASE_URL is already set in ${ENV}. To (re)create the tables run: npm run db:init. For a new project, delete that line first.`);
}

async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}

// 1. Organisation
const orgs = await api("GET", "/v1/organizations");
if (!orgs.length) stop("This Supabase account has no organisation. Create one in the dashboard first.");
const org = orgs.find((o) => o.slug === process.env.SUPABASE_ORG) ?? orgs[0];
if (orgs.length > 1 && !process.env.SUPABASE_ORG) {
  console.log(`Several organisations; using "${org.name}". Set SUPABASE_ORG=<slug> to choose: ${orgs.map((o) => o.slug).join(", ")}`);
}

// 2. Project (refuse to guess at one that already exists: its password isn't ours)
const existing = (await api("GET", "/v1/projects")).find((p) => p.name === NAME);
if (existing) stop(`A project named "${NAME}" already exists (ref ${existing.ref}). Delete it in the dashboard or set SUPABASE_PROJECT=<other name>.`);

const dbPass = randomBytes(24).toString("base64url"); // URL-safe, so it needs no escaping
const base = { name: NAME, organization_slug: org.slug, db_pass: dbPass };
let project;
try {
  project = await api("POST", "/v1/projects", { ...base, region: REGION });
} catch (err) {
  if (err.status !== 400 && err.status !== 422) throw err;
  project = await api("POST", "/v1/projects", { ...base, region_selection: { type: "specific", code: REGION } });
}
console.log(`Created project "${NAME}" (ref ${project.ref}) in ${REGION}. Waiting for it to come up…`);

// Save the password immediately, so a later failure doesn't lose it.
setEnv({ SUPABASE_PROJECT_REF: project.ref, SUPABASE_DB_PASSWORD: dbPass });

// 3. Wait for healthy (usually 1-3 minutes)
for (let i = 0, last; ; i++) {
  const { status } = await api("GET", `/v1/projects/${project.ref}`);
  if (status !== last) console.log(`  ${status}`), (last = status);
  if (status === "ACTIVE_HEALTHY") break;
  if (i >= 60) stop(`Still "${status}" after 10 minutes. Re-run later: npm run supabase:setup won't recreate it; set DATABASE_URL by hand.`);
  await sleep(10_000);
}

// 4. Connection string: the transaction pooler (IPv4, port 6543), which serverless functions need
let pooler;
for (let i = 0; i < 12 && !pooler; i++) {
  const configs = await api("GET", `/v1/projects/${project.ref}/config/database/pooler`).catch(() => []);
  pooler = configs.find((c) => c.database_type === "PRIMARY" && c.pool_mode === "transaction") ?? configs[0];
  if (!pooler) await sleep(5_000);
}
if (!pooler) stop("The project is up but its pooler config isn't available yet. Re-run in a minute.");
const url = `postgresql://${pooler.db_user}:${dbPass}@${pooler.db_host}:${pooler.db_port}/${pooler.db_name}`;
setEnv({ DATABASE_URL: url });
process.env.DATABASE_URL = url;
console.log(`DATABASE_URL written to ${ENV} (${pooler.db_host}:${pooler.db_port}).`);

// 5. Tables. The pooler can lag the project by a minute, so retry the first connection.
const { db, checkDb } = await import("../api/_lib.js");
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
for (let i = 0; ; i++) {
  try {
    await db().query(schema);
    break;
  } catch (err) {
    if (i >= 11) throw err;
    await sleep(10_000);
  }
}
console.log("Tables:", (await checkDb()).join(", "));
await db().end();
console.log("Done. Next: npm run smoke");

function setEnv(pairs) {
  let text = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
  for (const [k, v] of Object.entries(pairs)) {
    const line = `${k}=${v}`;
    const re = new RegExp(`^${k}=.*$`, "m");
    text = re.test(text) ? text.replace(re, () => line) : text.replace(/\n*$/, () => `\n${line}\n`);
  }
  writeFileSync(ENV, text);
  chmodSync(ENV, 0o600); // it holds keys: owner-only
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function stop(msg) {
  console.error(msg);
  process.exit(1);
}
