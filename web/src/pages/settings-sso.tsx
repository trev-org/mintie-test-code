import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { IdpProvider } from '@shared/types';
import { apiClient } from '../api-client.js';

// MIN-15: admin-only settings page at /settings/auth/sso.
// Connect IdP, view connection health, test sign-in, force SSO for the org.

interface ConnectionStatus {
  provider: IdpProvider | null;
  connectionId: string | null;
  status: 'active' | 'unverified' | 'disconnected';
  ssoRequired: boolean;
  lastTestedAt: string | null;
  lastTestResult: 'success' | 'failure' | null;
}

const PROVIDER_LABELS: Record<IdpProvider, string> = {
  okta: 'Okta',
  google: 'Google Workspace',
  'generic-saml': 'Generic SAML',
  'generic-oidc': 'Generic OIDC',
};

export function SsoSettingsPage() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [picking, setPicking] = useState<IdpProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setStatus(await apiClient.get<ConnectionStatus>('/api/auth/admin/sso/status'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load SSO status');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!status) return <section><h1>Single sign-on</h1><p>Loading…</p></section>;

  const isConnected = status.status !== 'disconnected' && status.provider != null;

  return (
    <section>
      <header>
        <h1>Single sign-on</h1>
        <p>
          Configure your identity provider so members can sign in with their work
          account. <a href="https://mintietest.mintlify.app/sso">SSO docs</a>
        </p>
      </header>

      {error && <p role="alert">{error}</p>}

      {isConnected ? (
        <ConnectedState status={status} onChange={refresh} />
      ) : picking ? (
        <ConnectFlow
          provider={picking}
          onCancel={() => setPicking(null)}
          onConnected={() => {
            setPicking(null);
            void refresh();
          }}
        />
      ) : (
        <EmptyState onPick={setPicking} />
      )}

      <hr />

      <RequireSsoToggle
        required={status.ssoRequired}
        disabled={!isConnected}
        onToggle={refresh}
      />
    </section>
  );
}

function EmptyState({ onPick }: { onPick: (p: IdpProvider) => void }) {
  return (
    <div>
      <h2>No identity provider connected</h2>
      <p>Pick your identity provider to get started.</p>
      <div role="group" aria-label="Identity provider">
        {(Object.keys(PROVIDER_LABELS) as IdpProvider[]).map((p) => (
          <button key={p} type="button" onClick={() => onPick(p)}>
            {PROVIDER_LABELS[p]}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConnectedState({
  status,
  onChange,
}: {
  status: ConnectionStatus;
  onChange: () => Promise<void> | void;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failure' | null>(
    status.lastTestResult,
  );

  async function runTestSignin() {
    setTesting(true);
    setTestResult(null);
    try {
      const { testUrl } = await apiClient.post<{ testUrl: string }>(
        '/api/auth/admin/sso/test',
        {},
      );
      const result = await openTestPopup(testUrl);
      setTestResult(result);
    } catch {
      setTestResult('failure');
    } finally {
      setTesting(false);
    }
  }

  async function disconnect() {
    const ok = window.confirm(
      'Disconnecting will stop SSO sign-ins for this org. Members already signed in stay signed in until their session expires. Continue?',
    );
    if (!ok) return;
    await apiClient.delete('/api/auth/admin/sso');
    await onChange();
  }

  return (
    <div>
      <h2>{PROVIDER_LABELS[status.provider as IdpProvider]} connected</h2>
      <dl>
        <dt>Status</dt>
        <dd>
          <HealthBadge status={status.status} />
        </dd>
        <dt>Connection ID</dt>
        <dd><code>{status.connectionId}</code></dd>
        <dt>Last test</dt>
        <dd>
          {status.lastTestedAt
            ? `${formatDate(status.lastTestedAt)} — ${status.lastTestResult ?? 'unknown'}`
            : 'never'}
        </dd>
      </dl>

      <div>
        <button type="button" onClick={runTestSignin} disabled={testing}>
          {testing ? 'Testing…' : 'Test sign-in'}
        </button>
        {testResult === 'success' && <span role="status"> ✓ test sign-in succeeded</span>}
        {testResult === 'failure' && (
          <span role="alert"> ✗ test sign-in failed — check the connection details</span>
        )}
      </div>

      <p>
        <button type="button" onClick={disconnect}>
          Disconnect
        </button>
      </p>
    </div>
  );
}

function HealthBadge({ status }: { status: ConnectionStatus['status'] }) {
  if (status === 'active') return <span>● Active</span>;
  if (status === 'unverified') return <span>● Awaiting verification</span>;
  return <span>● Disconnected</span>;
}

function ConnectFlow({
  provider,
  onCancel,
  onConnected,
}: {
  provider: IdpProvider;
  onCancel: () => void;
  onConnected: () => void;
}) {
  return (
    <div>
      <p>
        <button type="button" onClick={onCancel}>
          ← Back
        </button>
      </p>
      <h2>Connect {PROVIDER_LABELS[provider]}</h2>
      {provider === 'okta' && <OktaConnectForm onConnected={onConnected} />}
      {provider === 'google' && <GoogleConnectForm onConnected={onConnected} />}
      {provider === 'generic-saml' && <GenericSamlConnectForm onConnected={onConnected} />}
      {provider === 'generic-oidc' && <GenericOidcConnectForm onConnected={onConnected} />}
    </div>
  );
}

// MIN-12: Okta-specific setup. Admin pastes the metadata URL or uploads
// the metadata XML; we POST to /api/auth/admin/sso/okta which forwards to
// WorkOS. Group claim mapping (Okta `groups` → Mintie role) is configured
// per-org from the connection details once the connection is active.
function OktaConnectForm({ onConnected }: { onConnected: () => void }) {
  const [mode, setMode] = useState<'url' | 'xml'>('url');
  const [metadataUrl, setMetadataUrl] = useState('');
  const [metadataXml, setMetadataXml] = useState('');
  return (
    <ConnectFormShell
      submit={() =>
        apiClient.post('/api/auth/admin/sso/okta', mode === 'url' ? { metadataUrl } : { metadataXml })
      }
      onConnected={onConnected}
    >
      <ol>
        <li>In Okta, create a new SAML 2.0 app for Mintie.</li>
        <li>Copy the metadata URL from the Sign-On tab (or download the XML).</li>
        <li>Paste it below.</li>
      </ol>
      <fieldset>
        <legend>Metadata source</legend>
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
    </ConnectFormShell>
  );
}

// MIN-13: Google Workspace via WorkOS Directory Sync. Admin enters their
// primary domain, then completes the OAuth admin-consent flow in a popup.
function GoogleConnectForm({ onConnected }: { onConnected: () => void }) {
  const [domain, setDomain] = useState('');
  return (
    <ConnectFormShell
      submit={() => apiClient.post('/api/auth/admin/sso/google', { domain })}
      onConnected={onConnected}
    >
      <ol>
        <li>Sign in to Google as a super-admin of your Workspace.</li>
        <li>Enter your primary domain below.</li>
        <li>Approve the Mintie SSO and Directory Sync scopes when prompted.</li>
      </ol>
      <label>
        Primary domain
        <input
          type="text"
          placeholder="acme.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
      </label>
    </ConnectFormShell>
  );
}

function GenericSamlConnectForm({ onConnected }: { onConnected: () => void }) {
  const [mode, setMode] = useState<'url' | 'xml'>('url');
  const [metadataUrl, setMetadataUrl] = useState('');
  const [metadataXml, setMetadataXml] = useState('');
  return (
    <ConnectFormShell
      submit={() =>
        apiClient.post('/api/auth/admin/sso/saml', mode === 'url' ? { metadataUrl } : { metadataXml })
      }
      onConnected={onConnected}
    >
      <ol>
        <li>Create a new SAML 2.0 application in your IdP for Mintie.</li>
        <li>Set the ACS URL and Entity ID we display once you connect.</li>
        <li>Paste the IdP metadata URL or XML below.</li>
      </ol>
      <fieldset>
        <legend>Metadata source</legend>
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
          placeholder="https://idp.example.com/saml/metadata"
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
    </ConnectFormShell>
  );
}

function GenericOidcConnectForm({ onConnected }: { onConnected: () => void }) {
  const [issuer, setIssuer] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  return (
    <ConnectFormShell
      submit={() => apiClient.post('/api/auth/admin/sso/oidc', { issuer, clientId, clientSecret })}
      onConnected={onConnected}
    >
      <ol>
        <li>Register Mintie as an OIDC client in your IdP.</li>
        <li>Use the redirect URI shown after you connect.</li>
        <li>Paste the issuer URL plus the client ID/secret your IdP issued.</li>
      </ol>
      <label>
        Issuer URL
        <input
          type="url"
          placeholder="https://idp.example.com"
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
        />
      </label>
      <label>
        Client ID
        <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} />
      </label>
      <label>
        Client secret
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
        />
      </label>
    </ConnectFormShell>
  );
}

function ConnectFormShell({
  children,
  submit,
  onConnected,
}: {
  children: ReactNode;
  submit: () => Promise<unknown>;
  onConnected: () => void;
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState('saving');
    setError(null);
    try {
      await submit();
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'connection failed');
      setState('error');
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {children}
      <button type="submit" disabled={state === 'saving'}>
        {state === 'saving' ? 'Connecting…' : 'Connect'}
      </button>
      {state === 'error' && <p role="alert">{error}</p>}
    </form>
  );
}

function RequireSsoToggle({
  required,
  disabled,
  onToggle,
}: {
  required: boolean;
  disabled: boolean;
  onToggle: () => Promise<void> | void;
}) {
  const [pending, setPending] = useState<boolean | null>(null);

  async function commit(next: boolean) {
    await apiClient.post('/api/auth/admin/sso/require', { required: next });
    setPending(null);
    await onToggle();
  }

  return (
    <div>
      <label>
        <input
          type="checkbox"
          disabled={disabled}
          checked={required}
          onChange={(e) => setPending(e.target.checked)}
        />
        Require SSO for this org
      </label>
      <p>
        {disabled
          ? 'Connect an identity provider before requiring SSO.'
          : 'Members signed in with a password will be re-authenticated through your IdP.'}
      </p>

      {pending != null && (
        <RequireSsoModal
          enabling={pending}
          onCancel={() => setPending(null)}
          onConfirm={() => commit(pending)}
        />
      )}
    </div>
  );
}

function RequireSsoModal({
  enabling,
  onCancel,
  onConfirm,
}: {
  enabling: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="require-sso-title">
      <h3 id="require-sso-title">
        {enabling ? 'Require SSO for this org?' : 'Stop requiring SSO?'}
      </h3>
      {enabling ? (
        <>
          <p>
            Every active password session in this org will be marked for re-auth. Sessions are
            stamped on a 10%/min rolling schedule via the session-migration job, so members
            will be redirected to your IdP gradually over the next ~10 minutes.
          </p>
          <p>
            New sign-ins must use SSO. Personal access tokens already issued continue to work,
            but new tokens require an SSO session.
          </p>
        </>
      ) : (
        <p>
          Members will be able to sign in with passwords again. Existing SSO sessions are not
          affected.
        </p>
      )}
      <div>
        <button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
        >
          {busy ? 'Working…' : enabling ? 'Require SSO' : 'Stop requiring'}
        </button>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

// Opens the IdP test sign-in flow in a popup and resolves with the result
// posted back from /api/auth/admin/sso/test/callback via window.postMessage.
function openTestPopup(url: string): Promise<'success' | 'failure'> {
  return new Promise((resolve) => {
    const popup = window.open(url, 'mintie-sso-test', 'width=600,height=700');
    if (!popup) {
      resolve('failure');
      return;
    }

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: string; result?: 'success' | 'failure' } | null;
      if (data?.type !== 'mintie-sso-test') return;
      window.removeEventListener('message', onMessage);
      clearInterval(pollClosed);
      popup?.close();
      resolve(data.result === 'success' ? 'success' : 'failure');
    }

    const pollClosed = window.setInterval(() => {
      if (popup.closed) {
        window.removeEventListener('message', onMessage);
        clearInterval(pollClosed);
        resolve('failure');
      }
    }, 500);

    window.addEventListener('message', onMessage);
  });
}
