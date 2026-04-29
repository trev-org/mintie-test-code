# mintie-test-code

Stub codebase for the **Mintie SSO** product, mirroring the SSO Migration project tracked in Linear ([SSO Migration project](https://linear.app/mintie-test/project/sso-migration-1d8666954d0b)) and Jira ([KAN-1](https://mintie-test.atlassian.net/browse/KAN-1)). Authoritative product docs live at [mintietest.mintlify.app](https://mintietest.mintlify.app).

This is a scaffolding repo — most files are intentionally stubs that match the ticket-level design decisions, not a runnable application.

## Layout

```
db/migrations/        SQL migrations (idp columns, force_sso_relogin_at, etc.)
server/               Node/TS API
  auth/               Guard, principals, OIDC callback, idp-lookup, providers
  scim/               SCIM 2.0 endpoint
  jobs/               Background workers (session migration, migration emails)
  flags/              LaunchDarkly feature-flag wrapper
  audit/              Auth-event audit log
  mfa/                Step-up MFA
web/                  React frontend (login, settings, hooks)
shared/               Cross-cutting types
```

## Ticket → file map

| Ticket | What | Where |
|---|---|---|
| MIN-5 | WorkOS chosen as IdP abstraction | `server/src/auth/providers/workos.ts` |
| MIN-6 | `idp_provider` / `idp_user_id` columns | `db/migrations/0042_add_idp_columns.sql` |
| MIN-7 | `sso_enabled` flag wiring | `server/src/flags/feature-context.ts`, `web/src/hooks/useFlag.ts` |
| MIN-8 | "Continue with SSO" entry point | `web/src/components/SsoButton.tsx`, `server/src/auth/idp-lookup.ts` |
| MIN-9 | OIDC callback handler | `server/src/auth/sso-callback.ts` |
| MIN-10 | Session migration job + frontend interceptor | `server/src/jobs/session-migration.ts`, `web/src/api-client.ts` |
| MIN-11 | AuthGuard refactor (Principal interface) | `server/src/auth/guard.ts`, `server/src/auth/principals.ts` |
| MIN-12 | Okta adapter | `server/src/auth/providers/okta.ts` |
| MIN-13 | Google Workspace adapter | `server/src/auth/providers/google-workspace.ts` |
| MIN-14 | SCIM 2.0 endpoint | `server/src/scim/routes.ts` |
| MIN-15 | Admin UI for SSO config | `web/src/pages/settings-sso.tsx` |
| MIN-16 | Migration prompt emails | `server/src/jobs/migration-emails.ts` |
| MIN-17 | API keys tied to SSO identity | `server/src/auth/api-keys.ts` |
| MIN-18 | Step-up MFA | `server/src/mfa/step-up.ts` |
| MIN-19 | Audit log | `server/src/audit/log.ts` |
| MIN-20 | JIT provisioning | `server/src/auth/jit.ts` |
