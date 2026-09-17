import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import ReviewsList from '../components/ReviewsList.jsx';
import SkillEditor from '../components/SkillEditor.jsx';
import { Avatar, CoinIcon, Notice, Stars } from '../components/ui.jsx';

const AVATAR_COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#fb7185'];

export default function Profile() {
  const { user, setUser } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user.name, university: user.university, bio: user.bio });
  const [color, setColor] = useState(user.avatar_color);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/users/${user.id}`)
      .then((data) => setReviews(data.reviews))
      .catch(() => {});
  }, [user.id]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/users/me', {
        method: 'PATCH',
        body: { ...form, avatar_color: color },
      });
      setUser(data.user);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      {/* Profile hero */}
      <section className="card profile-hero">
        <Avatar user={{ ...user, avatar_color: color }} size={84} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {!editing ? (
            <>
              <div className="spread">
                <div>
                  <h1 style={{ marginBottom: 2 }}>{user.name}</h1>
                  <div className="muted">
                    {user.university || 'University not set'} · {user.email}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                  Edit profile
                </button>
              </div>
              <p className="bio" style={{ marginTop: 12 }}>
                {user.bio || 'Add a short bio so other students know who they are trading with.'}
              </p>
              <div className="row" style={{ gap: 18 }}>
                <span className="count-chip">
                  <CoinIcon size={15} /> {user.credits} skill credits
                </span>
                <span className="count-chip">
                  {user.rating?.count ? (
                    <>
                      <Stars value={user.rating.avg} size={14} /> {user.rating.avg} from{' '}
                      {user.rating.count} review{user.rating.count === 1 ? '' : 's'}
                    </>
                  ) : (
                    'No reviews yet'
                  )}
                </span>
                <span className="count-chip">{user.completed_swaps} swaps completed</span>
              </div>
            </>
          ) : (
            <form onSubmit={save}>
              {error ? (
                <div style={{ marginBottom: 12 }}>
                  <Notice kind="error" onClose={() => setError('')}>
                    {error}
                  </Notice>
                </div>
              ) : null}
              <div className="field">
                <label htmlFor="pf-name">Name</label>
                <input id="pf-name" className="input" value={form.name} onChange={set('name')} required />
              </div>
              <div className="field">
                <label htmlFor="pf-university">University</label>
                <input
                  id="pf-university"
                  className="input"
                  value={form.university}
                  onChange={set('university')}
                  placeholder="UC Berkeley"
                />
              </div>
              <div className="field">
                <label htmlFor="pf-bio">Bio</label>
                <textarea
                  id="pf-bio"
                  className="textarea"
                  value={form.bio}
                  onChange={set('bio')}
                  maxLength={500}
                  placeholder="CS junior, guitar beginner, coffee enthusiast…"
                />
              </div>
              <div className="field">
                <label>Avatar color</label>
                <div className="color-swatches">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Color ${c}`}
                      className={`swatch ${c === color ? 'active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
              <div className="row">
                <button className="btn btn-primary" type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save profile'}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditing(false);
                    setForm({ name: user.name, university: user.university, bio: user.bio });
                    setColor(user.avatar_color);
                    setError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <SkillEditor skills={user.skills} onChange={(skills) => setUser({ ...user, skills })} />

      <section>
        <div className="section-title">
          <h2>Reviews you've received</h2>
          <span className="muted small">Only students who completed a swap with you can review you.</span>
        </div>
        <ReviewsList reviews={reviews} />
      </section>
    </div>
  );
}
