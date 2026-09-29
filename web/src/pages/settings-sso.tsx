import { useEffect, useState } from 'react';
import { useFlag } from '../hooks/useFlag.js';

// MIN-15: admin-only settings page at /settings/auth/sso.
// Connect IdP, view connection health, test sign-in, force SSO for the org.
type Provider = 'okta' | 'google' | 'generic-saml' | 'generic-oidc';

export function SsoSettingsPage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [requireSso, setRequireSso] = useState(false);
  const jitAvailable = useFlag('jit_provisioning');

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

      <hr />
      <SessionPolicyPanel />

      {jitAvailable && provider != null && (
        <>
          <hr />
          <JitSettingsPanel />
        </>
      )}
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
  if (provider === 'okta') return <OktaConnectionPanel />;
  return (
    <div>
      <p>Connected: {provider}</p>
      <button>Test sign-in</button>
    </div>
  );
}

// MIN-12: Okta-specific setup. Admin pastes the metadata URL or uploads
// the metadata XML; we POST to /api/auth/admin/sso/okta which forwards to
// WorkOS. Group claim mapping (Okta `groups` → Mintie role) is configured
// per-org from the connection details once the connection is active.
function OktaConnectionPanel() {
  const [mode, setMode] = useState<'url' | 'xml'>('url');
  const [metadataUrl, setMetadataUrl] = useState('');
  const [metadataXml, setMetadataXml] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setStatus('saving');
    setError(null);
    try {
      const res = await fetch('/api/auth/admin/sso/okta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(mode === 'url' ? { metadataUrl } : { metadataXml }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus('connected');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'connection failed');
      setStatus('error');
    }
  }

  return (
    <div>
      <h2>Connect Okta</h2>
      <fieldset>
        <label>
          <input type="radio" checked={mode === 'url'} onChange={() => setMode('url')} />
          Metadata URL
        </label>
        <label>
          <input type="radio" checked={mode === 'xml'} onChange={() => setMode('xml')} />
          Metadata XML
        </label>
      </fieldset>

      {mode === 'url' ? (
        <input
          type="url"
          placeholder="https://your-org.okta.com/app/exk.../sso/saml/metadata"
          value={metadataUrl}
          onChange={(e) => setMetadataUrl(e.target.value)}
        />
      ) : (
        <textarea
          placeholder="<EntityDescriptor ...>"
          value={metadataXml}
          onChange={(e) => setMetadataXml(e.target.value)}
          rows={8}
        />
      )}

      <button onClick={submit} disabled={status === 'saving'}>
        {status === 'saving' ? 'Connecting…' : 'Connect'}
      </button>
      {status === 'connected' && <p>Connected. Run a Test sign-in to verify.</p>}
      {status === 'error' && <p role="alert">{error}</p>}
    </div>
  );
}

// MIN-20: JIT settings. Saved via PUT /api/auth/admin/sso/jit, which
// requires step-up MFA and only accepts verified domains.
function JitSettingsPanel() {
  const [enabled, setEnabled] = useState(false);
  const [defaultRole, setDefaultRole] = useState<'member' | 'viewer'>('member');
  const [domains, setDomains] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/admin/sso/jit')
      .then((res) => res.json())
      .then((s) => {
        setEnabled(s.enabled);
        setDefaultRole(s.defaultRole);
        setDomains(s.allowedDomains.join(', '));
      });
  }, []);

  async function save() {
    setStatus('saving');
    setError(null);
    try {
      const res = await fetch('/api/auth/admin/sso/jit', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          enabled,
          defaultRole,
          allowedDomains: domains.split(',').map((d) => d.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed');
      setStatus('error');
    }
  }

  return (
    <div>
      <h2>Just-in-time provisioning</h2>
      <label>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Create accounts on first SSO sign-in
      </label>
      <label>
        Default role
        <select value={defaultRole} onChange={(e) => setDefaultRole(e.target.value as 'member' | 'viewer')}>
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
        </select>
      </label>
      <label>
        Allowed email domains
        <input
          type="text"
          placeholder="acme.com, acme.co.uk"
          value={domains}
          onChange={(e) => setDomains(e.target.value)}
        />
      </label>
      <button onClick={save} disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving…' : 'Save'}
      </button>
      {status === 'saved' && <p>Saved.</p>}
      {status === 'error' && <p role="alert">{error}</p>}
    </div>
  );
}

function confirmRequireSso(): boolean {
  return window.confirm(
    'Requiring SSO will force every active password session in this org to re-authenticate via your IdP. Continue?',
  );
}

// Session lifetime policy. Saved via PUT /api/auth/admin/sso/session-policy,
// which requires step-up MFA. Admins can only tighten the defaults.
function SessionPolicyPanel() {
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(20160);
  const [maxLifetimeHours, setMaxLifetimeHours] = useState(2160);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/admin/sso/session-policy')
      .then((res) => res.json())
      .then((p) => {
        setIdleTimeoutMinutes(p.idleTimeoutMinutes);
        setMaxLifetimeHours(p.maxLifetimeHours);
      });
  }, []);

  async function save() {
    setStatus('saving');
    setError(null);
    try {
      const res = await fetch('/api/auth/admin/sso/session-policy', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idleTimeoutMinutes, maxLifetimeHours }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed');
      setStatus('error');
    }
  }

  return (
    <div>
      <h2>Session lifetime</h2>
      <label>
        Idle timeout (minutes, 15–20160)
        <input
          type="number"
          min={15}
          max={20160}
          value={idleTimeoutMinutes}
          onChange={(e) => setIdleTimeoutMinutes(Number(e.target.value))}
        />
      </label>
      <label>
        Maximum session lifetime (hours, 1–2160)
        <input
          type="number"
          min={1}
          max={2160}
          value={maxLifetimeHours}
          onChange={(e) => setMaxLifetimeHours(Number(e.target.value))}
        />
      </label>
      <p>Changes apply to existing sessions on their next request.</p>
      <button onClick={save} disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving…' : 'Save'}
      </button>
      {status === 'saved' && <p>Saved.</p>}
      {status === 'error' && <p role="alert">{error}</p>}
    </div>
  );
}
