import type { FastifyInstance } from 'fastify';

// Public API version for the Mintie SSO API.
//
// The OpenAPI spec for this surface is published in the docs repo
// (mintie-test) at `api-reference/openapi.v{N}.json`. A Mintlify automation
// watches this codebase and, when a new version ships, regenerates the docs:
// it adds the new version to the version switcher as the default ("Latest")
// and demotes the previous version to "Legacy".
//
// Releasing v2:
//   1. Bump API_VERSION to 'v2'.
//   2. Add the v2 handlers (e.g. a parallel `server/src/auth` surface or a
//      `/api/v2` route tree) alongside the existing v1 handlers, keeping v1
//      mounted so existing integrations keep working.
//   3. Push. The docs automation picks up the change and versions the docs.
export const API_VERSION = 'v1' as const;

export async function versionRoutes(app: FastifyInstance) {
  app.get('/version', async () => ({ version: API_VERSION }));
}
