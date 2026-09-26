// GET /api/similar?id=PR-2026-0001  -> the 5 records closest to that one.
// Compares vectors already stored by the seed script, so nothing is embedded here.
import { db } from "./_lib.js";

export default async function handler(req, res) {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "pass ?id=PR-2026-0001" });
    const { rows } = await db().query(
      `with target as (
         select r.id, r.embedding from records r join challenges c on c.id = r.challenge_id
          where c.pr_id = $1 and r.embedding is not null limit 1)
       select c.pr_id, c.department, c.district, c.outcome_statement, r.result_direction,
              r.adoption_pct, round((1 - (r.embedding <=> t.embedding))::numeric, 3) as similarity
         from target t, records r join challenges c on c.id = r.challenge_id
        where r.id <> t.id and r.embedding is not null
        order by r.embedding <=> t.embedding
        limit 5`,
      [id],
    );
    if (!rows.length) return res.status(404).json({ error: `no embedded record ${id}` });
    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
