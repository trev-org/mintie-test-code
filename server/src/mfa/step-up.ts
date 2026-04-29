// MIN-18: backlog. Step-up MFA on sensitive actions regardless of IdP
// posture. Open questions:
//  - WorkOS step-up vs. our own TOTP?
//  - what counts as "sensitive"? (PM input needed)
import type { AuthenticatedPrincipal } from '../auth/principals.js';

export type SensitiveAction =
  | 'apikey.create'
  | 'billing.change'
  | 'member.remove'
  | 'sso.connection.update';

export async function requireStepUp(_p: AuthenticatedPrincipal, _action: SensitiveAction) {
  // throw if step-up not satisfied within the last N minutes
}
