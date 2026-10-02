// GET  /api/passports                    -> every pilot you can see, with what each waits on
// GET  /api/passports?feed=1              -> the last 30 actions on pilots you can see
// GET  /api/passports?id=<record id>     -> one passport, the actions open to you, and what it waits on
// POST /api/passports {id, action, ...}  -> run one action (see _actions.js)
// Signed-in users only. Demo accounts see the fictional sample pilots and nothing real.
// The demo passport is served by /api/demo.
import { db } from "./_lib.js";
import { route, readJson, HttpError } from "./_http.js";
import { requireUser } from "./_auth.js";
import { getBundle, SAMPLE_SQL, STATES, LEARNING } from "./_passport.js";
import { runAction, availableActions, pendingActions, isUuid } from "./_actions.js";
import { slaStatus } from "./_procurement.js";

async function bundleFor(user, id) {
  const b = isUuid(id) && await getBundle(id);
  // Demo accounts are public, so they may read the fictional sample pilots and nothing real.
  if (!b || b.challenge.is_simulated || (user.is_demo && !b.sample)) throw new HttpError(404, "No such passport.");
  return { ...b, actions: await availableActions(user, b), pending: await pendingActions(b) };
}

// One list row: what a table, a work queue and search need, derived from the passport so the
// response stays small.
async function row(user, r) {
  const mini = { record: r, passport: r.passport, challenge: { is_simulated: false }, sample: r.sample };
  const ledger = (r.passport.milestones ?? []).map((m) => slaStatus(m.payment));
  const mine = await availableActions(user, mini);
  const waiting = await pendingActions(mini);
  return {
    id: r.id, passport_state: r.passport_state, sample: r.sample,
    step: r.passport_state === LEARNING ? null : STATES.indexOf(r.passport_state) + 1,
    department: r.department, district: r.district, sector: r.sector, outcome_statement: r.outcome_statement,
    kpi_name: r.kpi_name, kpi_unit: r.kpi_unit, baseline_value: r.baseline_value, target_value: r.target_value,
    target_direction: r.target_direction, startup: r.passport.startup?.name ?? null,
    created_at: r.created_at, last_activity: r.last_activity,
    my_actions: mine.map((a) => ({ action: a.name, label: a.label, milestones: a.milestones?.map((m) => m.n) })),
    waiting_on: [...new Set(waiting.map((w) => w.role_label))],
    overdue: ledger.filter((l) => l.status === "overdue").length,
    due_soon: ledger.filter((l) => l.status === "on track" && l.days_left <= 7).length,
  };
}

export default route(async (req, res) => {
  const user = await requireUser(req);
  if (req.method === "GET") {
    if (req.query.id) return res.status(200).json(await bundleFor(user, req.query.id));
    const visible = `r.passport is not null and not c.is_simulated ${user.is_demo ? `and ${SAMPLE_SQL}` : ""}`;

    if (req.query.feed) {
      const { rows } = await db().query(
        `select a.id, a.at, a.actor_role, a.action, a.detail->>'to' as to_state, r.id as record_id, c.kpi_name, c.district
           from audit_events a join records r on r.id = a.record_id join challenges c on c.id = r.challenge_id
          where ${visible}
          order by a.at desc, a.id desc
          limit 30`);
      return res.status(200).json({ events: rows });
    }

    const { rows } = await db().query(
      `select r.id, r.passport_state, r.passport, r.startup_user_id, (${SAMPLE_SQL}) as sample,
              c.department, c.district, c.sector, c.outcome_statement, c.kpi_name, c.kpi_unit, c.baseline_value,
              c.target_value, c.target_direction, c.created_at,
              (select max(at) from audit_events a where a.record_id = r.id) as last_activity
         from records r join challenges c on c.id = r.challenge_id
        where ${visible}
        order by last_activity desc nulls last
        limit 200`);
    return res.status(200).json({ passports: await Promise.all(rows.map((r) => row(user, r))) });
  }
  if (req.method !== "POST") throw new HttpError(405, "GET or POST only");

  const { id, action, ...input } = readJson(req);
  const out = await runAction(user, id, action, input);
  const bundle = await bundleFor(user, id);
  return res.status(out.refused ? 409 : 200).json(out.refused ? { error: out.refused, ...bundle } : bundle);
});
