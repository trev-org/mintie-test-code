import type { FastifyInstance } from 'fastify';
import { idpLookupHandler } from './idp-lookup.js';
import { ssoCallbackHandler } from './sso-callback.js';
import { apiKeyRoutes } from './api-keys.js';
import { adminSsoRoutes } from './admin-sso.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/idp-lookup', idpLookupHandler);
  app.get('/sso/callback', ssoCallbackHandler);
  app.register(apiKeyRoutes, { prefix: '/api-keys' });
  app.register(adminSsoRoutes, { prefix: '/admin/sso' });
}
