// GET  /api/demo                               -> the demo passport, audit trail and next step
// POST /api/demo {action:"load"}                -> (re)load the seeded OPD scenario at Draft
// POST /api/demo {action:"reset"}               -> remove the demo entirely
// POST /api/demo {action:"advance", role:"..."} -> apply the next step; refused for the wrong role
// The role is the demo's role switch, not a login. Everything here is simulated data.
import { getDemo, loadDemo, resetDemo, advanceDemo, StepRefused } from "./_passport.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") return res.status(200).json(await getDemo());
    if (req.method !== "POST") return res.status(405).json({ error: "GET or POST only" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    if (body.action === "load") await loadDemo();
    else if (body.action === "reset") await resetDemo();
    else if (body.action === "advance") {
      const out = await advanceDemo(body.role);
      if (out.refused) return res.status(409).json({ error: out.refused, ...(await getDemo()) });
    } else return res.status(400).json({ error: "action must be load, reset or advance" });

    return res.status(200).json(await getDemo());
  } catch (err) {
    if (err instanceof StepRefused) return res.status(err.status).json({ error: err.message, ...err.extra });
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
