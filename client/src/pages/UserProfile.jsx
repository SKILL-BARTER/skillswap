import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import ReviewsList from '../components/ReviewsList.jsx';
import { Avatar, CoinIcon, EmptyState, Notice, SkillChip, Stars } from '../components/ui.jsx';

export default function UserProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    api(`/users/${id}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="stack">
        <Notice kind="error">{error}</Notice>
        <Link className="link" to="/discover">
          Back to matches
        </Link>
      </div>
    );
  }

  if (!data) {
    return <div className="card pad muted">Loading profile…</div>;
  }

  const { user, reviews } = data;

  return (
    <div className="stack">
      <Link className="link small" to="/discover">
        ← Back to matches
      </Link>

      <section className="card profile-hero">
        <Avatar user={user} size={84} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ marginBottom: 2 }}>{user.name}</h1>
          <div className="muted">{user.university || 'University not set'}</div>
          {user.bio ? (
            <p className="bio" style={{ marginTop: 12 }}>
              {user.bio}
            </p>
          ) : null}
          <div className="row" style={{ gap: 18, marginTop: 6 }}>
            <span className="count-chip">
              {user.rating?.count ? (
                <>
                  <Stars value={user.rating.avg} size={14} /> {user.rating.avg} from {user.rating.count}{' '}
                  review{user.rating.count === 1 ? '' : 's'}
                </>
              ) : (
                'No reviews yet'
              )}
            </span>
            <span className="count-chip">{user.completed_swaps} swaps completed</span>
            <span className="count-chip">
              <CoinIcon size={15} /> {user.credits} skill credits
            </span>
          </div>
        </div>
      </section>

      <section className="card pad">
        <div className="skill-columns">
          <div>
            <div className="skill-col-head">
              <h3>
                <span className="legend-dot teach" />
                Can teach
              </h3>
            </div>
            <div className="skill-list">
              {user.skills.teach.length ? (
                user.skills.teach.map((s) => <SkillChip key={s.id} skill={s} tone="teach" />)
              ) : (
                <span className="muted small">No teach skills listed.</span>
              )}
            </div>
          </div>
          <div>
            <div className="skill-col-head">
              <h3>
                <span className="legend-dot learn" />
                Wants to learn
              </h3>
            </div>
            <div className="skill-list">
              {user.skills.learn.length ? (
                user.skills.learn.map((s) => <SkillChip key={s.id} skill={s} tone="learn" />)
              ) : (
                <span className="muted small">No learning goals listed.</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="section-title">
          <h2>Reviews</h2>
        </div>
        {reviews.length ? (
          <ReviewsList reviews={reviews} />
        ) : (
          <div className="card">
            <EmptyState title="No reviews yet">
              {user.name.split(' ')[0]} has not completed a swap yet — be the first to trade with them.
            </EmptyState>
          </div>
        )}
      </section>
    </div>
  );
}
