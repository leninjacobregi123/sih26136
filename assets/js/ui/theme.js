// Light / Dark / System. The pre-paint script (assets/js/theme.js) applies the stored choice;
// this keeps it in step afterwards, including when the system setting changes.
const media = matchMedia("(prefers-color-scheme: dark)");

export function themePref() {
  try { return localStorage.getItem("theme") || "system"; } catch { return "system"; }
}
function apply(pref) {
  const dark = pref === "dark" || (pref === "system" && media.matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}
export function setTheme(pref) {
  try { localStorage.setItem("theme", pref); } catch {}
  apply(pref);
}
media.addEventListener("change", () => { if (themePref() === "system") apply("system"); });
