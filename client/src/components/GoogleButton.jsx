import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useAuth } from '../auth.jsx';
import { auth as firebaseAuth, googleProvider } from '../firebase.js';
import { Notice } from './ui.jsx';

/* Friendlier texts for the Firebase error codes people actually hit. */
const FRIENDLY_ERRORS = {
  'auth/popup-blocked': 'The sign-in popup was blocked — allow popups for this site and try again.',
  'auth/unauthorized-domain':
    "This domain isn't authorized yet. In the Firebase console open Authentication → Settings → Authorized domains and add it.",
  'auth/operation-not-allowed':
    "Google sign-in isn't enabled yet. In the Firebase console open Authentication → Sign-in method and enable Google.",
  'auth/network-request-failed': 'Could not reach Google — check your connection and try again.',
  'auth/configuration-not-found':
    "Google sign-in isn't configured yet. In the Firebase console open Authentication → Sign-in method and enable Google.",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}

/*
 * "Continue with Google" button shared by the sign-in and sign-up pages.
 * The API only accepts university e-mail addresses, so if the server turns the
 * account away we sign out of Firebase again — otherwise the next click would
 * silently reuse the rejected personal account.
 */
export default function GoogleButton({ label = 'Continue with Google', hint }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setBusy(true);
    setError('');
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const idToken = await result.user.getIdToken();
      try {
        await loginWithGoogle(idToken);
        navigate(location.state?.from?.pathname || '/', { replace: true });
      } catch (serverError) {
        await signOut(firebaseAuth).catch(() => {});
        setError(serverError.message || 'Google sign-in failed');
        setBusy(false);
      }
    } catch (e) {
      // Closing the popup isn't an error worth showing.
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        setBusy(false);
        return;
      }
      setError(FRIENDLY_ERRORS[e.code] || e.message || 'Google sign-in failed');
      setBusy(false);
    }
  }

  return (
    <div>
      {error ? (
        <div style={{ marginBottom: 12 }}>
          <Notice kind="error" onClose={() => setError('')}>
            {error}
          </Notice>
        </div>
      ) : null}
      <button
        type="button"
        className="btn btn-block"
        disabled={busy}
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: '#fff',
          color: '#3c4043',
          border: '1px solid #dadce0',
        }}
      >
        <GoogleIcon />
        {busy ? 'Connecting to Google…' : label}
      </button>
      {hint ? (
        <p className="muted small" style={{ margin: '10px 0 0', textAlign: 'center' }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
