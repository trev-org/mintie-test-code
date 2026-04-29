-- MIN-17: API keys carry the issuing user's idp_user_id so the auth
-- middleware can short-circuit when the IdP marks the user inactive.

ALTER TABLE api_keys
  ADD COLUMN idp_user_id TEXT,
  ADD COLUMN is_service_account BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX api_keys_idp_user_idx ON api_keys (idp_user_id);
