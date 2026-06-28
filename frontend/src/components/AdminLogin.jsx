import { useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-jet-black p-6">
        <div className="mb-5 flex items-center gap-2">
          <ShieldCheck className="size-5 text-ocean-mist-light" />
          <h1 className="font-display text-lg font-semibold text-white">Admin sign in</h1>
        </div>

        <label className="mb-1 block text-xs font-medium text-white/60" htmlFor="admin-username">
          Username
        </label>
        <input
          id="admin-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          className="mb-3 w-full rounded-xl bg-ink-black px-3.5 py-2.5 text-sm text-white focus:outline-none"
        />

        <label className="mb-1 block text-xs font-medium text-white/60" htmlFor="admin-password">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-xl bg-ink-black px-3.5 py-2.5 text-sm text-white focus:outline-none"
        />

        {error && <p className="mb-3 text-xs text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={busy || !username || !password}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-royal-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-royal-blue-dark disabled:opacity-40"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </button>
      </form>
    </div>
  );
}
