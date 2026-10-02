// The one way pages talk to /api. JSON in and out; failures become ApiError with the
// server's message and, for a 422, the input it is about (err.field).
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.status = status;
    this.body = body ?? {};
    this.field = body?.field ?? null;
  }
}

// GitHub Pages serves the static files with no /api behind them.
export const STATIC_HOST = /(^|\.)leninjacobregi\.me$|\.github\.io$/.test(location.hostname);

export async function api(path, { method = "GET", body, signal } = {}) {
  if (STATIC_HOST) throw new ApiError(0, { error: "This preview has no backend. Open the app on its live address." });
  let res;
  try {
    res = await fetch(path, {
      method, signal, credentials: "same-origin",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError(0, { error: "Can't reach the server. Check your connection and try again." });
  }
  const json = res.headers.get("content-type")?.includes("application/json") ? await res.json().catch(() => null) : null;
  if (!json) throw new ApiError(res.status, { error: res.status >= 500 ? "The server had a problem. Try again in a moment." : "Unexpected response from the server." });
  if (!res.ok) throw new ApiError(res.status, json);
  return json;
}

// Where to send someone who needs to sign in, so they come back to this page after.
export const signInUrl = (to = location.pathname + location.search + location.hash) =>
  `/sign-in?next=${encodeURIComponent(to)}`;

// Only ever return to a path on this site.
export const safeNext = (next, fallback = "/") =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
