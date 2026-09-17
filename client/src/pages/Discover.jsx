import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import MatchCard from '../components/MatchCard.jsx';
import SwapRequestModal from '../components/SwapRequestModal.jsx';
import { EmptyState, Notice } from '../components/ui.jsx';

export default function Discover() {
  const { user } = useAuth();
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [requestMatch, setRequestMatch] = useState(null);

  useEffect(() => {
    api('/matches')
      .then((data) => setMatches(data.matches))
      .catch((e) => {
        setError(e.message);
        setMatches([]);
      });
  }, []);

  const hasTeach = (user.skills?.teach?.length || 0) > 0;
  const hasLearn = (user.skills?.learn?.length || 0) > 0;
  const missingSkills = !hasTeach || !hasLearn;

  return (
    <div className="stack">
      <header className="spread">
        <div>
          <h1>
            Discover <span className="grad-text">matches</span>
          </h1>
          <p className="muted" style={{ margin: 0, maxWidth: '70ch' }}>
            Ranked by how well your skills complement theirs: +25 for each skill they teach that you want
            to learn, +25 for each skill you can teach them, +20 when the swap works both ways.
          </p>
        </div>
      </header>

      {missingSkills ? (
        <Notice kind="info">
          {hasTeach ? '' : 'Add a skill you can teach. '}
          {hasLearn ? '' : 'Add something you want to learn. '}
          <Link className="link" to="/profile">
            Update my skills
          </Link>{' '}
          to unlock better matches.
        </Notice>
      ) : null}

      {notice ? (
        <Notice kind="success" onClose={() => setNotice('')}>
          {notice}
        </Notice>
      ) : null}

      {error ? (
        <Notice kind="error" onClose={() => setError('')}>
          {error}
        </Notice>
      ) : null}

      {matches === null ? (
        <div className="card pad muted">Scoring matches…</div>
      ) : matches.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No matches yet"
            action={
              <Link className="btn btn-ghost btn-sm" to="/profile">
                Update my skills
              </Link>
            }
          >
            Nobody currently teaches what you want to learn (or wants what you teach). Try adding a few
            more skills on both sides.
          </EmptyState>
        </div>
      ) : (
        <div className="stack">
          {matches.map((match) => (
            <MatchCard key={match.user.id} match={match} onRequest={setRequestMatch} />
          ))}
        </div>
      )}

      {requestMatch ? (
        <SwapRequestModal
          match={requestMatch}
          onClose={() => setRequestMatch(null)}
          onSent={(swap) => {
            setRequestMatch(null);
            setNotice(`Request sent to ${swap.counterpart.name}. Track it under My swaps.`);
          }}
        />
      ) : null}
    </div>
  );
}
