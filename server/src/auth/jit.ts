import type { IdpProvider, JitRole, Organization } from '@shared/types';
import { featureContextForOrg } from '../flags/feature-context.js';
import { writeAuditEvent } from '../audit/log.js';

// MIN-20: just-in-time provisioning. Creates a user on their first
// successful SSO sign-in when the org has opted in. Runs only after the
// (idp_provider, idp_user_id) and email-match lookups in linkOrCreateUser
// both miss. Provisioning only — JIT never updates or deactivates users.

export interface JitProfile {
  email: string;
  idpProvider: IdpProvider;
  idpUserId: string;
  orgId: string;
  firstName?: string;
  lastName?: string;
  // Raw SAML attributes / OIDC claims as surfaced by WorkOS.
  rawAttributes?: Record<string, unknown>;
}

export type JitRejectionReason =
  | 'jit_disabled'
  | 'jit_missing_email'
  | 'jit_domain_not_allowed'
  | 'jit_seat_limit_reached';

export class JitRejectedError extends Error {
  constructor(readonly reason: JitRejectionReason) {
    super(reason);
    this.name = 'JitRejectedError';
  }
}

// First non-empty value wins. SAML attribute names vary by IdP; OIDC claim
// names are standard.
const ATTRIBUTE_MAP = {
  email: ['email', 'emailAddress', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
  firstName: ['firstName', 'givenName', 'given_name'],
  lastName: ['lastName', 'familyName', 'family_name'],
  role: ['role', 'mintie_role'],
} as const;

const JIT_ASSIGNABLE_ROLES: readonly JitRole[] = ['member', 'viewer'];

export interface MappedAttributes {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: JitRole;
}

export function mapAttributes(profile: JitProfile, defaultRole: JitRole): MappedAttributes {
  const attrs = profile.rawAttributes ?? {};
  const pick = (keys: readonly string[], fallback?: string) => {
    for (const key of keys) {
      const value = attrs[key];
      const str = Array.isArray(value) ? value[0] : value;
      if (typeof str === 'string' && str.trim()) return str.trim();
    }
    return fallback?.trim() || null;
  };

  const email = pick(ATTRIBUTE_MAP.email, profile.email)?.toLowerCase() ?? null;
  const claimedRole = pick(ATTRIBUTE_MAP.role)?.toLowerCase();

  // A role claim outside the assignable set (including `admin`) falls back
  // to the org default rather than failing sign-in.
  const role = JIT_ASSIGNABLE_ROLES.includes(claimedRole as JitRole)
    ? (claimedRole as JitRole)
    : defaultRole;

  return {
    email,
    firstName: pick(ATTRIBUTE_MAP.firstName, profile.firstName),
    lastName: pick(ATTRIBUTE_MAP.lastName, profile.lastName),
    role,
  };
}

export function isDomainAllowed(email: string, allowedDomains: string[]): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return allowedDomains.some((d) => d.toLowerCase() === domain);
}

export async function provisionViaJit(profile: JitProfile): Promise<{ id: string; orgId: string }> {
  const org = await loadOrg(profile.orgId);
  const flags = await featureContextForOrg(profile.orgId);

  try {
    if (!flags.jitProvisioning || !org.jitEnabled) throw new JitRejectedError('jit_disabled');

    const mapped = mapAttributes(profile, org.jitDefaultRole);
    if (!mapped.email) throw new JitRejectedError('jit_missing_email');
    if (!isDomainAllowed(mapped.email, org.jitAllowedDomains)) {
      throw new JitRejectedError('jit_domain_not_allowed');
    }

    // User insert and IdP link happen in one transaction so the user is
    // signed in on this same callback — no second redirect. The seat count
    // is taken inside the transaction to avoid racing concurrent sign-ins.
    const user = await withTransaction(async (tx) => {
      if (org.seatLimit != null && (await tx.countActiveUsers(org.id)) >= org.seatLimit) {
        throw new JitRejectedError('jit_seat_limit_reached');
      }
      return tx.insertUser({
        orgId: org.id,
        email: mapped.email!,
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        role: mapped.role,
        idpProvider: profile.idpProvider,
        idpUserId: profile.idpUserId,
        provisionedVia: 'jit',
      });
    });

    await writeAuditEvent({
      kind: 'jit.user.provisioned',
      userId: user.id,
      orgId: org.id,
      meta: { idpProvider: profile.idpProvider, role: mapped.role },
    });
    return user;
  } catch (err) {
    if (err instanceof JitRejectedError) {
      await writeAuditEvent({
        kind: 'jit.user.rejected',
        orgId: org.id,
        meta: { idpProvider: profile.idpProvider, reason: err.reason },
      });
    }
    throw err;
  }
}

async function loadOrg(orgId: string): Promise<Organization> {
  // TODO: SELECT from organizations
  return {
    id: orgId,
    name: '',
    ssoEnabled: true,
    ssoRequired: false,
    jitEnabled: false,
    jitDefaultRole: 'member',
    jitAllowedDomains: [],
    seatLimit: null,
    passwordSunsetAt: null,
  };
}

interface JitTx {
  countActiveUsers(orgId: string): Promise<number>;
  insertUser(row: Record<string, unknown> & { orgId: string; idpUserId: string }): Promise<{ id: string; orgId: string }>;
}

async function withTransaction<T>(fn: (tx: JitTx) => Promise<T>): Promise<T> {
  // TODO: BEGIN / COMMIT via pg pool
  return fn({
    countActiveUsers: async () => 0,
    insertUser: async (row) => ({ id: `jit_${row.idpUserId}`, orgId: row.orgId }),
  });
}
