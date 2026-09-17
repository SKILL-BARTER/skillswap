import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import MatchCard from '../components/MatchCard.jsx';
import ReviewModal from '../components/ReviewModal.jsx';
import SkillEditor from '../components/SkillEditor.jsx';
import SwapCard from '../components/SwapCard.jsx';
import SwapRequestModal from '../components/SwapRequestModal.jsx';
import { CoinIcon, EmptyState, Notice, Stars } from '../components/ui.jsx';

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const [swaps, setSwaps] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [requestMatch, setRequestMatch] = useState(null);
  const [reviewSwap, setReviewSwap] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([api('/swaps'), api('/matches')]);
      setSwaps(s.swaps);
      setMatches(m.matches);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onChange = () => load();
    window.addEventListener('swaps-changed', onChange);
    return () => window.removeEventListener('swaps-changed', onChange);
  }, [load]);

  const incoming = swaps.filter((s) => s.status === 'pending' && s.i_am === 'recipient');
  const active = swaps.filter((s) => s.status === 'accepted');
  const completed = swaps.filter((s) => s.status === 'completed');
  const firstName = user.name.split(' ')[0];
  const topMatches = matches.slice(0, 3);

  const replaceSwap = (updated) =>
    setSwaps((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

  return (
    <div className="stack">
      {/* Hero */}
      <section className="card pad">
        <div className="spread">
          <div>
            <h1 style={{ marginBottom: 4 }}>
              Hey {firstName} <span className="grad-text">— here's your swap board</span>
            </h1>
            <p className="muted" style={{ margin: 0 }}>
              {incoming.length > 0
                ? `${incoming.length} swap request${incoming.length > 1 ? 's' : ''} waiting for your answer.`
                : `${matches.length} student${matches.length === 1 ? '' : 's'} match your skills right now.`}
            </p>
          </div>
          <Link className="btn btn-primary" to="/discover">
            Find matches
          </Link>
        </div>

        <div className="stat-row" style={{ marginTop: 18 }}>
          <div className="stat card">
            <span className="stat-label">Skill credits</span>
            <span className="stat-value row" style={{ gap: 8 }}>
              <CoinIcon size={20} />
              {user.credits}
            </span>
            <span className="stat-sub">+10 per completed swap</span>
          </div>
          <div className="stat card">
            <span className="stat-label">Your rating</span>
            <span className="stat-value">
              {user.rating?.count ? (
                <span className="row" style={{ gap: 8 }}>
                  {user.rating.avg}
                  <Stars value={user.rating.avg} size={16} />
                </span>
              ) : (
                '—'
              )}
            </span>
            <span className="stat-sub">
              {user.rating?.count
                ? `${user.rating.count} review${user.rating.count === 1 ? '' : 's'} received`
                : 'No reviews yet'}
            </span>
          </div>
          <div className="stat card">
            <span className="stat-label">Swaps in progress</span>
            <span className="stat-value">{active.length}</span>
            <span className="stat-sub">{incoming.length} pending request{incoming.length === 1 ? '' : 's'}</span>
          </div>
          <div className="stat card">
            <span className="stat-label">Completed swaps</span>
            <span className="stat-value">{completed.length}</span>
            <span className="stat-sub">Trust history other students can see</span>
          </div>
        </div>
      </section>

      {error ? (
        <Notice kind="error" onClose={() => setError('')}>
          {error}
        </Notice>
      ) : null}
      {notice ? (
        <Notice kind="success" onClose={() => setNotice('')}>
          {notice}
        </Notice>
      ) : null}

      {/* Incoming requests */}
      {incoming.length > 0 ? (
        <section>
          <div className="section-title">
            <h2>Requests waiting for you</h2>
            <Link className="link small" to="/swaps">
              Open My swaps
            </Link>
          </div>
          <div className="stack">
            {incoming.map((swap) => (
              <SwapCard key={swap.id} swap={swap} onUpdate={replaceSwap} onReview={setReviewSwap} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Top matches */}
      <section>
        <div className="section-title">
          <h2>Top matches for you</h2>
          <Link className="link small" to="/discover">
            See all {matches.length} matches
          </Link>
        </div>
        {!loaded ? (
          <div className="card pad muted">Scoring your matches…</div>
        ) : topMatches.length === 0 ? (
          <div className="card">
            <EmptyState
              title="No matches yet"
              action={
                <Link className="btn btn-ghost btn-sm" to="/profile">
                  Update my skills
                </Link>
              }
            >
              Add skills on both sides of your profile — what you can teach and what you want to learn —
              and matches will appear here.
            </EmptyState>
          </div>
        ) : (
          <div className="stack">
            {topMatches.map((match) => (
              <MatchCard key={match.user.id} match={match} onRequest={setRequestMatch} />
            ))}
          </div>
        )}
      </section>

      {/* In-progress swaps */}
      {active.length > 0 ? (
        <section>
          <div className="section-title">
            <h2>In progress</h2>
          </div>
          <div className="stack">
            {active.map((swap) => (
              <SwapCard key={swap.id} swap={swap} onUpdate={replaceSwap} onReview={setReviewSwap} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Skills */}
      <SkillEditor skills={user.skills} onChange={(skills) => setUser({ ...user, skills })} />

      {requestMatch ? (
        <SwapRequestModal
          match={requestMatch}
          onClose={() => setRequestMatch(null)}
          onSent={(swap) => {
            setRequestMatch(null);
            setNotice(`Request sent to ${swap.counterpart.name}. Track it under My swaps.`);
            load();
          }}
        />
      ) : null}

      {reviewSwap ? (
        <ReviewModal
          swap={reviewSwap}
          onClose={() => setReviewSwap(null)}
          onDone={(updated) => {
            setReviewSwap(null);
            replaceSwap(updated);
            setNotice('Thanks! Your review is live on their profile.');
          }}
        />
      ) : null}
    </div>
  );
}
