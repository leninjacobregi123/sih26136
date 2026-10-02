// GET  /api/passports                    -> every real pilot's passport, newest activity first
// GET  /api/passports?id=<record id>     -> one passport, plus the actions open to you
// POST /api/passports {id, action, ...}  -> run one action (see _actions.js)
// Signed-in users only. The demo passport is served by /api/demo.
import { db } from "./_lib.js";
import { route, readJson, HttpError } from "./_http.js";
import { requireUser } from "./_auth.js";
import { getBundle } from "./_passport.js";
import { runAction, availableActions, isUuid } from "./_actions.js";

async function bundleFor(user, id) {
  const b = isUuid(id) && await getBundle(id);
  if (!b || b.challenge.is_simulated) throw new HttpError(404, "No such passport.");
  return { ...b, actions: await availableActions(user, b) };
}

export default route(async (req, res) => {
  const user = await requireUser(req);
  if (req.method === "GET") {
    if (req.query.id) return res.status(200).json(await bundleFor(user, req.query.id));
    const { rows } = await db().query(
      `select r.id, r.passport_state, r.passport->'startup'->>'name' as startup, c.department, c.district,
              c.outcome_statement, c.kpi_name, c.created_at,
              (select max(at) from audit_events a where a.record_id = r.id) as last_activity
         from records r join challenges c on c.id = r.challenge_id
        where r.passport is not null and not c.is_simulated
        order by last_activity desc nulls last
        limit 200`);
    return res.status(200).json({ passports: rows });
  }
  if (req.method !== "POST") throw new HttpError(405, "GET or POST only");

  const { id, action, ...input } = readJson(req);
  const out = await runAction(user, id, action, input);
  const bundle = await bundleFor(user, id);
  return res.status(out.refused ? 409 : 200).json(out.refused ? { error: out.refused, ...bundle } : bundle);
});
