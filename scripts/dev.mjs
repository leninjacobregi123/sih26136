// Run the app locally the way Vercel serves it: pages and assets, api/*.js as functions, and
// vercel.json's clean URLs, rewrites, redirects and headers, so a CSP or routing problem shows
// up here before it shows up in production.
//   npm run dev               -> http://localhost:3000 (uses .env.local)
//   PORT=4000 npm run dev
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const root = new URL("../", import.meta.url);
const port = Number(process.env.PORT) || 3000;
const config = JSON.parse(readFileSync(new URL("vercel.json", root), "utf8"));

const TYPES = { html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8",
  svg: "image/svg+xml", woff2: "font/woff2", png: "image/png", ico: "image/x-icon", json: "application/json", txt: "text/plain; charset=utf-8" };

// vercel.json sources here use "/pilots/:id" params and "(.*)" groups; that's all we need.
const toRegex = (src) => new RegExp(`^${src.replace(/\./g, "\\.").replace(/:(\w+)/g, "(?<$1>[^/]+)")}$`);
const fill = (dest, groups) => dest.replace(/:(\w+)/g, (_, k) => encodeURIComponent(groups[k] ?? ""));

function match(rule, url) {
  const m = url.pathname.match(toRegex(rule.source));
  if (!m) return null;
  const groups = { ...m.groups };
  for (const h of rule.has ?? []) {
    if (h.type !== "query") return null;
    const v = url.searchParams.get(h.key);
    if (v == null) return null;
    if (h.value) {
      const hv = v.match(new RegExp(`^${h.value}$`));
      if (!hv) return null;
      Object.assign(groups, hv.groups);
    }
  }
  return groups;
}

const isFile = (rel) => { try { return statSync(new URL(rel, root)).isFile(); } catch { return false; } };
const safe = (rel) => /^[a-z0-9-]+\.(html|ico|svg|png|txt|webmanifest)$|^assets\/[a-z0-9/_.-]+$/i.test(rel) && !rel.includes("..");

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  for (const rule of config.headers ?? []) if (match(rule, url)) for (const h of rule.headers) res.setHeader(h.key, h.value);
  try {
    for (const rule of config.redirects ?? []) {
      const g = match(rule, url);
      if (g) return send(res, rule.permanent ? 308 : 307, "text/plain", "", { Location: fill(rule.destination, g) });
    }

    const api = url.pathname.match(/^\/api\/([a-z-]+)$/);
    if (api) {
      const file = new URL(`api/${api[1]}.js`, root);
      if (!existsSync(file)) return send(res, 404, "application/json", JSON.stringify({ error: "no such function" }));
      // Vercel's helpers: req.query, a parsed JSON body, res.status().json().
      req.query = Object.fromEntries(url.searchParams);
      const raw = await new Promise((ok) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => ok(b)); });
      try { req.body = raw && req.headers["content-type"]?.includes("json") ? JSON.parse(raw) : raw; } catch { req.body = raw; }
      res.status = (code) => ((res.statusCode = code), res);
      res.json = (obj) => send(res, res.statusCode, "application/json", JSON.stringify(obj));
      const { default: handler } = await import(file);
      return await handler(req, res);
    }

    // Clean URLs: /x serves x.html, /x.html redirects to /x.
    let rel = decodeURIComponent(url.pathname).slice(1);
    if (config.cleanUrls && rel.endsWith(".html")) {
      return send(res, 308, "text/plain", "", { Location: `/${rel === "index.html" ? "" : rel.slice(0, -5)}${url.search}` });
    }
    if (rel === "") rel = "index.html";
    else if (config.cleanUrls && !rel.includes(".") && isFile(`${rel}.html`)) rel = `${rel}.html`;
    if (!isFile(rel) || !safe(rel)) {
      const rw = (config.rewrites ?? []).find((r) => match(r, url));
      rel = rw ? fill(rw.destination, match(rw, url)).slice(1) : null;
    }
    if (!rel || !isFile(rel) || !safe(rel)) {
      return send(res, 404, TYPES.html, existsSync(new URL("404.html", root)) ? readFileSync(new URL("404.html", root)) : "not found");
    }
    send(res, 200, TYPES[rel.split(".").pop()] ?? "application/octet-stream", readFileSync(new URL(rel, root)));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, "application/json", JSON.stringify({ error: err.message }));
  }
}).listen(port, () => console.log(`http://localhost:${port}`));

function send(res, code, type, body, headers = {}) {
  res.writeHead(code, { "Content-Type": type, ...headers });
  res.end(body);
}
