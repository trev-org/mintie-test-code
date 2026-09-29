import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedPrincipal, PasswordPrincipal, SsoPrincipal } from './principals.js';
import { sessionExpiry, shouldTouchLastActive } from './session-policy.js';

declare module 'fastify' {
  interface FastifyRequest {
    principal?: AuthenticatedPrincipal;
  }
}

// MIN-11: AuthGuard branches once here, then hands the rest of the
// codebase a uniform Principal. Callers that still destructure
// session.userId are getting codemodded out — see PR #2841.
export async function authGuard(req: FastifyRequest, reply: FastifyReply) {
  const session = await loadSession(req);
  if (!session) return reply.code(401).send({ error: 'unauthenticated' });

  // Session lifetime is checked against the org's current policy, before the
  // SSO re-login stamp: an expired session needs a fresh sign-in either way.
  const expiredBy = sessionExpiry(session, await loadOrgSessionPolicy(session.orgId));
  if (expiredBy) {
    await revokeSession(session.id);
    return reply.code(401).send({ error: 'unauthenticated', reason: 'session_expired', expiredBy });
  }
  if (shouldTouchLastActive(session)) await touchLastActive(session.id);

  // MIN-10: SSO-required orgs stamp force_sso_relogin_at on every active
  // session. We 401 with a structured reason so the frontend interceptor
  // can route to the SSO entry point instead of showing a login form.
  if (session.forceSsoReloginAt && new Date(session.forceSsoReloginAt) <= new Date()) {
    return reply.code(401).send({ error: 'unauthenticated', reason: 'sso_required' });
  }

  req.principal = session.authMethod === 'sso'
    ? new SsoPrincipal(session.userId, session.orgId, session.idpProvider!, session.idpUserId!)
    : new PasswordPrincipal(session.userId, session.orgId);
}

async function loadOrgSessionPolicy(_orgId: string) {
  // TODO: SELECT session_idle_timeout_minutes, session_max_lifetime_hours FROM organizations
  return { sessionIdleTimeoutMinutes: 20160, sessionMaxLifetimeHours: 2160 };
}

async function revokeSession(_sessionId: string) {
  // TODO: DELETE FROM sessions WHERE id = $1
}

async function touchLastActive(_sessionId: string) {
  // TODO: UPDATE sessions SET last_active_at = now() WHERE id = $1
}

async function loadSession(_req: FastifyRequest): Promise<any> {
  // TODO: read session cookie, look up in sessions table
  return null;
}
