// GET  /api/profile   -> your startup profile (Startup accounts)
// POST /api/profile   -> save it. What screening reads; self-declared until registry checks exist.
import { db } from "./_lib.js";
import { route, readJson, HttpError } from "./_http.js";
import { requireUser } from "./_auth.js";

const COLS = ["dpiit_recognised", "dpiit_number", "udyam_registered", "sectors", "districts", "capabilities",
  "needs_write_access", "data_needed", "prior_deployments", "prior_evidence", "gem_ratings", "available_from"];

const bad = (m, field) => new HttpError(422, m, field ? { field } : {});
const str = (v, name, max, field) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length > max) throw bad(`${name} is longer than ${max} characters`, field);
  return s;
};
const list = (v, name) => (Array.isArray(v) ? v : String(v ?? "").split(","))
  .map((x) => str(String(x), name, 80)).filter(Boolean).slice(0, 20);
const int = (v, name, field) => {
  const n = Number(v ?? 0);
  if (!Number.isInteger(n) || n < 0 || n > 10000) throw bad(`${name} must be a whole number`, field);
  return n;
};
const bool = (v) => v === true || v === "yes" || v === "on";

export default route(async (req, res) => {
  const user = await requireUser(req);
  if (user.role !== "startup" || user.is_demo) throw new HttpError(403, "Profiles are for startup accounts.");
  if (req.method === "GET") {
    const { rows: [p] } = await db().query(
      `select ${COLS.map((c) => (c === "available_from" ? "available_from::text" : c)).join(", ")}, updated_at
         from startup_profiles where user_id = $1`, [user.id]);
    return res.status(200).json({ profile: p ?? null, user });
  }
  if (req.method !== "POST") throw new HttpError(405, "GET or POST only");

  const b = readJson(req);
  const from = str(b.available_from, "available from", 10, "available_from");
  if (from && (!/^\d{4}-\d{2}-\d{2}$/.test(from) || Number.isNaN(Date.parse(from)))) throw bad("available from must be a date", "available_from");
  const v = {
    dpiit_recognised: bool(b.dpiit_recognised),
    dpiit_number: str(b.dpiit_number, "DPIIT number", 40, "dpiit_number") || null,
    udyam_registered: bool(b.udyam_registered),
    sectors: list(b.sectors, "sector"),
    districts: list(b.districts, "district"),
    capabilities: str(b.capabilities, "capabilities", 2000, "capabilities"),
    needs_write_access: bool(b.needs_write_access),
    data_needed: ["none", "pseudonymised", "personal"].includes(b.data_needed) ? b.data_needed : (() => { throw bad("choose the data you need", "data_needed"); })(),
    prior_deployments: int(b.prior_deployments, "prior deployments", "prior_deployments"),
    prior_evidence: str(b.prior_evidence, "prior evidence", 2000, "prior_evidence"),
    gem_ratings: int(b.gem_ratings, "GeM ratings", "gem_ratings"),
    available_from: from || null,
  };
  if (!v.capabilities) throw bad("describe what your product does", "capabilities");
  await db().query(
    `insert into startup_profiles (user_id, ${COLS.join(", ")}, updated_at)
     values ($1, ${COLS.map((_, i) => `$${i + 2}`).join(", ")}, now())
     on conflict (user_id) do update set ${COLS.map((c) => `${c} = excluded.${c}`).join(", ")}, updated_at = now()`,
    [user.id, ...COLS.map((c) => v[c])]);
  return res.status(200).json({ profile: v, user });
});
