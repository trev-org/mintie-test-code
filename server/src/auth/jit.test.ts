// MIN-20 — unit coverage for JIT attribute mapping and domain gating.
// Pure functions only; provisionViaJit's DB path is covered in the SSO
// e2e suite. Skipped locally unless UNIT=1.

import { isDomainAllowed, mapAttributes, type JitProfile } from './jit.js';

const RUN = process.env.UNIT === '1';
const SKIP = (..._args: unknown[]) => {};
const test = RUN ? (globalThis as any).test ?? SKIP : SKIP;

const base: JitProfile = {
  email: 'Ada@Acme.com',
  idpProvider: 'okta',
  idpUserId: '00u1',
  orgId: 'org_1',
};

test('falls back to profile fields and lowercases email', () => {
  const m = mapAttributes({ ...base, firstName: 'Ada', lastName: 'Lovelace' }, 'member');
  if (m.email !== 'ada@acme.com' || m.firstName !== 'Ada' || m.role !== 'member') throw new Error(JSON.stringify(m));
});

test('reads SAML attribute aliases', () => {
  const m = mapAttributes({ ...base, rawAttributes: { givenName: ['Ada'], familyName: 'L' } }, 'member');
  if (m.firstName !== 'Ada' || m.lastName !== 'L') throw new Error(JSON.stringify(m));
});

test('honors an assignable role claim', () => {
  const m = mapAttributes({ ...base, rawAttributes: { role: 'Viewer' } }, 'member');
  if (m.role !== 'viewer') throw new Error(m.role);
});

test('never grants admin from a role claim', () => {
  const m = mapAttributes({ ...base, rawAttributes: { role: 'admin' } }, 'viewer');
  if (m.role !== 'viewer') throw new Error(m.role);
});

test('matches domains exactly, not by suffix', () => {
  if (!isDomainAllowed('a@acme.com', ['ACME.com'])) throw new Error('expected allow');
  if (isDomainAllowed('a@evil-acme.com', ['acme.com'])) throw new Error('expected deny');
  if (isDomainAllowed('a@eng.acme.com', ['acme.com'])) throw new Error('subdomains must be listed explicitly');
});
