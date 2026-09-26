// POST /api/challenges  -> create a challenge (refused without a baseline)
// GET  /api/challenges  -> the 20 most recent, to confirm writes persisted
import { db, BASELINE_GATE, CHALLENGE_FIELDS } from "./_lib.js";

const REQUIRED = ["department", "outcome_statement", "kpi_name", ...BASELINE_GATE];
const NUMERIC = ["baseline_value", "duration_days"];

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { rows } = await db().query(
        `select id, department, district, outcome_statement, kpi_name, baseline_value,
                baseline_source, baseline_method, created_at
           from challenges order by created_at desc limit 20`,
      );
      return res.status(200).json(rows);
    }
    if (req.method !== "POST") return res.status(405).json({ error: "GET or POST only" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const values = Object.fromEntries(
      CHALLENGE_FIELDS.map((f) => [f, typeof body[f] === "string" ? body[f].trim() : body[f] ?? ""]),
    );

    // The same gate as the form, enforced here so it can't be skipped with curl.
    const missing = REQUIRED.filter((f) => values[f] === "" || values[f] == null);
    if (missing.length) return res.status(422).json({ error: "missing required fields", missing });
    for (const f of NUMERIC) {
      if (values[f] !== "" && !Number.isFinite(Number(values[f]))) {
        return res.status(422).json({ error: `${f} must be a number` });
      }
    }

    const params = CHALLENGE_FIELDS.map((f) =>
      values[f] === "" ? null : NUMERIC.includes(f) ? Number(values[f]) : values[f],
    );
    const { rows } = await db().query(
      `insert into challenges (${CHALLENGE_FIELDS.join(", ")})
       values (${CHALLENGE_FIELDS.map((_, i) => `$${i + 1}`).join(", ")})
       returning id, created_at`,
      params,
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
