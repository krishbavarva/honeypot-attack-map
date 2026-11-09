-- 002_live_notify.sql - make PostgreSQL announce every new attack.
--
-- pg_notify() sends a message on a "channel" (here: 'attacks') to every program
-- that is LISTENing. The API listens, then pushes the message live to the dashboard.
-- So the collector does not need to know about the API at all: the database links them.

CREATE OR REPLACE FUNCTION notify_attack() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('attacks', json_build_object(
    'table', TG_TABLE_NAME,   -- 'sessions' or 'events'
    'op',    TG_OP,           -- 'INSERT' or 'UPDATE'
    'row',   to_jsonb(NEW)    -- the new row as JSON
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sessions_notify ON sessions;
CREATE TRIGGER sessions_notify AFTER INSERT OR UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION notify_attack();

DROP TRIGGER IF EXISTS events_notify ON events;
CREATE TRIGGER events_notify AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION notify_attack();
