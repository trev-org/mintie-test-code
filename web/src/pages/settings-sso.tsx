import { useState } from 'react';

// MIN-15: admin-only settings page at /settings/auth/sso.
// Connect IdP, view connection health, test sign-in, force SSO for the org.
type Provider = 'okta' | 'google' | 'generic-saml' | 'generic-oidc';

export function SsoSettingsPage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [requireSso, setRequireSso] = useState(false);

  return (
    <section>
      <h1>Single sign-on</h1>

      {provider == null ? (
        <ProviderPicker onPick={setProvider} />
      ) : (
        <ConnectionPanel provider={provider} />
      )}

      <hr />

      <label>
        <input
          type="checkbox"
          checked={requireSso}
          onChange={(e) => {
            if (e.target.checked && !confirmRequireSso()) return;
            setRequireSso(e.target.checked);
          }}
        />
        Require SSO for this org
      </label>
      <p>
        Turning this on stamps every active password session for re-auth (rolling 10%/min).
        See <a href="https://mintietest.mintlify.app/migration/timeline">Migration timeline</a>.
      </p>
    </section>
  );
}

function ProviderPicker({ onPick }: { onPick: (p: Provider) => void }) {
  return (
    <div>
      <button onClick={() => onPick('okta')}>Okta</button>
      <button onClick={() => onPick('google')}>Google Workspace</button>
      <button onClick={() => onPick('generic-saml')}>Generic SAML</button>
      <button onClick={() => onPick('generic-oidc')}>Generic OIDC</button>
    </div>
  );
}

function ConnectionPanel({ provider }: { provider: Provider }) {
  return (
    <div>
      <p>Connected: {provider}</p>
      <button>Test sign-in</button>
    </div>
  );
}

function confirmRequireSso(): boolean {
  return window.confirm(
    'Requiring SSO will force every active password session in this org to re-authenticate via your IdP. Continue?',
  );
}
