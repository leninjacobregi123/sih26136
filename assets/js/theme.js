// Runs in <head> before first paint, so the page never flashes the wrong theme. A classic
// script (not a module) so it blocks; external (not inline) so the CSP can forbid inline script.
(function () {
  var pref = "system";
  try { pref = localStorage.getItem("theme") || "system"; } catch (e) {}
  var dark = pref === "dark" || (pref !== "light" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
})();
