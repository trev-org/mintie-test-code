// Unit coverage for session lifetime evaluation. Skipped locally unless UNIT=1.

import { sessionExpiry } from './session-policy.js';

const RUN = process.env.UNIT === '1';
const SKIP = (..._args: unknown[]) => {};
const test = RUN ? (globalThis as any).test ?? SKIP : SKIP;

const org = { sessionIdleTimeoutMinutes: 30, sessionMaxLifetimeHours: 12 };
const now = new Date('2026-10-01T12:00:00Z');

test('active session within both limits is valid', () => {
  const s = { createdAt: '2026-10-01T08:00:00Z', lastActiveAt: '2026-10-01T11:45:00Z' };
  if (sessionExpiry(s, org, now) !== null) throw new Error('expected valid');
});

test('expires after idle timeout', () => {
  const s = { createdAt: '2026-10-01T08:00:00Z', lastActiveAt: '2026-10-01T11:30:00Z' };
  if (sessionExpiry(s, org, now) !== 'idle') throw new Error('expected idle');
});

test('max lifetime wins even when the session is active', () => {
  const s = { createdAt: '2026-09-30T23:00:00Z', lastActiveAt: '2026-10-01T11:59:00Z' };
  if (sessionExpiry(s, org, now) !== 'max_lifetime') throw new Error('expected max_lifetime');
});
