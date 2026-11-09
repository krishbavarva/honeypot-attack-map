// live.js - push new attacks to the dashboard in real time.
//
// 1. One dedicated PostgreSQL connection runs "LISTEN attacks".
// 2. The database trigger (002_live_notify.sql) sends a message for every new row.
// 3. We forward each message to every open browser with Server-Sent Events (SSE):
//    a normal HTTP response that never ends, where the server writes
//    "data: {...}\n\n" each time something happens. The browser reads it with
//    `new EventSource('/api/live')`. Simpler than WebSocket because data only
//    goes one way: server -> browser.
import pg from 'pg';
import { dbConfig } from './db.js';
import { safeRow } from './privacy.js';

const clients = new Set();

export function addLiveClient(req, res, corsHeaders) {
  res.writeHead(200, {
    ...corsHeaders,
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': connected\n\n'); // lines starting with ":" are comments (ignored by the browser)
  clients.add(res);
  req.on('close', () => clients.delete(res));
}

function broadcast(message) {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  for (const res of clients) res.write(data);
}

// Keep connections alive through proxies: send a comment every 25 s.
setInterval(() => {
  for (const res of clients) res.write(': ping\n\n');
}, 25_000).unref();

export async function startListener() {
  const client = new pg.Client(dbConfig);

  client.on('notification', (msg) => {
    try {
      const { table, op, row } = JSON.parse(msg.payload);
      broadcast({ table, op, row: safeRow(row) }); // mask the IP before it leaves
    } catch (err) {
      console.error('⚠️  bad notification:', err.message);
    }
  });

  // If the DB connection drops (e.g. DB restarted), reconnect after 5 s.
  client.on('error', (err) => {
    console.error('⚠️  live listener lost DB connection:', err.message);
    setTimeout(() => startListener().catch(() => {}), 5_000);
  });

  await client.connect();
  await client.query('LISTEN attacks');
  console.log('📡 Live: listening for new attacks');
}

export function liveClientCount() {
  return clients.size;
}
