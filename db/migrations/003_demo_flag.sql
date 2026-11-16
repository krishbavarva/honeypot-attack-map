-- 003_demo_flag.sql - mark fake attacks created by the simulator.
-- Demo rows can then be shown with a "DEMO" badge and deleted in one command.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_sessions_demo ON sessions (is_demo);
