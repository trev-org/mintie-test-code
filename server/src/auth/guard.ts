import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedPrincipal, PasswordPrincipal, SsoPrincipal } from './principals.js';

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

async function loadSession(_req: FastifyRequest): Promise<any> {
  // TODO: read session cookie, look up in sessions table
  return null;
}
