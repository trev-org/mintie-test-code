// MIN-13: Google Workspace via WorkOS Directory Sync.
// Lower priority than Okta but covers the third blocked deal.
//
// Acceptance:
//  - OAuth-based admin connect flow
//  - directory sync enumerates users + groups
//  - connection status visible in admin UI
export async function connectGoogleWorkspace(_input: { domain: string }) {
  throw new Error('not implemented (MIN-13)');
}
