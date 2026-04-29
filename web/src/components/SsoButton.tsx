import { useState } from 'react';
import { apiClient } from '../api-client.js';

// MIN-8: "Continue with SSO" entry point. Email-first — user types email,
// we look up the org's IdP config, redirect to provider if SSO is enabled,
// otherwise fall through to password.
export function SsoButton({ email, onFallback }: { email: string; onFallback: () => void }) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await apiClient.post<{ ssoEnabled: boolean; redirectUrl?: string }>(
        '/api/auth/idp-lookup',
        { email },
      );
      if (res.ssoEnabled && res.redirectUrl) window.location.href = res.redirectUrl;
      else onFallback();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={onClick} disabled={loading || !email}>
      {loading ? 'Checking…' : 'Continue with SSO'}
    </button>
  );
}
