// A small headless-Chrome driver over the DevTools protocol, for the UI tests and for
// screenshots. No Puppeteer: Chrome is already on the machine, and Node 22 has WebSocket.
// It records console errors, failed requests and CSP violations, and can run axe-core.
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME_BIN || "google-chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// args: extra Chrome flags, e.g. ["--ignore-certificate-errors"] behind a TLS-inspecting proxy.
export async function launch({ args = [] } = {}) {
  const port = 9300 + Math.floor(Math.random() * 600);
  const dir = mkdtempSync(join(tmpdir(), "ui-chrome-"));
  const proc = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--no-default-browser-check",
    "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, ...args, "about:blank"], { stdio: "ignore" });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { await (await fetch(`${base}/json/version`)).json(); break; } catch { await sleep(100); }
  }
  return {
    base,
    async page() { return openPage(base); },
    async close() { proc.kill(); await sleep(200); rmSync(dir, { recursive: true, force: true }); },
  };
}

async function openPage(base) {
  const { webSocketDebuggerUrl } = await (await fetch(`${base}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
  let seq = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
    if (d.method === "Runtime.exceptionThrown") errors.push(`exception: ${d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text}`);
    if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") errors.push(`console.error: ${d.params.args.map((a) => a.value ?? a.description).join(" ")}`);
    if (d.method === "Log.entryAdded" && d.params.entry.level === "error") errors.push(`${d.params.entry.source}: ${d.params.entry.text} ${d.params.entry.url ?? ""}`.trim());
  };
  const cdp = (method, params = {}) => new Promise((ok, no) => {
    const id = ++seq;
    pending.set(id, (d) => (d.error ? no(new Error(`${method}: ${d.error.message}`)) : ok(d.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
  await cdp("Runtime.enable"); await cdp("Page.enable"); await cdp("Network.enable"); await cdp("Log.enable");

  const js = async (expression) => {
    const r = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const waitFor = async (expression, ms = 10000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (await js(expression).catch(() => false)) return; await sleep(80); }
    throw new Error(`timed out waiting for: ${expression}\nerrors: ${errors.join("\n") || "none"}`);
  };

  return {
    cdp, js, waitFor, errors,
    async goto(url, ready = "document.readyState === 'complete' && !document.querySelector('[aria-busy=true]')") {
      await cdp("Page.navigate", { url });
      await sleep(150);
      await waitFor(ready);
    },
    async viewport(width, height = 900, mobile = width < 600) {
      await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
    },
    async theme(scheme) {
      await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
    },
    async cookie(name, value, url) { await cdp("Network.setCookie", { name, value, url, httpOnly: true }); },
    async clearCookies() { await cdp("Network.clearBrowserCookies"); },
    async screenshot(path, maxHeight = 6000) {
      const clip = await js(`({ x: 0, y: 0, width: document.documentElement.scrollWidth, height: Math.min(document.documentElement.scrollHeight, ${maxHeight}), scale: 1 })`);
      const { data } = await cdp("Page.captureScreenshot", { captureBeyondViewport: true, clip });
      writeFileSync(path, Buffer.from(data, "base64"));
    },
    async files(selector, paths) {
      const { root } = await cdp("DOM.getDocument");
      const { nodeId } = await cdp("DOM.querySelector", { nodeId: root.nodeId, selector });
      await cdp("DOM.setFileInputFiles", { nodeId, files: paths });
    },
    // axe-core, injected through the protocol (not subject to the page's CSP).
    async axe(options = {}) {
      if (!(await js("typeof window.axe === 'object'"))) {
        await js(readFileSync(new URL("../../node_modules/axe-core/axe.min.js", import.meta.url), "utf8"));
      }
      return js(`axe.run(document, ${JSON.stringify({ resultTypes: ["violations"], ...options })}).then((r) => r.violations.map((v) => ({
        id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })))`);
    },
    async overflowX() { return js("document.documentElement.scrollWidth - window.innerWidth"); },
    close: () => ws.close(),
  };
}
