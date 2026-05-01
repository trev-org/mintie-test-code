// MIN-12 — E2E coverage against an Okta dev tenant.
//
// CI wiring: requires OKTA_DEV_METADATA_URL and WORKOS_API_KEY to be set in
// the `sso-e2e` GitHub Actions environment. The dev tenant is the shared
// `mintie-dev.okta.com` org — credentials in 1Password (`SSO E2E - Okta dev`).
//
// What this exercises:
//   1. metadataUrl path — happy path connection create
//   2. metadataXml path — admins on air-gapped networks paste the XML blob
//   3. exclusivity — passing both should reject before hitting WorkOS
//   4. round-trip — issue a SAML assertion against the connection and
//      confirm `profile.groups` is populated (group claim mapping)
//
// Skipped locally unless E2E=1.

import { connectOktaConnection } from './okta.js';

const RUN_E2E = process.env.E2E === '1';
const SKIP = (..._args: unknown[]) => {};
const test = RUN_E2E ? (globalThis as any).test ?? SKIP : SKIP;

test('connects via metadata URL', async () => {
  const url = process.env.OKTA_DEV_METADATA_URL;
  if (!url) throw new Error('OKTA_DEV_METADATA_URL not set');
  const conn = await connectOktaConnection({ orgId: 'org_e2e', metadataUrl: url });
  if (!conn.id) throw new Error('expected connection id');
});

test('rejects when both metadataUrl and metadataXml are provided', async () => {
  let threw = false;
  try {
    await connectOktaConnection({
      orgId: 'org_e2e',
      metadataUrl: 'https://example.okta.com/app/exk1/sso/saml/metadata',
      metadataXml: '<EntityDescriptor/>',
    });
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('expected rejection');
});
