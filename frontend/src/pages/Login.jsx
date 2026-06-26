import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { usernameError } from '../utils/validators';
import { SignalMark } from '../components/common/UI';

export default function Login() {
  const navigate = useNavigate();
  const { join, username } = useChat();
  const [usernameInput, setUsernameInput] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (username) navigate('/chat', { replace: true });
  }, [username, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = usernameError(usernameInput);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    const res = await join(usernameInput.trim());
    setLoading(false);

    if (res.success) {
      navigate('/chat');
    } else {
      setError(res.error || 'Could not join. Please try a different username.');
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <SignalMark />
          <span className="auth-brand-name">Chat<span>Flow</span></span>
        </div>

        <h1 className="auth-heading">Jump into the conversation</h1>
        <p className="auth-subheading">
          No sign-up, no passwords. Pick a temporary username and start chatting in seconds —
          it's yours only for this session.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="auth-input"
              placeholder="e.g. nightowl_42"
              value={usernameInput}
              maxLength={20}
              autoFocus
              autoComplete="off"
              onChange={(e) => setUsernameInput(e.target.value)}
            />
            <p className="auth-hint">3–20 characters. Letters, numbers, and underscores only.</p>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Joining…' : 'Join ChatFlow'}
          </button>
        </form>

        <p className="auth-footer-link">
          Administrator? <a href="/admin/login">Go to admin panel</a>
        </p>
      </div>
    </div>
  );
}
