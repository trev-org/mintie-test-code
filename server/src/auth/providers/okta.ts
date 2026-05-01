import { z } from 'zod';
import type { OrgId } from '@shared/types';
import { workos } from './workos.js';
import { writeAuditEvent } from '../../audit/log.js';

// MIN-12: Okta as a first-class provider through WorkOS.
// Two of the three blocked enterprise deals are on Okta.
//
// Connect flow:
//   Admin pastes the Okta SAML metadata URL (preferred) or uploads the
//   metadata XML. We forward to WorkOS as an `OktaSAML` connection scoped
//   to the org's WorkOS organization id.
//
// Group claim mapping:
//   Okta emits group memberships in the SAML AttributeStatement under
//   `groups`. WorkOS surfaces that as `profile.groups: string[]` on the
//   OIDC callback. We map Okta groups → Mintie roles in the connection's
//   attribute mapping (configured per-org from the admin UI).
//   Docs: https://mintietest.mintlify.app/sso/okta#group-mapping

const Input = z
  .object({
    orgId: z.string().min(1),
    metadataUrl: z.string().url().optional(),
    metadataXml: z.string().min(1).optional(),
  })
  .refine((v) => Boolean(v.metadataUrl) !== Boolean(v.metadataXml), {
    message: 'provide exactly one of metadataUrl or metadataXml',
  });

export type ConnectOktaInput = z.infer<typeof Input>;

export interface OktaConnection {
  id: string;
  orgId: OrgId;
  status: 'active' | 'unverified';
  acsUrl: string;
}

export async function connectOktaConnection(input: ConnectOktaInput): Promise<OktaConnection> {
  const { orgId, metadataUrl, metadataXml } = Input.parse(input);

  const conn = await workos.sso.createConnection({
    organizationId: orgId,
    type: 'OktaSAML',
    source: metadataUrl
      ? { kind: 'metadata_url', url: metadataUrl }
      : { kind: 'metadata_xml', xml: metadataXml as string },
  });

  await writeAuditEvent({
    kind: 'sso.link',
    orgId,
    meta: { provider: 'okta', connectionId: conn.id },
  });

  return { id: conn.id, orgId, status: conn.status, acsUrl: conn.acsUrl };
}
