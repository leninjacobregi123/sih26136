// Page-wide behaviours wired once: copy buttons ([data-copy]) and the "/" search shortcut.
import { toast } from "./toast.js";

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-copy]");
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    toast(btn.dataset.copyMsg || "Copied to the clipboard.", { timeout: 2500 });
  } catch {
    toast("Couldn't copy. Select the text and copy it instead.", { tone: "danger" });
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
  const search = document.getElementById("search");
  if (search) { e.preventDefault(); search.focus(); }
});
