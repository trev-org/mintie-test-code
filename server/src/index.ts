import Fastify from 'fastify';
import { authRoutes } from './auth/routes.js';
import { scimRoutes } from './scim/routes.js';
import { versionRoutes } from './api/version.js';

const app = Fastify({ logger: true });

app.register(versionRoutes, { prefix: '/api' });
app.register(authRoutes, { prefix: '/api/auth' });
app.register(scimRoutes, { prefix: '/scim/v2' });

app.get('/health', async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 3000);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
