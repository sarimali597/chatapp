import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { adminApi, setAdminToken } from '../services/api';
import { ADMIN_SESSION_KEY } from '../utils/constants';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { token } = await adminApi.login(form.username, form.password);
      sessionStorage.setItem(ADMIN_SESSION_KEY, token);
      setAdminToken(token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <ShieldCheck size={20} color="var(--accent-secondary)" />
          <span className="auth-brand-name">
            Chat<span>Flow</span> Admin
          </span>
        </div>

        <h1 className="auth-heading">Admin sign-in</h1>
        <p className="auth-subheading">
          Manage online users, rooms, and restrictions. Admins never have access to message content.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="admin-username">
              Admin username
            </label>
            <input
              id="admin-username"
              className="auth-input"
              autoComplete="username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              className="auth-input"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer-link">
          <a href="/">Back to ChatFlow</a>
        </p>
      </div>
    </div>
  );
}
