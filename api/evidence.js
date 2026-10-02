// GET /api/evidence?id=<file id> -> the evidence file, as a download.
// Any signed-in account except Public Viewer. Files are served as attachments with
// nosniff, so an uploaded file can never run as a page on this site.
import { db } from "./_lib.js";
import { route, HttpError } from "./_http.js";
import { requireUser } from "./_auth.js";
import { isUuid } from "./_actions.js";
import { SAMPLE_SQL } from "./_passport.js";

export default route(async (req, res) => {
  if (req.method !== "GET") throw new HttpError(405, "GET only");
  const user = await requireUser(req);
  if (user.role === "public") throw new HttpError(403, "Evidence files are not public; the passport shows their hashes.");
  const { rows: [f] } = isUuid(req.query.id)
    ? await db().query(
        `select f.filename, f.mime, f.sha256, f.data, (${SAMPLE_SQL}) as sample
           from evidence_files f join records r on r.id = f.record_id join challenges c on c.id = r.challenge_id
          where f.id = $1`, [req.query.id])
    : { rows: [] };
  if (!f || (user.is_demo && !f.sample)) throw new HttpError(404, "No such file.");
  res.writeHead(200, {
    "Content-Type": f.mime,
    "Content-Length": f.data.length,
    "Content-Disposition": `attachment; filename="${f.filename.replace(/"/g, "")}"`,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cache-Control": "private, no-store",
    "X-Evidence-SHA256": f.sha256,
  });
  res.end(f.data);
});
