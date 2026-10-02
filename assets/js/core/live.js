// Live audit events for one passport (server-sent events), with the connection state the
// page shows as its "Live" indicator. EventSource reconnects by itself after each window.
import { STATIC_HOST } from "./api.js";

export function watch(recordId, { onEvent, onState } = {}) {
  if (STATIC_HOST || !window.EventSource) { onState?.("off"); return () => {}; }
  const es = new EventSource(`/api/events?record=${encodeURIComponent(recordId)}`);
  es.onopen = () => onState?.("live");
  es.onerror = () => onState?.(es.readyState === EventSource.CLOSED ? "off" : "connecting");
  es.onmessage = (m) => { try { onEvent?.(JSON.parse(m.data)); } catch {} };
  return () => es.close();
}
