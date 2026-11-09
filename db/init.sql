-- init.sql - runs ONCE, the first time the PostgreSQL container starts.

-- One row per attacker visit (SSH session).
CREATE TABLE IF NOT EXISTS sessions (
  id             TEXT PRIMARY KEY,          -- Cowrie session id, e.g. 'd4a8f21ddc4c'
  src_ip         INET NOT NULL,             -- attacker IP (PostgreSQL has a real IP type)
  started_at     TIMESTAMPTZ NOT NULL,
  ended_at       TIMESTAMPTZ,
  duration_ms    INTEGER,
  client_version TEXT,                      -- attacker SSH tool
  hassh          TEXT,                      -- attacker tool fingerprint
  login_success  BOOLEAN NOT NULL DEFAULT FALSE,
  -- GeoIP (filled when the MaxMind database is available)
  country_code   TEXT,
  country        TEXT,
  city           TEXT,
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION
);

-- One row per interesting thing that happened inside a session.
CREATE TABLE IF NOT EXISTS events (
  id         BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  ts         TIMESTAMPTZ NOT NULL,
  type       TEXT NOT NULL,                 -- login | command | download
  username   TEXT,
  password   TEXT,
  success    BOOLEAN,
  command    TEXT,
  url        TEXT,
  sha256     TEXT,
  -- the same Cowrie line must never be inserted twice (e.g. after a restart)
  UNIQUE (session_id, ts, type)
);

-- Indexes = make the dashboard queries fast.
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_country ON sessions (country_code);
CREATE INDEX IF NOT EXISTS idx_events_type      ON events (type);
