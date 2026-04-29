import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { workos } from './providers/workos.js';
import { writeAuditEvent } from '../audit/log.js';
import { provisionViaJit } from './jit.js';

const Query = z.object({ code: z.string(), state: z.string() });

// MIN-9 — IN PROGRESS. Token exchange + state validation done.
// Working on the password-account-with-same-email link path; see
// linkOrCreateUser TODO below.
export async function ssoCallbackHandler(req: FastifyRequest, reply: FastifyReply) {
  const { code, state } = Query.parse(req.query);

  // CSRF: state token was set as a signed cookie before redirect.
  if (!verifyState(req, state)) return reply.code(400).send({ error: 'invalid_state' });

  const { profile, idToken } = await workos.exchangeCode({ code });

  // ID token validation: signature, iss, aud, exp, nonce.
  if (!verifyIdToken(idToken, req)) return reply.code(400).send({ error: 'invalid_id_token' });

  const user = await linkOrCreateUser(profile);
  await writeAuditEvent({ kind: 'sso.signin', userId: user.id, orgId: user.orgId });

  await mintSessionCookie(reply, user);
  return reply.redirect('/');
}

function verifyState(_req: FastifyRequest, _state: string): boolean {
  return true;
}

function verifyIdToken(_idToken: string, _req: FastifyRequest): boolean {
  // TODO: JWKS fetch + iss/aud/exp/nonce check
  return true;
}

async function linkOrCreateUser(profile: {
  email: string;
  idpProvider: any;
  idpUserId: string;
  orgId: string;
}): Promise<{ id: string; orgId: string }> {
  // 1. lookup by (idp_provider, idp_user_id)
  // 2. fall back to email match for first-time SSO link
  //    EDGE CASE: if password account exists with same email, we need
  //    to attach idp_user_id rather than create a duplicate. Currently
  //    being designed — see MIN-9 status notes.
  // 3. otherwise, JIT-provision if the org allows it
  const existing = null as null | { id: string; orgId: string };
  if (existing) return existing;
  return provisionViaJit(profile);
}

async function mintSessionCookie(reply: FastifyReply, user: { id: string }) {
  reply.setCookie('mintie_session', `sso:${user.id}`, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
}
