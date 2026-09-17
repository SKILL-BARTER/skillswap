import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import AuthShell from '../components/AuthShell.jsx';
import { Notice } from '../components/ui.jsx';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', university: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h2>Join SkillSwap</h2>
      <p className="muted">Two minutes to set up. Your first match is usually waiting.</p>

      {error ? (
        <div style={{ marginBottom: 14 }}>
          <Notice kind="error" onClose={() => setError('')}>
            {error}
          </Notice>
        </div>
      ) : null}

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="reg-name">Full name</label>
          <input
            id="reg-name"
            className="input"
            placeholder="Alex Rivera"
            value={form.name}
            onChange={set('name')}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="reg-email">University email</label>
          <input
            id="reg-email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            value={form.email}
            onChange={set('email')}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="reg-university">University (optional)</label>
          <input
            id="reg-university"
            className="input"
            placeholder="UC Berkeley"
            value={form.university}
            onChange={set('university')}
          />
        </div>
        <div className="field">
          <label htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={set('password')}
            minLength={6}
            required
          />
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-switch" style={{ marginTop: 16 }}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
