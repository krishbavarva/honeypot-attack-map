// db.js - save clean events into PostgreSQL.
//
// Every query uses $1, $2... parameters. NEVER build SQL by gluing strings together:
// attackers control usernames, passwords and commands, so string-building would let
// them inject SQL into OUR database (SQL injection). Parameters make that impossible.
import pg from 'pg';
import { locate } from './geo.js';

let pool = null;

export async function initDb(env) {
  if (!env.POSTGRES_PASSWORD) {
    console.log('🗄️  Database: POSTGRES_PASSWORD not set in .env - events will only be printed');
    return;
  }
  // Separate fields instead of one URL: the password can contain any character.
  pool = new pg.Pool({
    host: env.POSTGRES_HOST ?? 'localhost',
    port: Number(env.POSTGRES_PORT ?? 5432),
    user: env.POSTGRES_USER ?? 'honeypot',
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB ?? 'honeypot',
  });
  await pool.query('SELECT 1'); // fail fast with a clear error if the DB is down
  console.log('🗄️  Database: connected');
}

export async function saveEvent(ev) {
  if (!pool) return;

  switch (ev.type) {
    case 'connect': {
      const g = locate(ev.srcIp) ?? {};
      await pool.query(
        `INSERT INTO sessions (id, src_ip, started_at, country_code, country, city, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [ev.session, ev.srcIp, ev.timestamp, g.countryCode, g.country, g.city, g.latitude, g.longitude],
      );
      break;
    }
    case 'client':
      await pool.query('UPDATE sessions SET client_version = $2 WHERE id = $1', [ev.session, ev.clientVersion]);
      break;
    case 'fingerprint':
      await pool.query('UPDATE sessions SET hassh = $2 WHERE id = $1', [ev.session, ev.hassh]);
      break;
    case 'close':
      await pool.query(
        'UPDATE sessions SET ended_at = $2, duration_ms = $3 WHERE id = $1',
        [ev.session, ev.timestamp, ev.durationMs],
      );
      break;
    case 'login':
      if (ev.success) {
        await pool.query('UPDATE sessions SET login_success = TRUE WHERE id = $1', [ev.session]);
      }
      await insertEvent(ev, { username: ev.username, password: ev.password, success: ev.success });
      break;
    case 'command':
      await insertEvent(ev, { command: ev.command });
      break;
    case 'download':
      await insertEvent(ev, { url: ev.url, sha256: ev.sha256 });
      break;
  }
}

async function insertEvent(ev, f) {
  await pool.query(
    `INSERT INTO events (session_id, ts, type, username, password, success, command, url, sha256)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (session_id, ts, type) DO NOTHING`,
    [ev.session, ev.timestamp, ev.type, f.username ?? null, f.password ?? null,
     f.success ?? null, f.command ?? null, f.url ?? null, f.sha256 ?? null],
  );
}