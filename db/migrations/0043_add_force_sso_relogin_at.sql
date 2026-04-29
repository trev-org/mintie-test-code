-- MIN-10: forces in-flight password sessions to re-auth via SSO when
-- an org flips to SSO-required. Auth middleware reads this column.

ALTER TABLE sessions
  ADD COLUMN force_sso_relogin_at TIMESTAMPTZ;

CREATE INDEX sessions_force_sso_relogin_idx
  ON sessions (org_id, force_sso_relogin_at)
  WHERE force_sso_relogin_at IS NOT NULL;
