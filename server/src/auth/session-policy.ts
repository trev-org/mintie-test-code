import type { Organization, Session } from '@shared/types';

// Org-level session lifetime. Admins can only tighten these; the defaults
// are also the ceilings and match the old hard-coded 14d idle / 90d absolute.
// Evaluated on every request against the org's *current* policy, so
// tightening it applies to sessions that already exist.
export const DEFAULT_IDLE_TIMEOUT_MINUTES = 14 * 24 * 60;
export const DEFAULT_MAX_LIFETIME_HOURS = 90 * 24;
export const MIN_IDLE_TIMEOUT_MINUTES = 15;
export const MIN_MAX_LIFETIME_HOURS = 1;

// last_active_at writes are throttled so busy sessions don't write on every
// request. Idle timeout is therefore accurate to within this window.
export const LAST_ACTIVE_WRITE_INTERVAL_MS = 60_000;

export type SessionExpiry = 'idle' | 'max_lifetime';

export function sessionExpiry(
  session: Pick<Session, 'createdAt' | 'lastActiveAt'>,
  org: Pick<Organization, 'sessionIdleTimeoutMinutes' | 'sessionMaxLifetimeHours'>,
  now = new Date(),
): SessionExpiry | null {
  const t = now.getTime();
  if (t >= new Date(session.createdAt).getTime() + org.sessionMaxLifetimeHours * 3_600_000) {
    return 'max_lifetime';
  }
  if (t >= new Date(session.lastActiveAt).getTime() + org.sessionIdleTimeoutMinutes * 60_000) {
    return 'idle';
  }
  return null;
}

export function shouldTouchLastActive(session: Pick<Session, 'lastActiveAt'>, now = new Date()) {
  return now.getTime() - new Date(session.lastActiveAt).getTime() >= LAST_ACTIVE_WRITE_INTERVAL_MS;
}
