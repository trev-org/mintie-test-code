import { useState } from 'react';
import { SsoButton } from '../components/SsoButton.js';
import { useFlag } from '../hooks/useFlag.js';

// MIN-20: reason codes from the SSO callback's JIT rejection redirect.
const JIT_ERROR_MESSAGES: Record<string, string> = {
  jit_disabled: "You don't have a Mintie account yet. Ask your org admin to invite you.",
  jit_domain_not_allowed: "Your email domain isn't approved for automatic sign-up. Ask your org admin to invite you.",
  jit_seat_limit_reached: 'Your organization has no available seats. Ask your org admin to free up or add seats.',
  jit_missing_email: "Your identity provider didn't send an email address. Ask your IT team to check the SSO app's attribute mapping.",
};

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const ssoEnabled = useFlag('sso_enabled');
  const errorCode = new URLSearchParams(window.location.search).get('error');
  const errorMessage = errorCode ? JIT_ERROR_MESSAGES[errorCode] : undefined;

  return (
    <main>
      <h1>Sign in</h1>
      {errorMessage && <p role="alert">{errorMessage}</p>}
      <input
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {ssoEnabled && !showPasswordForm && (
        <SsoButton email={email} onFallback={() => setShowPasswordForm(true)} />
      )}
      {showPasswordForm && <PasswordForm email={email} />}
    </main>
  );
}

function PasswordForm({ email }: { email: string }) {
  void email;
  return <form>{/* legacy password sign-in, sunsetting */}</form>;
}
