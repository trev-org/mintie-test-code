export type OrgId = string;
export type UserId = string;

export type IdpProvider = 'okta' | 'google' | 'generic-saml' | 'generic-oidc';

export interface User {
  id: UserId;
  orgId: OrgId;
  email: string;
  idpProvider: IdpProvider | null;
  idpUserId: string | null;
}

export interface Organization {
  id: OrgId;
  name: string;
  ssoEnabled: boolean;
  ssoRequired: boolean;
  jitEnabled: boolean;
  passwordSunsetAt: string | null;
}

export interface Session {
  id: string;
  userId: UserId;
  orgId: OrgId;
  authMethod: 'password' | 'sso';
  forceSsoReloginAt: string | null;
}
