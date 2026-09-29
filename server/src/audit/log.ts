import type { OrgId, UserId } from '@shared/types';

// MIN-19: backlog. Customer-facing dashboard surfaces these events.
// Several enterprise prospects asked for it during procurement.
export type AuditEventKind =
  | 'sso.signin'
  | 'sso.link'
  | 'sso.unlink'
  | 'scim.user.provisioned'
  | 'scim.user.deactivated'
  | 'jit.user.provisioned'
  | 'jit.user.rejected'
  | 'jit.settings.updated'
  | 'apikey.issued'
  | 'apikey.revoked';

export interface AuditEvent {
  kind: AuditEventKind;
  userId?: UserId;
  orgId: OrgId;
  meta?: Record<string, unknown>;
}

export async function writeAuditEvent(_event: AuditEvent) {
  // INSERT INTO audit_events ...
}
