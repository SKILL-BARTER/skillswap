import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import AuthShell from '../components/AuthShell.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { Avatar, Notice } from '../components/ui.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

      <GoogleButton label="Continue with Google (university email)" />

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