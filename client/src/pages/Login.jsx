import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import AuthShell from '../components/AuthShell.jsx';
import { Avatar, Notice } from '../components/ui.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(null);

  useEffect(() => {
    api('/demo-accounts')
      .then(setDemo)
      .catch(() => {});
  }, []);

  if (user) return <Navigate to="/" replace />;

  async function doLogin(mail, pass) {
    setBusy(true);
    setError('');
    try {
      await login(mail, pass);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h2>Welcome back</h2>
      <p className="muted">Sign in to see your matches and swap requests.</p>

      {error ? (
        <div style={{ marginBottom: 14 }}>
          <Notice kind="error" onClose={() => setError('')}>
            {error}
          </Notice>
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          doLogin(email, password);
        }}
      >
        <div className="field">
          <label htmlFor="login-email">University email</label>
          <input
            id="login-email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch" style={{ marginTop: 16 }}>
        New here? <Link to="/register">Create an account</Link>
      </p>

      {demo?.accounts?.length ? (
        <div className="demo-box">
          <h4>Hackathon demo — one click sign in</h4>
          <p className="muted small" style={{ margin: 0 }}>
            Password for all demo students: <code>{demo.password}</code>
          </p>
          <div className="demo-chips">
            {demo.accounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                className="demo-chip"
                disabled={busy}
                onClick={() => doLogin(acc.email, demo.password)}
              >
                <Avatar
                  user={{
                    name: acc.name,
                    avatar_color: ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24'][
                      demo.accounts.indexOf(acc) % 5
                    ],
                  }}
                  size={22}
                />
                {acc.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </AuthShell>
  );
}
