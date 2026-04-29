import { WorkOS } from '@workos-inc/node';

// MIN-5 outcome: WorkOS is the abstraction layer. Native SCIM, clean
// directory-sync API, tenant-per-org maps to our Organization table.
// Direct Okta/Google adapters can come later if pricing becomes a problem.
export const workos = new WorkOS(process.env.WORKOS_API_KEY ?? '');
