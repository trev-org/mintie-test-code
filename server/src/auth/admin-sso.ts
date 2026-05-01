import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { connectOktaConnection } from './providers/okta.js';

// MIN-12 / MIN-15: admin endpoints for SSO connection setup.
// Called from the SSO settings page in web/src/pages/settings-sso.tsx.
export async function adminSsoRoutes(app: FastifyInstance) {
  app.post('/okta', async (req: FastifyRequest, reply: FastifyReply) => {
    const orgId = (req as FastifyRequest & { orgId?: string }).orgId;
    if (!orgId) return reply.code(401).send({ error: 'no_org' });

    const conn = await connectOktaConnection({ orgId, ...(req.body as object) });
    return reply.send(conn);
  });
}
