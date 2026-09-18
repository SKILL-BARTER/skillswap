import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import ReviewsList from '../components/ReviewsList.jsx';
import SelfieVerify from '../components/SelfieVerify.jsx';
import SkillEditor from '../components/SkillEditor.jsx';
import { Avatar, CameraIcon, CoinIcon, Notice, Stars, VerifiedBadge } from '../components/ui.jsx';

const AVATAR_COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#fb7185'];

// Client-side guardrails for avatar uploads. The image is sent as a base64
// data URL inside the normal PATCH /users/me body (api.js only speaks JSON),
// so keep this small — there's no separate multipart upload endpoint.
const MAX_AVATAR_BYTES = 1.5 * 1024 * 1024; // 1.5MB, comfortably under typical JSON body limits
const ACCEPTED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const emptyForm = (user) => ({
  name: user.name,
  university: user.university || '',
  degree: user.degree || '',
  year_of_study: user.year_of_study || '',
  campus: user.campus || '',
  bio: user.bio || '',
  interests: (user.interests || []).join(', '),
  availability: user.availability || '',
  linkedin_url: user.linkedin_url || '',
  github_url: user.github_url || '',
  portfolio_url: user.portfolio_url || '',
});

export default function Profile() {
  const { user, setUser } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => emptyForm(user));
  const [color, setColor] = useState(user.avatar_color);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
   const [verifyOpen, setVerifyOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api(`/users/${user.id}`)
      .then((data) => setReviews(data.reviews))
      .catch(() => {});
  }, [user.id]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function pickAvatar() {
    fileInputRef.current?.click();
  }

  function onAvatarSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setAvatarError('');

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError('Please choose a PNG, JPG, or WEBP image.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Image is too large (max 1.5MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result); // data:image/...;base64,...
      setAvatarChanged(true);
    };
    reader.onerror = () => setAvatarError('Could not read that file, try again.');
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatarPreview(null);
    setAvatarChanged(true);
    setAvatarError('');
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const interests = form.interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const data = await api('/users/me', {
        method: 'PATCH',
        body: {
          ...form,
          interests,
          avatar_color: color,
          // Only send avatar_data when it actually changed, so leaving it
          // untouched doesn't re-upload/re-encode the existing photo.
          ...(avatarChanged ? { avatar_data: avatarPreview } : {}),
        },
      });
      setUser(data.user);
      setAvatarChanged(false);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    setEditing(false);
    setForm(emptyForm(user));
    setColor(user.avatar_color);
    setAvatarPreview(user.avatar_url || null);
    setAvatarChanged(false);
    setAvatarError('');
    setError('');
  }

  const detailLine = [user.degree, user.year_of_study, user.campus].filter(Boolean).join(' · ');
  const links = [
    user.linkedin_url && { label: 'LinkedIn', href: user.linkedin_url },
    user.github_url && { label: 'GitHub', href: user.github_url },
    user.portfolio_url && { label: 'Portfolio', href: user.portfolio_url },
  ].filter(Boolean);

  return (
    <div className="stack">
      {/* Profile hero */}
      <section className="card profile-hero">
        {!editing ? (
          <Avatar user={{ ...user, avatar_color: color }} size={84} />
        ) : (
          <div className="avatar-editor">
            <button
              type="button"
              className="avatar-editor-trigger"
              onClick={pickAvatar}
              aria-label="Change profile picture"
              title="Change profile picture"
            >
              <Avatar user={{ ...user, avatar_color: color, avatar_url: avatarPreview }} size={84} />
              <span className="avatar-editor-overlay">Change</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={onAvatarSelected}
            />
            {avatarPreview ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={removeAvatar}>
                Remove photo
              </button>
            ) : null}
            {avatarError ? (
              <div className="muted small" style={{ color: '#f87171' }}>
                {avatarError}
              </div>
            ) : null}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!editing ? (
            <>
              <div className="spread">
                <div>
                  <h1 style={{ marginBottom: 2 }}>
                    <span className="name-row">
                      {user.name}
                      {user.verified ? <VerifiedBadge size={20} /> : null}
                    </span>
                  </h1>
                  <div className="muted">
                    {user.university || 'University not set'} · {user.email}
                  </div>
                  {detailLine ? (
                    <div className="muted small" style={{ marginTop: 4 }}>
                      {detailLine}
                    </div>
                  ) : null}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                  Edit profile
                </button>
              </div>
              <p className="bio" style={{ marginTop: 12 }}>
                {user.bio || 'Add a short bio so other students know who they are trading with.'}
              </p>

              {user.interests?.length ? (
                <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {user.interests.map((tag) => (
                    <span key={tag} className="tag-chip">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              {user.availability ? (
                <div className="muted small" style={{ marginTop: 8 }}>
                  Available: {user.availability}
                </div>
              ) : null}

              {links.length ? (
                <div className="row" style={{ gap: 14, marginTop: 8 }}>
                  {links.map((l) => (
                    <a key={l.label} href={l.href} target="_blank" rel="noreferrer noopener" className="link">
                      {l.label}
                    </a>
                  ))}
                </div>
              ) : null}

              <div className="row" style={{ gap: 18, marginTop: 12 }}>
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

              <div className="row" style={{ gap: 12 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="pf-degree">Degree / course (optional)</label>
                  <input
                    id="pf-degree"
                    className="input"
                    value={form.degree}
                    onChange={set('degree')}
                    placeholder="BSc Computer Science"
                  />
                </div>
                <div className="field" style={{ width: 160 }}>
                  <label htmlFor="pf-year">Year of study (optional)</label>
                  <input
                    id="pf-year"
                    className="input"
                    value={form.year_of_study}
                    onChange={set('year_of_study')}
                    placeholder="2nd year"
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="pf-campus">Location / campus (optional)</label>
                <input
                  id="pf-campus"
                  className="input"
                  value={form.campus}
                  onChange={set('campus')}
                  placeholder="Main campus, Berkeley"
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
                <label htmlFor="pf-interests">Interests (optional)</label>
                <input
                  id="pf-interests"
                  className="input"
                  value={form.interests}
                  onChange={set('interests')}
                  placeholder="Photography, chess, rock climbing"
                />
                <div className="muted small" style={{ marginTop: 4 }}>
                  Comma-separated — shown as tags on your profile.
                </div>
              </div>

              <div className="field">
                <label htmlFor="pf-availability">Preferred availability (optional)</label>
                <input
                  id="pf-availability"
                  className="input"
                  value={form.availability}
                  onChange={set('availability')}
                  placeholder="Weekday evenings, Saturday mornings"
                />
              </div>

              <div className="row" style={{ gap: 12 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="pf-linkedin">LinkedIn (optional)</label>
                  <input
                    id="pf-linkedin"
                    className="input"
                    type="url"
                    value={form.linkedin_url}
                    onChange={set('linkedin_url')}
                    placeholder="https://linkedin.com/in/…"
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="pf-github">GitHub (optional)</label>
                  <input
                    id="pf-github"
                    className="input"
                    type="url"
                    value={form.github_url}
                    onChange={set('github_url')}
                    placeholder="https://github.com/…"
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="pf-portfolio">Portfolio (optional)</label>
                <input
                  id="pf-portfolio"
                  className="input"
                  type="url"
                  value={form.portfolio_url}
                  onChange={set('portfolio_url')}
                  placeholder="https://your-site.com"
                />
              </div>

              <div className="field">
                <label>Avatar color</label>
                <div className="muted small" style={{ marginBottom: 4 }}>
                  Used as your fallback avatar when you don't have a photo set.
                </div>
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
                <button className="btn btn-ghost" type="button" disabled={busy} onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Selfie verification */}
      {user.verified ? (
        <section className="card verify-card">
          <span className="verify-ico">
            <VerifiedBadge size={24} title="Verified student" />
          </span>
          <div style={{ flex: 1, minWidth: '22ch' }}>
            <strong>Verified student</strong>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              Your selfie has been checked — the verified tick shows next to your name everywhere.
            </p>
          </div>
        </section>
      ) : (
        <section className="card verify-card">
          <span className="verify-ico">
            <CameraIcon size={22} />
          </span>
          <div style={{ flex: 1, minWidth: '22ch' }}>
            <strong>Get the verified tick</strong>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              Take a quick selfie so other students know they're trading with a real person. Takes
              about ten seconds.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setVerifyOpen(true)}>
            Verify with a selfie
          </button>
        </section>
      )}

      {verifyOpen ? (
        <SelfieVerify
          onClose={() => setVerifyOpen(false)}
          onVerified={(u) => setUser(u)}
        />
      ) : null}

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
