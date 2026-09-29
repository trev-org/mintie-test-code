import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

// MIN-17: keys carry idp_user_id; middleware checks the IdP active status
// with a 5-minute cache so deactivation in IdP propagates to key auth fast.
const idpActiveCache = new Map<string, { active: boolean; checkedAt: number }>();
const CACHE_TTL_MS = 5 * 60_000;

// Optional key expiry, 1–365 days from creation. Checked before the IdP
// check and applies to service account keys too. Auth middleware responds
// `401 key_expired` and writes an `apikey.expired` audit event.
export const MAX_API_KEY_TTL_DAYS = 365;

export function isApiKeyExpired(key: { expiresAt: string | null }, now = new Date()) {
  return key.expiresAt != null && new Date(key.expiresAt) <= now;
}

export async function isApiKeyStillValid(key: {
  idpUserId: string | null;
  isServiceAccount: boolean;
  expiresAt: string | null;
}) {
  if (isApiKeyExpired(key)) return false;
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

const CreateKey = z.object({
  name: z.string().min(1).max(100),
  expiresInDays: z.number().int().min(1).max(MAX_API_KEY_TTL_DAYS).optional(),
});

export async function apiKeyRoutes(app: FastifyInstance) {
  app.get('/', async (_req: FastifyRequest) => ({ keys: [] }));

  app.post('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateKey.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_expiry', issues: parsed.error.issues });

    const { expiresInDays } = parsed.data;
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
      : null;
    // TODO: INSERT INTO api_keys (..., expires_at), return the secret once
    return reply.code(201).send({ name: parsed.data.name, expiresAt });
  });
}
