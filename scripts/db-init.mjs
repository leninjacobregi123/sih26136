// Item 3: create the extension and the four tables in whatever DATABASE_URL points at.
//   npm run db:init
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const { db, checkDb } = await import("../api/_lib.js");

await db().query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
console.log("tables:", (await checkDb()).join(", "));
await db().end();
