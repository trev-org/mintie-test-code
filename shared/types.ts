export type OrgId = string;
export type UserId = string;

export type IdpProvider = 'okta' | 'google' | 'generic-saml' | 'generic-oidc';

export type Role = 'admin' | 'member' | 'viewer';

// Roles JIT is allowed to assign. `admin` is deliberately excluded — admin
// access must be granted by an existing admin or via SCIM group mapping.
export type JitRole = Exclude<Role, 'admin'>;

export type ProvisionedVia = 'invite' | 'scim' | 'jit';

export interface User {
  id: UserId;
  orgId: OrgId;
  email: string;
  idpProvider: IdpProvider | null;
  idpUserId: string | null;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  provisionedVia: ProvisionedVia;
}

export interface Organization {
  id: OrgId;
  name: string;
  ssoEnabled: boolean;
  ssoRequired: boolean;
  jitEnabled: boolean;
  jitDefaultRole: JitRole;
  // Lowercased email domains eligible for JIT. Empty = JIT rejects everyone.
  jitAllowedDomains: string[];
  // Hard seat cap from billing. null = unlimited.
  seatLimit: number | null;
  passwordSunsetAt: string | null;
}

export interface Session {
  id: string;
  userId: UserId;
  orgId: OrgId;
  authMethod: 'password' | 'sso';
  forceSsoReloginAt: string | null;
}
