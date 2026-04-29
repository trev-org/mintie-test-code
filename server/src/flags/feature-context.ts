import LaunchDarkly from 'launchdarkly-node-server-sdk';
import type { OrgId } from '@shared/types';

// MIN-7: per-org boolean flag gating all SSO code paths. Default off; we
// flip per-org as we onboard pilots.
const ld = LaunchDarkly.init(process.env.LAUNCHDARKLY_SDK_KEY ?? '');

export async function featureContextForOrg(orgId: OrgId) {
  await ld.waitForInitialization();
  const ctx = { kind: 'org' as const, key: orgId };
  return {
    ssoEnabled: await ld.variation('sso_enabled', ctx, false),
    ssoRequired: await ld.variation('sso_required', ctx, false),
  };
}
