// Run the app locally the way Vercel does: the root .html files, and api/*.js as functions.
//   npm run dev               -> http://localhost:3000 (uses .env.local)
//   PORT=4000 npm run dev
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const root = new URL("../", import.meta.url);
const port = Number(process.env.PORT) || 3000;

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    const api = url.pathname.match(/^\/api\/([a-z-]+)$/);
    if (api) {
      const file = new URL(`api/${api[1]}.js`, root);
      if (!existsSync(file)) return send(res, 404, "text/plain", "no such function");
      // Vercel's helpers: req.query, a parsed JSON body, res.status().json().
      req.query = Object.fromEntries(url.searchParams);
      const raw = await new Promise((ok) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => ok(b)); });
      req.body = raw && req.headers["content-type"]?.includes("json") ? JSON.parse(raw) : raw;
      res.status = (code) => ((res.statusCode = code), res);
      res.json = (obj) => send(res, res.statusCode, "application/json", JSON.stringify(obj));
      const { default: handler } = await import(file);
      return await handler(req, res);
    }
    // Only the pages at the root are served, as on Vercel.
    const page = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    if (!/^[a-z0-9-]+\.html$/.test(page) || !existsSync(new URL(page, root))) {
      return send(res, 404, "text/plain", "not found");
    }
    send(res, 200, "text/html; charset=utf-8", readFileSync(new URL(page, root)));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, "application/json", JSON.stringify({ error: err.message }));
  }
}).listen(port, () => console.log(`http://localhost:${port}`));

function send(res, code, type, body) {
  res.writeHead(code, { "Content-Type": type });
  res.end(body);
}
