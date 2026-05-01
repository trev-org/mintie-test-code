import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { IdpProvider, OrgId } from '@shared/types';
import { connectOktaConnection } from './providers/okta.js';
import { connectGoogleWorkspace } from './providers/google-workspace.js';
import { workos } from './providers/workos.js';
import { writeAuditEvent } from '../audit/log.js';

// MIN-12 / MIN-15: admin endpoints for SSO connection setup, status, and
// the Require-SSO toggle. Called from web/src/pages/settings-sso.tsx.
export async function adminSsoRoutes(app: FastifyInstance) {
  app.get('/status', async (req, reply) => {
    const orgId = requireOrgId(req, reply);
    if (!orgId) return;
    return reply.send(await loadConnectionStatus(orgId));
  });

  app.post('/okta', async (req, reply) => {
    const orgId = requireOrgId(req, reply);
    if (!orgId) return;
    const conn = await connectOktaConnection({ orgId, ...(req.body as object) });
    return reply.send(conn);
  });

  app.post('/google', async (req, reply) => {
    const orgId = requireOrgId(req, reply);
    if (!orgId) return;
    const { domain } = GoogleInput.parse(req.body);
    const conn = await connectGoogleWorkspace({ domain });
    await writeAuditEvent({ kind: 'sso.link', orgId, meta: { provider: 'google' } });
    return reply.send(conn);
  });

  app.post('/saml', async (req, reply) => {
    const orgId = requireOrgId(req, reply);
    if (!orgId) return;
    const input = GenericSamlInput.parse(req.body);
    const conn = await workos.sso.createConnection({
      organizationId: orgId,
      type: 'GenericSAML',
      source: input.metadataUrl
        ? { kind: 'metadata_url', url: input.metadataUrl }
        : { kind: 'metadata_xml', xml: input.metadataXml as string },
    });
    await writeAuditEvent({
      kind: 'sso.link',
      orgId,
      meta: { provider: 'generic-saml', connectionId: conn.id },
    });
    return reply.send({ id: conn.id, orgId, status: conn.status, acsUrl: conn.acsUrl });
  });

  app.post('/oidc', async (req, reply) => {
    const orgId = requireOrgId(req, reply);
    if (!orgId) return;
    const input = GenericOidcInput.parse(req.body);
    const conn = await workos.sso.createConnection({
      organizationId: orgId,
      type: 'GenericOIDC',
      source: { kind: 'oidc', ...input },
    });
    await writeAuditEvent({
      kind: 'sso.link',
      orgId,
      meta: { provider: 'generic-oidc', connectionId: conn.id },
    });
    return reply.send({ id: conn.id, orgId, status: conn.status, acsUrl: conn.acsUrl });
  });

  // Real round-trip — open an IdP-initiated authorize against the connection
  // and report whether WorkOS can resolve the chain. The frontend opens the
  // returned URL in a popup and posts the result back.
  app.post('/test', async (req, reply) => {
    const orgId = requireOrgId(req, reply);
    if (!orgId) return;
    const url = await workos.getAuthorizationUrl({
      organizationId: orgId,
      redirectUri: `${process.env.PUBLIC_BASE_URL}/api/auth/admin/sso/test/callback`,
      state: `admin-test:${orgId}`,
    });
    return reply.send({ testUrl: url });
  });

  app.post('/require', async (req, reply) => {
    const orgId = requireOrgId(req, reply);
    if (!orgId) return;
    const { required } = RequireInput.parse(req.body);
    await setSsoRequired(orgId, required);
    // TODO(MIN-19): emit a dedicated `sso.require_changed` audit event once
    // the audit-log expansion lands. For now we leave this off rather than
    // misuse `sso.link`/`sso.unlink`.
    return reply.send({ required });
  });

  app.delete('/', async (req, reply) => {
    const orgId = requireOrgId(req, reply);
    if (!orgId) return;
    await disconnectSso(orgId);
    await writeAuditEvent({ kind: 'sso.unlink', orgId });
    return reply.send({ ok: true });
  });
}

const GoogleInput = z.object({ domain: z.string().min(1) });

const GenericSamlInput = z
  .object({
    metadataUrl: z.string().url().optional(),
    metadataXml: z.string().min(1).optional(),
  })
  .refine((v) => Boolean(v.metadataUrl) !== Boolean(v.metadataXml), {
    message: 'provide exactly one of metadataUrl or metadataXml',
  });

const GenericOidcInput = z.object({
  issuer: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
});

const RequireInput = z.object({ required: z.boolean() });

export interface ConnectionStatus {
  provider: IdpProvider | null;
  connectionId: string | null;
  status: 'active' | 'unverified' | 'disconnected';
  ssoRequired: boolean;
  lastTestedAt: string | null;
  lastTestResult: 'success' | 'failure' | null;
}

async function loadConnectionStatus(_orgId: OrgId): Promise<ConnectionStatus> {
  // TODO: read sso_connections + organizations.sso_required for orgId
  return {
    provider: null,
    connectionId: null,
    status: 'disconnected',
    ssoRequired: false,
    lastTestedAt: null,
    lastTestResult: null,
  };
}

async function setSsoRequired(_orgId: OrgId, _required: boolean): Promise<void> {
  // TODO: UPDATE organizations SET sso_required = $1 WHERE id = $2
  // Background: flipping this on stamps every active password session via
  // the session-migration job (MIN-10) so the AuthGuard 401s with
  // reason=sso_required and the frontend interceptor routes to /login.
}

async function disconnectSso(_orgId: OrgId): Promise<void> {
  // TODO: tear down WorkOS connection + null out sso fields on the org row
}

function requireOrgId(req: FastifyRequest, reply: FastifyReply): OrgId | null {
  const orgId = (req as FastifyRequest & { orgId?: string }).orgId;
  if (!orgId) {
    reply.code(401).send({ error: 'no_org' });
    return null;
  }
  return orgId;
}
