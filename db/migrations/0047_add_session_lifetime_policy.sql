-- Org-configurable session lifetime. Defaults match the previous hard-coded
-- policy (14-day sliding idle window, 90-day absolute cap), so no existing
-- org's behavior changes until an admin tightens it.

ALTER TABLE organizations
  ADD COLUMN session_idle_timeout_minutes INTEGER NOT NULL DEFAULT 20160,
  ADD COLUMN session_max_lifetime_hours   INTEGER NOT NULL DEFAULT 2160,
  ADD CONSTRAINT organizations_session_idle_timeout_chk
    CHECK (session_idle_timeout_minutes BETWEEN 15 AND 20160),
  ADD CONSTRAINT organizations_session_max_lifetime_chk
    CHECK (session_max_lifetime_hours BETWEEN 1 AND 2160),
  ADD CONSTRAINT organizations_session_idle_within_max_chk
    CHECK (session_idle_timeout_minutes <= session_max_lifetime_hours * 60);

-- Idle timeout is measured from last activity. Backfill from created_at so
-- existing sessions get a sane starting point.
ALTER TABLE sessions
  ADD COLUMN last_active_at TIMESTAMPTZ;

UPDATE sessions SET last_active_at = created_at WHERE last_active_at IS NULL;

ALTER TABLE sessions
  ALTER COLUMN last_active_at SET NOT NULL,
  ALTER COLUMN last_active_at SET DEFAULT now();
