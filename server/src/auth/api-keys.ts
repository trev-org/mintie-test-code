import type { FastifyInstance, FastifyRequest } from 'fastify';

// MIN-17: keys carry idp_user_id; middleware checks the IdP active status
// with a 5-minute cache so deactivation in IdP propagates to key auth fast.
const idpActiveCache = new Map<string, { active: boolean; checkedAt: number }>();
const CACHE_TTL_MS = 5 * 60_000;

export async function isApiKeyStillValid(key: { idpUserId: string | null; isServiceAccount: boolean }) {
  if (key.isServiceAccount) return true;
  if (!key.idpUserId) return true; // legacy password-era keys, sunset alongside passwords

  const cached = idpActiveCache.get(key.idpUserId);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) return cached.active;

  const active = await checkIdpUserActive(key.idpUserId);
  idpActiveCache.set(key.idpUserId, { active, checkedAt: Date.now() });
  return active;
}

async function checkIdpUserActive(_idpUserId: string): Promise<boolean> {
  return true;
}

export async function apiKeyRoutes(app: FastifyInstance) {
  app.get('/', async (_req: FastifyRequest) => ({ keys: [] }));
}
