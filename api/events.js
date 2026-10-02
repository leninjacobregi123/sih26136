// GET /api/events?record=<record id>  (text/event-stream)
// New audit events for one passport, as they happen. Each connection lives about 9 s,
// inside any serverless time limit, then ends; EventSource reconnects on its own and
// resumes from Last-Event-ID, so nothing is missed between connections.
import { db } from "./_lib.js";
import { route, HttpError } from "./_http.js";
import { currentUser } from "./_auth.js";
import { isUuid } from "./_actions.js";
import { SAMPLE_SQL } from "./_passport.js";

const WINDOW_MS = 9000;
const POLL_MS = 1500;

export default route(async (req, res) => {
  if (req.method !== "GET") throw new HttpError(405, "GET only");
  const id = req.query.record;
  const { rows: [rec] } = isUuid(id)
    ? await db().query(
        `select c.is_simulated, (${SAMPLE_SQL}) as sample from records r join challenges c on c.id = r.challenge_id where r.id = $1`, [id])
    : { rows: [] };
  if (!rec) throw new HttpError(404, "No such passport.");
  // The demo is open to anyone; real passports need an account.
  if (!rec.is_simulated) {
    const user = await currentUser(req);
    if (!user) throw new HttpError(401, "Sign in first.");
    if (user.is_demo && !rec.sample) throw new HttpError(404, "No such passport.");
  }

  let after = Number(req.headers["last-event-id"] ?? req.query.after ?? 0) || 0;
  if (!after) {
    const { rows: [m] } = await db().query("select coalesce(max(id), 0)::int as id from audit_events where record_id = $1", [id]);
    after = m.id;
  }
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", "X-Accel-Buffering": "no" });
  res.write("retry: 1000\n\n");

  let open = true;
  req.on("close", () => (open = false));
  const end = Date.now() + WINDOW_MS;
  while (open && Date.now() < end) {
    const { rows } = await db().query(
      "select id, at, actor_role, actor_name, action from audit_events where record_id = $1 and id > $2 order by id",
      [id, after]);
    for (const e of rows) {
      res.write(`id: ${e.id}\ndata: ${JSON.stringify(e)}\n\n`);
      after = e.id;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  res.end();
});
