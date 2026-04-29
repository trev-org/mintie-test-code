import type { OrgId, UserId, IdpProvider } from '@shared/types';

// MIN-11: shared interface so downstream consumers stop branching on
// auth method. Every guard now returns AuthenticatedPrincipal.
export interface AuthenticatedPrincipal {
  readonly userId: UserId;
  readonly orgId: OrgId;
  readonly authMethod: 'password' | 'sso';
}

export class PasswordPrincipal implements AuthenticatedPrincipal {
  readonly authMethod = 'password' as const;
  constructor(readonly userId: UserId, readonly orgId: OrgId) {}
}

export class SsoPrincipal implements AuthenticatedPrincipal {
  readonly authMethod = 'sso' as const;
  constructor(
    readonly userId: UserId,
    readonly orgId: OrgId,
    readonly idpProvider: IdpProvider,
    readonly idpUserId: string,
  ) {}
}
