import { useState } from 'react';
import { SsoButton } from '../components/SsoButton.js';
import { useFlag } from '../hooks/useFlag.js';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const ssoEnabled = useFlag('sso_enabled');

  return (
    <main>
      <h1>Sign in</h1>
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
