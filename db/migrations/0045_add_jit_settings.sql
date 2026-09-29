-- MIN-20: org-level JIT provisioning settings, plus provenance on users so
-- access reviews can tell JIT-created accounts apart from invites and SCIM.

ALTER TABLE organizations
  ADD COLUMN jit_default_role    TEXT   NOT NULL DEFAULT 'member',
  ADD COLUMN jit_allowed_domains TEXT[] NOT NULL DEFAULT '{}',
  ADD CONSTRAINT organizations_jit_default_role_chk
    CHECK (jit_default_role IN ('member', 'viewer'));

ALTER TABLE users
  ADD COLUMN role           TEXT NOT NULL DEFAULT 'member',
  ADD COLUMN first_name     TEXT,
  ADD COLUMN last_name      TEXT,
  ADD COLUMN provisioned_via TEXT NOT NULL DEFAULT 'invite',
  ADD CONSTRAINT users_provisioned_via_chk
    CHECK (provisioned_via IN ('invite', 'scim', 'jit'));

CREATE INDEX users_org_provisioned_via_idx ON users (org_id, provisioned_via);
