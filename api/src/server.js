// server.js - the honeypot API (Node's built-in http module, no framework).
//
//   GET /api/health              -> is the API alive?
//   GET /api/stats               -> totals for the dashboard cards
//   GET /api/top/:name           -> passwords | usernames | commands | countries | clients  (?limit=10)
//   GET /api/sessions            -> latest attacker sessions (?limit=50)
//   GET /api/sessions/:id        -> one session with all its logins/commands (session replay)
//   GET /api/map                 -> points for the world map
//   GET /api/timeline            -> attacks per hour (last 24 h)
//   GET /api/live                -> live stream of new attacks (Server-Sent Events)
//
// Run from the api folder:  npm start   (or "npm run dev" to restart on every file change)
import http from 'node:http';
import * as routes from './routes.js';
import { startListener, addLiveClient, liveClientCount } from './live.js';
import { pool } from './db.js';

const PORT = Number(process.env.API_PORT ?? 4000);
const HOST = process.env.API_HOST ?? '127.0.0.1'; // only your laptop, not the network
// CORS: only the dashboard's address may call this API from a browser.
const ALLOWED_ORIGIN = process.env.DASHBOARD_ORIGIN ?? 'http://localhost:5173';

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET',
  Vary: 'Origin',
};

const security = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
};

function send(res, status, body) {
  res.writeHead(status, { ...cors, ...security, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean); // "/api/top/passwords" -> ["api","top","passwords"]

  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  if (parts[0] !== 'api') return send(res, 404, { error: 'Not found' });

  try {
    switch (parts[1]) {
      case 'health':
        return send(res, 200, { ok: true, liveClients: liveClientCount() });
      case 'stats':
        return send(res, 200, await routes.stats());
      case 'top': {
        const rows = await routes.top(parts[2], url);
        return rows ? send(res, 200, rows) : send(res, 404, { error: 'Unknown list' });
      }
      case 'sessions': {
        if (!parts[2]) return send(res, 200, await routes.recentSessions(url));
        if (!/^[a-f0-9]{6,32}$/i.test(parts[2])) return send(res, 400, { error: 'Bad session id' });
        const detail = await routes.sessionDetail(parts[2]);
        return detail ? send(res, 200, detail) : send(res, 404, { error: 'Session not found' });
      }
      case 'map':
        return send(res, 200, await routes.mapPoints());
      case 'timeline':
        return send(res, 200, await routes.timeline());
      case 'live':
        return addLiveClient(req, res, { ...cors, ...security });
      default:
        return send(res, 404, { error: 'Not found' });
    }
  } catch (err) {
    // Log the real error for us, but never show database details to the visitor.
    console.error('❌', req.url, err.message);
    return send(res, 500, { error: 'Internal error' });
  }
});

if (!process.env.POSTGRES_PASSWORD) {
  console.error('❌ POSTGRES_PASSWORD missing: run from the api folder so ../.env is loaded');
  process.exit(1);
}

await pool.query('SELECT 1');
console.log('🗄️  Database: connected');
await startListener();
server.listen(PORT, HOST, () => {
  console.log(`🚀 API running on http://${HOST === '127.0.0.1' ? 'localhost' : HOST}:${PORT}/api/health`);
});
