// GET  /api/auth                                  -> { user } (null when signed out)
// POST /api/auth {action:"login", email, password} -> sign in with a real account
// POST /api/auth {action:"demo", role}             -> sign in as that role's demo account
// POST /api/auth {action:"logout"}
import { route, readJson, HttpError } from "./_http.js";
import { currentUser, login, demoUser, setSession, clearSession, ROLES } from "./_auth.js";
import { scenario } from "./_passport.js";

export default route(async (req, res) => {
  if (req.method === "GET") return res.status(200).json({ user: await currentUser(req), roles: ROLES });
  if (req.method !== "POST") throw new HttpError(405, "GET or POST only");

  const body = readJson(req);
  let user = null;
  if (body.action === "login") user = await login(body.email, body.password);
  else if (body.action === "demo") {
    const role = scenario.roles.find((r) => r.id === body.role);
    if (!role) throw new HttpError(400, "unknown role");
    user = await demoUser(role.id, role.name);
  } else if (body.action === "logout") {
    clearSession(req, res);
    return res.status(200).json({ user: null });
  } else throw new HttpError(400, "action must be login, demo or logout");

  setSession(req, res, user);
  return res.status(200).json({ user });
});
