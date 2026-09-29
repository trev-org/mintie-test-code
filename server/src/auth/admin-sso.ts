import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { connectOktaConnection } from './providers/okta.js';
import { requireStepUp } from '../mfa/step-up.js';
import { writeAuditEvent } from '../audit/log.js';

// MIN-20: JIT settings. `admin` is not a valid default role; domains are
// normalized to lowercase and must be verified for the org.
const JitSettings = z.object({
  enabled: z.boolean(),
  defaultRole: z.enum(['member', 'viewer']).default('member'),
  allowedDomains: z
    .array(z.string().trim().toLowerCase().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/))
    .max(50)
    .default([]),
}).refine((v) => !v.enabled || v.allowedDomains.length > 0, {
  message: 'at least one allowed domain is required to enable JIT',
  path: ['allowedDomains'],
});

// MIN-12 / MIN-15: admin endpoints for SSO connection setup.
// Called from the SSO settings page in web/src/pages/settings-sso.tsx.
export async function adminSsoRoutes(app: FastifyInstance) {
  app.post('/okta', async (req: FastifyRequest, reply: FastifyReply) => {
    const orgId = (req as FastifyRequest & { orgId?: string }).orgId;
    if (!orgId) return reply.code(401).send({ error: 'no_org' });

    const conn = await connectOktaConnection({ orgId, ...(req.body as object) });
    return reply.send(conn);
  });

  app.get('/jit', async (req: FastifyRequest, reply: FastifyReply) => {
    const orgId = (req as FastifyRequest & { orgId?: string }).orgId;
    if (!orgId) return reply.code(401).send({ error: 'no_org' });
    return reply.send(await loadJitSettings(orgId));
  });

  app.put('/jit', async (req: FastifyRequest, reply: FastifyReply) => {
    const orgId = (req as FastifyRequest & { orgId?: string }).orgId;
    if (!orgId) return reply.code(401).send({ error: 'no_org' });

    const parsed = JitSettings.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_jit_settings', issues: parsed.error.issues });

    const unverified = await unverifiedDomains(orgId, parsed.data.allowedDomains);
    if (unverified.length) return reply.code(400).send({ error: 'domain_not_verified', domains: unverified });

    await requireStepUp(req.principal!, 'sso.connection.update');
    await saveJitSettings(orgId, parsed.data);
    await writeAuditEvent({ kind: 'jit.settings.updated', userId: req.principal?.userId, orgId, meta: parsed.data });
    return reply.send(parsed.data);
  });
}

type JitSettingsBody = z.infer<typeof JitSettings>;

async function loadJitSettings(_orgId: string): Promise<JitSettingsBody> {
  // TODO: SELECT jit_enabled, jit_default_role, jit_allowed_domains FROM organizations
  return { enabled: false, defaultRole: 'member', allowedDomains: [] };
}

async function saveJitSettings(_orgId: string, _settings: JitSettingsBody) {
  // TODO: UPDATE organizations SET jit_enabled, jit_default_role, jit_allowed_domains
}

async function unverifiedDomains(_orgId: string, _domains: string[]): Promise<string[]> {
  // TODO: diff against the org's verified domains
  return [];
}
