import type { FastifyInstance } from 'fastify';

// MIN-14: SCIM 2.0 endpoint. Gating requirement for the largest blocked
// deal. Bearer token per org; soft-delete on DELETE; conformance target
// is the Okta SCIM compliance suite.
export async function scimRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req, reply) => {
    const auth = req.headers.authorization ?? '';
    if (!auth.startsWith('Bearer ')) return reply.code(401).send();
    // TODO: validate per-org token, attach orgId to request
  });

  app.get('/Users', async () => ({ Resources: [], totalResults: 0 }));
  app.post('/Users', async () => ({}));
  app.patch('/Users/:id', async () => ({}));
  app.delete('/Users/:id', async () => {
    // soft-delete only — never hard-drop the row, mark deactivated_at
    return {};
  });

  app.get('/Groups', async () => ({ Resources: [], totalResults: 0 }));
  app.post('/Groups', async () => ({}));
  app.patch('/Groups/:id', async () => ({}));
  app.delete('/Groups/:id', async () => ({}));
}
