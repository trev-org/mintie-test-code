// MIN-12: Okta as a first-class provider through WorkOS.
// Two of the three blocked enterprise deals are on Okta.
//
// Acceptance:
//  - admin pastes metadata URL or uploads XML
//  - Okta-specific group claim mapping documented
//  - E2E test against an Okta dev tenant in CI
//
// Status: TODO — wiring goes through workos.sso.connections with the
// Okta connection type.
export async function connectOktaConnection(_input: { metadataUrl?: string; metadataXml?: string }) {
  throw new Error('not implemented (MIN-12)');
}
