-- MIN-6: link users to external IdP identities.
-- Ran in staging 2026-04-12, prod 2026-04-15. Zero downtime confirmed.

ALTER TABLE users
  ADD COLUMN idp_provider TEXT,
  ADD COLUMN idp_user_id  TEXT;

CREATE UNIQUE INDEX users_idp_identity_idx
  ON users (idp_provider, idp_user_id)
  WHERE idp_provider IS NOT NULL AND idp_user_id IS NOT NULL;
