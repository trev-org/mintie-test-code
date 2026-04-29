import type { IdpProvider } from '@shared/types';

// MIN-20: just-in-time provisioning. Backlog — likely follow-up after SCIM
// ships, for customers without SCIM tooling.
export async function provisionViaJit(profile: {
  email: string;
  idpProvider: IdpProvider;
  idpUserId: string;
  orgId: string;
}): Promise<{ id: string; orgId: string }> {
  // TODO: read org.jit_enabled, map SAML attributes (email/name/role)
  // to user model, insert.
  return { id: `jit_${profile.idpUserId}`, orgId: profile.orgId };
}
