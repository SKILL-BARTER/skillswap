import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Avatar, CoinIcon, Logo } from './ui.jsx';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  const loadPending = useCallback(() => {
    api('/swaps')
      .then(({ swaps }) => {
        setPendingCount(swaps.filter((s) => s.status === 'pending' && s.i_am === 'recipient').length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadPending();
    window.addEventListener('swaps-changed', loadPending);
    return () => window.removeEventListener('swaps-changed', loadPending);
  }, [loadPending]);

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand">
          <Logo />
          <span>
            SkillSwap
            <small>trade skills, not money</small>
          </span>
        </Link>

        <div className="nav-links">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/discover">Discover</NavLink>
          <NavLink to="/swaps">
            My swaps
            {pendingCount > 0 ? <span className="nav-badge">{pendingCount}</span> : null}
          </NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </div>

        <div className="nav-right">
          <span className="credits-chip" title="Skill credits earned from completed swaps">
            <CoinIcon size={14} />
            {user?.credits ?? 0}
          </span>
          <Link to="/profile" title="Your profile">
            <Avatar user={user} size={32} />
          </Link>
          <button
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
