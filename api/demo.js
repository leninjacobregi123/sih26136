// GET  /api/demo                     -> the demo passport, audit trail and next step (open to all)
// POST /api/demo {action:"load"}      -> (re)load the seeded OPD scenario at Draft
// POST /api/demo {action:"reset"}     -> remove the demo entirely
// POST /api/demo {action:"advance"}   -> apply the next step as the signed-in demo account
// POSTs need a session: sign in with any demo role (POST /api/auth {action:"demo"}).
import { route, readJson, HttpError } from "./_http.js";
import { requireUser } from "./_auth.js";
import { getDemo, loadDemo, resetDemo, advanceDemo } from "./_passport.js";

export default route(async (req, res) => {
  if (req.method === "GET") return res.status(200).json(await getDemo());
  if (req.method !== "POST") throw new HttpError(405, "GET or POST only");

  const body = readJson(req);
  const user = await requireUser(req);
  if (!user.is_demo && user.role !== "admin") throw new HttpError(403, "Use a demo role to drive the demo.");
  if (body.action === "load") await loadDemo();
  else if (body.action === "reset") await resetDemo();
  else if (body.action === "advance") {
    const out = await advanceDemo(user);
    if (out.refused) return res.status(409).json({ error: out.refused, ...(await getDemo()) });
  } else throw new HttpError(400, "action must be load, reset or advance");

  return res.status(200).json(await getDemo());
});
