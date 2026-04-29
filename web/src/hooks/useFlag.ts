import { useFlags } from 'launchdarkly-react-client-sdk';

// MIN-7: thin wrapper so callers don't import LD directly.
// Usage: const ssoEnabled = useFlag('sso_enabled');
export function useFlag(name: string, fallback = false): boolean {
  const flags = useFlags() as Record<string, boolean>;
  return flags[name] ?? fallback;
}
