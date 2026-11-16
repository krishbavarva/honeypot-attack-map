// api.js - small helpers to talk to our API (through the Vite proxy).

export async function getJson(path) {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

// Live stream: calls onEvent(...) for every new row the database announces.
// EventSource reconnects automatically if the API restarts.
export function subscribeLive(onEvent, onStatus) {
  const es = new EventSource('/api/live');
  es.onopen = () => onStatus?.('live');
  es.onerror = () => onStatus?.('reconnecting');
  es.onmessage = (msg) => {
    try { onEvent(JSON.parse(msg.data)); } catch { /* ignore broken messages */ }
  };
  return () => es.close();
}
