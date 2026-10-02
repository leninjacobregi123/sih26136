// A button that opens a panel (menu, feed, results): aria-expanded, outside click and Esc
// close it, focus goes back to the button.
export function popover(button, panel, { onOpen } = {}) {
  const set = (open) => {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) onOpen?.();
  };
  button.addEventListener("click", (e) => { e.stopPropagation(); set(panel.hidden); });
  document.addEventListener("click", (e) => { if (!panel.hidden && !panel.contains(e.target)) set(false); });
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") { set(false); button.focus(); } });
  button.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
  return { open: () => set(true), close: () => set(false) };
}
