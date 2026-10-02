// A KPI trend: one series over time with the baseline and target as reference lines. One
// series, so no legend box — the title names it; the reference lines are labelled where
// they sit. Hover shows the nearest reading; "Show the numbers" gives the same data as a table.
import { html, raw, esc } from "../core/html.js";
import { date, num } from "../core/format.js";

const W = 640, H = 220, PAD = { l: 44, r: 92, t: 14, b: 26 };

export function trendChart({ points, baseline, target, unit = "", title }) {
  if (!points || points.length < 2) return "";
  const xs = points.map((p) => new Date(`${String(p.x).slice(0, 10)}T00:00:00`).getTime());
  const ys = points.map((p) => Number(p.y));
  const refs = [baseline, target].filter((v) => v != null && Number.isFinite(Number(v))).map(Number);
  let lo = Math.min(...ys, ...refs), hi = Math.max(...ys, ...refs);
  const pad = (hi - lo || 1) * 0.12;
  lo -= pad; hi += pad;
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const sx = (t) => PAD.l + ((t - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r);
  const sy = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const ticks = niceTicks(lo, hi);
  const path = xs.map((t, i) => `${i ? "L" : "M"}${sx(t).toFixed(1)},${sy(ys[i]).toFixed(1)}`).join(" ");
  const ref = (cls, v, label) => v == null ? "" : `<g class="ref ${cls}"><line x1="${PAD.l}" x2="${W - PAD.r}" y1="${sy(v)}" y2="${sy(v)}"></line>
    <text x="${W - PAD.r + 6}" y="${sy(v) + 4}">${label} ${num(v)}</text></g>`;
  // Built as a string so the SVG is one piece; every value in it is a number we computed.
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}: ${points.length} readings from ${esc(date(points[0].x))} to ${esc(date(points.at(-1).x))}">
    <g class="grid">${ticks.map((t) => `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${sy(t)}" y2="${sy(t)}"></line>`).join("")}</g>
    <g class="axis">${ticks.map((t) => `<text x="${PAD.l - 8}" y="${sy(t) + 4}" text-anchor="end">${num(t, 0)}</text>`).join("")}
      <text x="${PAD.l}" y="${H - 6}">${date(points[0].x)}</text><text x="${W - PAD.r}" y="${H - 6}" text-anchor="end">${date(points.at(-1).x)}</text></g>
    ${ref("baseline", baseline, "Baseline")}${ref("target", target, "Target")}
    <path class="series" d="${path}"></path>
    ${xs.map((t, i) => `<circle class="point" r="4" cx="${sx(t).toFixed(1)}" cy="${sy(ys[i]).toFixed(1)}"></circle>`).join("")}
    ${xs.map((t, i) => `<rect class="hit" x="${(sx(t) - 14).toFixed(1)}" y="${PAD.t}" width="28" height="${H - PAD.t - PAD.b}" data-i="${i}"></rect>`).join("")}
  </svg>`;
  return html`<figure class="chart" data-chart='${JSON.stringify(points.map((p) => [date(p.x), num(p.y), p.label ?? ""]))}' data-unit="${unit}" style="margin:0">
    <figcaption class="row-between" style="margin-bottom:6px"><span class="small" style="font-weight:600">${title}</span><span class="small muted">${unit}</span></figcaption>
    ${raw(svg)}<div class="chart-tip" hidden></div>
    <details class="small" style="margin-top:6px"><summary class="muted" style="cursor:pointer">Show the numbers</summary>
      <table class="table" style="margin-top:6px"><thead><tr><th>Date</th><th class="num">${unit || "Value"}</th><th>Reading</th></tr></thead>
      <tbody>${points.map((p) => html`<tr><td>${date(p.x)}</td><td class="num">${num(p.y)}</td><td>${p.label ?? ""}</td></tr>`)}</tbody></table></details>
  </figure>`;
}

// Round tick values (…, 40, 60, 80) instead of whatever the data range happens to give.
function niceTicks(lo, hi, count = 4) {
  const raw = (hi - lo) / count, mag = 10 ** Math.floor(Math.log10(raw)), f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

// Hover: the nearest reading's date and value in a tooltip.
export function bindCharts(root) {
  root.querySelectorAll("figure.chart").forEach((fig) => {
    const data = JSON.parse(fig.dataset.chart);
    const tip = fig.querySelector(".chart-tip");
    const svg = fig.querySelector("svg");
    fig.querySelectorAll("rect.hit").forEach((r) => {
      r.addEventListener("mouseenter", () => {
        const [d, v, label] = data[Number(r.dataset.i)];
        const c = svg.querySelectorAll("circle.point")[Number(r.dataset.i)];
        const box = svg.getBoundingClientRect(), scale = box.width / svg.viewBox.baseVal.width;
        tip.textContent = `${d} · ${v} ${fig.dataset.unit}${label ? ` · ${label}` : ""}`;
        tip.style.left = `${c.cx.baseVal.value * scale}px`;
        tip.style.top = `${c.cy.baseVal.value * scale + 24}px`;
        tip.hidden = false;
      });
      r.addEventListener("mouseleave", () => { tip.hidden = true; });
    });
  });
}
