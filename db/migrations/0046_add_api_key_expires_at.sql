-- API keys can carry an optional expiry. NULL = never expires, which keeps
-- every existing key's behavior unchanged.

ALTER TABLE api_keys
  ADD COLUMN expires_at TIMESTAMPTZ;

CREATE INDEX api_keys_expires_at_idx ON api_keys (expires_at)
  WHERE expires_at IS NOT NULL;
