import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { featureContextForOrg } from '../flags/feature-context.js';
import { workos } from './providers/workos.js';

const Body = z.object({ email: z.string().email() });

// MIN-8: email-first flow. Frontend posts the email, we look up the org's
// IdP config, and respond with a redirect URL if SSO is enabled — otherwise
// the client falls back to password.
export async function idpLookupHandler(req: FastifyRequest, reply: FastifyReply) {
  const { email } = Body.parse(req.body);
  const org = await orgFromEmail(email);
  if (!org) return reply.send({ ssoEnabled: false });

  const flags = await featureContextForOrg(org.id);
  if (!flags.ssoEnabled) return reply.send({ ssoEnabled: false });

  const redirectUrl = await workos.getAuthorizationUrl({
    organizationId: org.id,
    redirectUri: `${process.env.PUBLIC_BASE_URL}/api/auth/sso/callback`,
  });
  return reply.send({ ssoEnabled: true, redirectUrl });
}

async function orgFromEmail(_email: string): Promise<{ id: string } | null> {
  // TODO: domain → org lookup
  return null;
}
