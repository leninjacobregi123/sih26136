// Create a real account. There is no sign-up page: the programme desk makes accounts.
//   npm run user:add -- --email officer@example.gov.in --role department --name "A. Officer" [--org "Public Health, Nagpur"]
// Prints a generated password once. Roles: department admin startup evaluator validator finance public
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const { values: a } = parseArgs({ options: {
  email: { type: "string" }, role: { type: "string" }, name: { type: "string" }, org: { type: "string" } } });
if (!a.email || !a.role || !a.name) {
  console.error('usage: npm run user:add -- --email <email> --role <role> --name "<name>" [--org "<org>"]');
  process.exit(1);
}
const { db } = await import("../api/_lib.js");
const { createUser } = await import("../api/_auth.js");

const password = randomBytes(12).toString("base64url");
try {
  const user = await createUser({ ...a, password });
  console.log(`created ${user.email} (${user.role})\npassword: ${password}\nShare it privately; it is not stored anywhere readable.`);
} catch (err) {
  console.error(err.code === "23505" ? `${a.email} already has an account` : err.message);
  process.exitCode = 1;
}
await db().end();
