// POST /api/challenges  -> create a challenge and its passport (Department Officer only;
//                          refused without a baseline and a target). Runs the quality gate.
// POST /api/challenges {check_only: true, ...} -> the quality report for a draft; nothing saved
// GET  /api/challenges  -> the 20 most recent, to confirm writes persisted (signed in)
import { db } from "./_lib.js";
import { route, readJson, HttpError } from "./_http.js";
import { requireUser } from "./_auth.js";
import { createChallenge, checkChallenge } from "./_actions.js";

export default route(async (req, res) => {
  const user = await requireUser(req);
  if (req.method === "GET") {
    const { rows } = await db().query(
      `select id, department, district, outcome_statement, kpi_name, baseline_value, target_value,
              target_direction, baseline_source, baseline_method, created_at
         from challenges where not is_simulated order by created_at desc limit 20`,
    );
    return res.status(200).json(rows);
  }
  if (req.method !== "POST") throw new HttpError(405, "GET or POST only");
  const body = readJson(req);
  if (body.check_only) return res.status(200).json(await checkChallenge(user, body));
  return res.status(201).json(await createChallenge(user, body));
});
