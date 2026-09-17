import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, CheckIcon, MatchRing, Stars, SwapIcon } from './ui.jsx';

const Chevron = ({ up }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
  </svg>
);

export function ScoreBreakdown({ breakdown }) {
  const [open, setOpen] = useState(false);
  if (!breakdown?.length) return null;
  return (
    <div>
      <button type="button" className="breakdown-toggle row" style={{ gap: 6 }} onClick={() => setOpen((v) => !v)}>
        <Chevron up={open} />
        {open ? 'Hide score breakdown' : 'How this score is calculated'}
      </button>
      {open ? (
        <div className="breakdown" style={{ marginTop: 8 }}>
          {breakdown.map((row) => (
            <div className="breakdown-row" key={row.label}>
              <span>{row.label}</span>
              <b>+{row.points}</b>
            </div>
          ))}
          <div className="breakdown-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 6 }}>
            <span>Total (capped at 100)</span>
            <b>{Math.min(100, breakdown.reduce((s, r) => s + r.points, 0))}%</b>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function MatchCard({ match, onRequest }) {
  const { user, score, reasons, breakdown, suggestion } = match;

  return (
    <article className="card card-hover match-card">
      <div className="match-main">
        <div className="match-head">
          <Avatar user={user} size={46} />
          <div>
            <h3>{user.name}</h3>
            <div className="match-meta">
              {user.university ? <span>{user.university}</span> : null}
              {user.university ? <span className="meta-sep">·</span> : null}
              {user.rating?.count > 0 ? (
                <span className="row" style={{ gap: 5 }}>
                  <Stars value={user.rating.avg} size={13} />
                  {user.rating.avg} ({user.rating.count})
                </span>
              ) : (
                <span>New to SkillSwap</span>
              )}
              <span className="meta-sep">·</span>
              <span>
                {user.completed_swaps || 0} swap{user.completed_swaps === 1 ? '' : 's'} completed
              </span>
            </div>
          </div>
        </div>

        <ul className="reasons">
          {reasons.map((reason) => (
            <li key={reason}>
              <span className="reason-check">
                <CheckIcon size={10} />
              </span>
              {reason}
            </li>
          ))}
        </ul>

        {suggestion ? (
          <div className="exchange">
            <span>
              You teach <b>{suggestion.teach.name}</b>
            </span>
            <span className="exchange-arrow">
              <SwapIcon size={15} />
            </span>
            <span>
              You learn <b>{suggestion.learn.name}</b>
            </span>
          </div>
        ) : null}

        <ScoreBreakdown breakdown={breakdown} />
      </div>

      <div className="match-side">
        <MatchRing score={score} />
        <div className="match-actions">
          <button className="btn btn-primary" onClick={() => onRequest(match)}>
            Offer a swap
          </button>
          <Link className="btn btn-ghost btn-sm" to={`/u/${user.id}`}>
            View profile
          </Link>
        </div>
      </div>
    </article>
  );
}
