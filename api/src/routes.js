// routes.js - the REST endpoints. Every query is read-only and parameterized.
import { pool } from './db.js';
import { safeRow } from './privacy.js';

// The "top" lists the dashboard can ask for. The client only sends a NAME from this
// list; it can never send SQL. This is called an allow-list.
const TOP = {
  passwords: `SELECT password AS value, COUNT(*)::int AS count FROM events
              WHERE type = 'login' AND password IS NOT NULL GROUP BY password`,
  usernames: `SELECT username AS value, COUNT(*)::int AS count FROM events
              WHERE type = 'login' AND username IS NOT NULL GROUP BY username`,
  commands:  `SELECT command AS value, COUNT(*)::int AS count FROM events
              WHERE type = 'command' GROUP BY command`,
  countries: `SELECT COALESCE(country, 'Unknown') AS value, COUNT(*)::int AS count FROM sessions
              GROUP BY COALESCE(country, 'Unknown')`,
  clients:   `SELECT client_version AS value, COUNT(*)::int AS count FROM sessions
              WHERE client_version IS NOT NULL GROUP BY client_version`,
};

// Read ?limit= safely: always a whole number between 1 and max.
function limitParam(url, def, max) {
  const n = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), max) : def;
}

export async function stats() {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM sessions)                                   AS sessions,
      (SELECT COUNT(DISTINCT src_ip)::int FROM sessions)                     AS unique_ips,
      (SELECT COUNT(DISTINCT country_code)::int FROM sessions
         WHERE country_code IS NOT NULL)                                     AS countries,
      (SELECT COUNT(*)::int FROM events WHERE type = 'login')                AS login_attempts,
      (SELECT COUNT(*)::int FROM sessions WHERE login_success)               AS successful_logins,
      (SELECT COUNT(*)::int FROM events WHERE type = 'command')              AS commands,
      (SELECT COUNT(*)::int FROM events WHERE type = 'download')             AS downloads,
      (SELECT MIN(started_at) FROM sessions)                                 AS first_seen,
      (SELECT MAX(started_at) FROM sessions)                                 AS last_seen`);
  return rows[0];
}

export async function top(name, url) {
  const sql = TOP[name];
  if (!sql) return null; // unknown name -> 404
  const limit = limitParam(url, 10, 100);
  const { rows } = await pool.query(`${sql} ORDER BY count DESC, value LIMIT $1`, [limit]);
  return rows;
}

export async function recentSessions(url) {
  const limit = limitParam(url, 50, 500);
  const { rows } = await pool.query(
    `SELECT s.id, s.src_ip, s.started_at, s.duration_ms, s.client_version, s.login_success,
            s.country_code, s.country, s.city, s.latitude, s.longitude, s.is_demo,
            (SELECT COUNT(*)::int FROM events e WHERE e.session_id = s.id AND e.type = 'command') AS commands
     FROM sessions s ORDER BY s.started_at DESC LIMIT $1`,
    [limit],
  );
  return rows.map(safeRow);
}

export async function sessionDetail(id) {
  const s = await pool.query('SELECT * FROM sessions WHERE id = $1', [id]);
  if (s.rowCount === 0) return null;
  const e = await pool.query(
    `SELECT ts, type, username, password, success, command, url, sha256
     FROM events WHERE session_id = $1 ORDER BY ts`,
    [id],
  );
  return { session: safeRow(s.rows[0]), events: e.rows };
}

// Points for the world map: one point per city, sized by number of attacks.
export async function mapPoints() {
  const { rows } = await pool.query(`
    SELECT country_code, country, city,
           ROUND(latitude::numeric, 2)::float  AS latitude,
           ROUND(longitude::numeric, 2)::float AS longitude,
           COUNT(*)::int AS attacks, MAX(started_at) AS last_seen
    FROM sessions
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    GROUP BY country_code, country, city, ROUND(latitude::numeric, 2), ROUND(longitude::numeric, 2)
    ORDER BY attacks DESC`);
  return rows;
}

// Attacks per hour for the last 24 hours (for the timeline chart).
export async function timeline() {
  const { rows } = await pool.query(`
    SELECT date_trunc('hour', started_at) AS hour, COUNT(*)::int AS attacks
    FROM sessions
    WHERE started_at > now() - interval '24 hours'
    GROUP BY 1 ORDER BY 1`);
  return rows;
}
