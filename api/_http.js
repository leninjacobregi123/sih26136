// Request plumbing shared by the functions: typed errors, JSON-only POSTs, one error handler.

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// POST bodies must be JSON. A cross-site form can't send application/json without a
// CORS preflight, which these functions never answer, so this also stops CSRF.
export function readJson(req) {
  if (!req.headers["content-type"]?.includes("application/json")) {
    throw new HttpError(415, "send JSON (Content-Type: application/json)");
  }
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
  if (typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "body must be a JSON object");
  return body;
}

export function route(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (err) {
      if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra });
      if (err instanceof SyntaxError) return res.status(400).json({ error: "body is not valid JSON" });
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  };
}
