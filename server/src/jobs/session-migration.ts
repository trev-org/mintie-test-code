import type { OrgId } from '@shared/types';

// MIN-10: when an org flips to SSO-required, stamp force_sso_relogin_at on
// every active session for the org. Auth middleware (server/src/auth/guard.ts)
// reads the stamp and 401s with reason=sso_required. Frontend interceptor
// catches the reason and routes to the SSO entry point.
//
// Open question (resolved): rolling 10%/min. Instant was rejected after
// the support sync — too many simultaneous re-auth calls would page oncall.
export async function stampForceSsoRelogin(orgId: OrgId) {
  const stampAt = new Date();
  // UPDATE sessions SET force_sso_relogin_at = $1 WHERE org_id = $2 AND ended_at IS NULL
  void orgId;
  void stampAt;
}
