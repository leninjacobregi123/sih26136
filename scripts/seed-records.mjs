// Load Jones's (M5) synthetic records into the database, embedding each one with the
// local Ollama model. Run on the laptop; safe to re-run (existing ids are skipped).
//   python3 scripts/check_records.py records.csv   # check the rules first
//   npm run seed -- records.csv
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const { db, embed } = await import("../api/_lib.js");

const file = process.argv[2];
if (!file) {
  console.error("usage: npm run seed -- path/to/records.csv");
  process.exit(1);
}

const rows = parseCsv(readFileSync(file, "utf8").replace(/^﻿/, ""));
const num = (v) => (v === "" || v == null ? null : Number(v));

// What a record is "about": the text two records are compared on.
const describe = (r) =>
  `${r.sector} in ${r.district}. ${r.outcome_statement}. Measured as ${r.kpi_name} (${r.kpi_unit}).`;

const vectors = await embed(rows.map(describe));
const client = await db().connect();
let added = 0;
try {
  for (const [i, r] of rows.entries()) {
    await client.query("begin");
    const ch = await client.query(
      `insert into challenges (pr_id, department, sector, district, outcome_statement, kpi_name,
         kpi_unit, baseline_value, baseline_window, baseline_source, comparison_unit, duration_days)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       on conflict (pr_id) do nothing returning id`,
      [r.record_id, r.department, r.sector, r.district, r.outcome_statement, r.kpi_name, r.kpi_unit,
       num(r.baseline_value), r.baseline_window, r.baseline_source, r.comparison_unit, num(r.duration_days)],
    );
    if (!ch.rows.length) {
      await client.query("rollback");
      continue;
    }
    const rec = await client.query(
      `insert into records (challenge_id, status, post_value, delta, adoption_pct, pilot_cost_inr,
         result_direction, is_synthetic, embedding)
       values ($1, 'complete', $2, $3, $4, $5, $6, $7, $8) returning id`,
      [ch.rows[0].id, num(r.post_value), num(r.post_value) - num(r.baseline_value), num(r.adoption_pct),
       num(r.pilot_cost_inr), r.result_direction, r.is_synthetic.toUpperCase() === "TRUE",
       JSON.stringify(vectors[i])],
    );
    await client.query(
      `insert into signatures (record_id, signer_name, signer_role, dissent_note) values ($1, $2, $3, $4)`,
      [rec.rows[0].id, "Synthetic verifier", r.verifier_role,
       /^none( recorded)?$/i.test(r.dissent_note.trim()) ? null : r.dissent_note],
    );
    await client.query("commit");
    added++;
  }
} catch (err) {
  await client.query("rollback");
  throw err;
} finally {
  client.release();
}
console.log(`${added} added, ${rows.length - added} already present`);
await db().end();

// Minimal RFC 4180 parser: quoted fields, doubled quotes, commas and newlines inside quotes.
function parseCsv(text) {
  const out = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') field += c, i++;
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") row.push(field), field = "";
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field), field = "";
      if (row.some((f) => f !== "")) out.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) row.push(field), out.push(row);
  const [header, ...data] = out;
  return data.map((cells) => Object.fromEntries(header.map((h, j) => [h.trim(), (cells[j] ?? "").trim()])));
}
