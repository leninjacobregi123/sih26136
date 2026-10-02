// Builds the static assets the UI ships, from dev dependencies, so the deployed site needs
// nothing from node_modules and makes no third-party requests:
//   assets/icons.svg            a <symbol> sprite of the Lucide icons the UI uses (ISC)
//   assets/fonts/inter-*.woff2  Inter variable, latin + latin-ext subsets (OFL)
// Run after changing the icon list or upgrading a package; commit the output.
//   npm run build:assets
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const ICONS = [
  "house", "layout-dashboard", "list-checks", "plus", "file-plus", "chart-column", "indian-rupee", "user",
  "circle-user", "log-out", "log-in", "bell", "search", "sun", "moon", "monitor", "menu", "x", "chevron-right",
  "chevron-down", "chevron-left", "check", "circle-check", "triangle-alert", "circle-alert", "info", "circle-x",
  "clock", "lock", "shield-check", "file-text", "file", "upload", "download", "copy", "external-link", "printer",
  "link", "play", "rotate-ccw", "skip-forward", "flask-conical", "building-2", "map-pin", "calendar", "users",
  "target", "trending-down", "trending-up", "scale", "fingerprint", "history", "activity", "radio", "arrow-right",
  "arrow-left", "eye", "eye-off", "list-filter", "arrow-up-down", "ellipsis", "panel-left", "briefcase",
  "banknote", "badge-check", "ban", "hourglass", "loader-circle", "circle-help", "file-check", "clipboard-check",
  "inbox", "book-open", "rocket", "gauge", "circle-dot", "square-pen", "route", "stamp", "send", "flag", "circle-play",
];

const pkg = (p) => new URL(`../node_modules/${p}`, import.meta.url);
const out = (p) => new URL(`../assets/${p}`, import.meta.url);

const symbols = ICONS.map((name) => {
  const svg = readFileSync(pkg(`lucide-static/icons/${name}.svg`), "utf8");
  const body = svg.slice(svg.indexOf(">", svg.indexOf("<svg")) + 1, svg.lastIndexOf("</svg>")).replace(/\s+/g, " ").trim();
  return `<symbol id="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</symbol>`;
});
const lucide = JSON.parse(readFileSync(pkg("lucide-static/package.json"), "utf8"));
writeFileSync(out("icons.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg">\n<!-- Lucide icons v${lucide.version}, ISC licence: https://lucide.dev/license -->\n`
  + symbols.join("\n") + "\n</svg>\n");

mkdirSync(out("fonts"), { recursive: true });
for (const subset of ["latin", "latin-ext"]) {
  copyFileSync(pkg(`@fontsource-variable/inter/files/inter-${subset}-wght-normal.woff2`), out(`fonts/inter-${subset}-wght.woff2`));
}
copyFileSync(pkg("@fontsource-variable/inter/LICENSE"), out("fonts/LICENSE-Inter.txt"));
console.log(`icons.svg: ${ICONS.length} icons · fonts: Inter variable (latin, latin-ext)`);
