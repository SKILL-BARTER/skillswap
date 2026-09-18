import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { LevelPips, Modal } from './ui.jsx';
import { Notice, PlusIcon } from './ui.jsx';

export const LEVEL_OPTIONS = [
  ['1', 'Curious'],
  ['2', 'Beginner'],
  ['3', 'Intermediate'],
  ['4', 'Advanced'],
  ['5', 'Expert'],
];

const MAX_MEDIA_PER_SKILL = 4;
const MAX_IMAGE_BYTES = 1_000_000; // 1MB — comfortably under the server's ~1MB base64 cap
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const MAX_VIDEO_SECONDS = 60;
const MAX_VIDEO_BYTES = 6_000_000; // 6MB raw ≈ 8MB once base64-encoded — the server must allow this
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const VIDEO_LINK_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com', 'loom.com'];

// An uploaded clip arrives as a data: URL; a pasted link is an http(s) URL we hand off to the host.
function isExternalVideo(url = '') {
  return /^https?:/i.test(url);
}

function isSupportedVideoLink(raw) {
  try {
    const host = new URL(raw).hostname.replace(/^www\./, '');
    return VIDEO_LINK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

// Reads duration without uploading anything — the browser only pulls the metadata header.
function readVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      const { duration } = probe;
      URL.revokeObjectURL(objectUrl);
      if (!Number.isFinite(duration) || duration <= 0) reject(new Error('unreadable'));
      else resolve(duration);
    };
    probe.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('unreadable'));
    };
    probe.src = objectUrl;
  });
}

function AddSkillRow({ label, name, onName, level, onLevel, onAdd, busy, placeholder }) {
  return (
    <div className="add-skill-row">
      <input
        className="input"
        list="skill-catalogue"
        placeholder={placeholder}
        value={name}
        onChange={(e) => onName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        aria-label={label}
      />
      <select className="select" value={level} onChange={(e) => onLevel(e.target.value)} aria-label={`${label} level`}>
        {LEVEL_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <button className="btn btn-primary" onClick={onAdd} disabled={busy || !name.trim()}>
        <PlusIcon size={15} />
        Add
      </button>
    </div>
  );
}

function MediaThumb({ item, onRemove, onOpen, removing }) {
  const boxStyle = {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    flex: 'none',
    background: 'rgba(255,255,255,0.06)',
  };
  const removeBtnStyle = {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    lineHeight: '18px',
    padding: 0,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(0,0,0,0.65)',
    color: '#fff',
    fontSize: 12,
    cursor: 'pointer',
    zIndex: 1,
  };

  function stopThenRemove(e) {
    e.stopPropagation();
    onRemove();
  }

  return (
    <div className="media-thumb" style={boxStyle}>
      {item.type === 'image' ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label="View larger photo"
          style={{
            width: '100%',
            height: '100%',
            padding: 0,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'block',
          }}
        >
          <img
            src={item.url}
            alt={item.caption || ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </button>
      ) : isExternalVideo(item.url) ? (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer noopener"
          className="media-thumb-video"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 18 }}>▶</span>
          <span className="small">Link</span>
        </a>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          aria-label="Play proof clip"
          style={{
            width: '100%',
            height: '100%',
            padding: 0,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'block',
            position: 'relative',
          }}
        >
          <video
            src={item.url}
            muted
            playsInline
            preload="metadata"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: '#fff',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}
          >
            ▶
          </span>
        </button>
      )}
      <button
        type="button"
        className="media-thumb-remove"
        style={removeBtnStyle}
        onClick={stopThenRemove}
        disabled={removing}
        aria-label="Remove proof"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

function AddProofForm({ userSkillId, onAdded, onCancel }) {
  const [mode, setMode] = useState('image'); // 'image' | 'clip' | 'link'
  const [videoUrl, setVideoUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const clipRef = useRef(null);

  async function post(body) {
    setBusy(true);
    setError('');
    try {
      const data = await api(`/skills/mine/${userSkillId}/media`, { method: 'POST', body });
      onAdded(data.skills);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function onFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Please choose a PNG, JPG, or WEBP image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image is too large (max 1MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => post({ type: 'image', url: reader.result });
    reader.onerror = () => setError('Could not read that file, try again.');
    reader.readAsDataURL(file);
  }

  async function onClipSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');

    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      setError('Please choose an MP4, WEBM, or MOV clip.');
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`That clip is ${(file.size / 1_000_000).toFixed(1)}MB — max ${MAX_VIDEO_BYTES / 1_000_000}MB.`);
      return;
    }

    setBusy(true);
    let duration;
    try {
      duration = await readVideoDuration(file);
    } catch {
      setBusy(false);
      setError("Couldn't read that clip — try re-exporting it as MP4.");
      return;
    }
    setBusy(false);

    // Half a second of slack so a clip trimmed to exactly 60s isn't rejected on a rounding error.
    if (duration > MAX_VIDEO_SECONDS + 0.5) {
      setError(`That clip is ${Math.round(duration)}s — please trim it to ${MAX_VIDEO_SECONDS}s or less.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => post({ type: 'video', url: reader.result, durationSeconds: Math.round(duration) });
    reader.onerror = () => setError('Could not read that file, try again.');
    reader.readAsDataURL(file);
  }

  function submitVideo(e) {
    e.preventDefault();
    const url = videoUrl.trim();
    if (!url) return;
    if (!isSupportedVideoLink(url)) {
      setError('Please paste a YouTube, Vimeo, or Loom link.');
      return;
    }
    post({ type: 'video', url }).then(() => setVideoUrl(''));
  }

  return (
    <div className="proof-form">
      <div className="row" style={{ gap: 6, marginBottom: 8 }}>
        <button
          type="button"
          className={`btn btn-sm ${mode === 'image' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setMode('image')}
        >
          Photo
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === 'clip' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setMode('clip')}
        >
          Upload clip
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === 'link' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setMode('link')}
        >
          Video link
        </button>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onCancel}>
          Done
        </button>
      </div>

      {error ? (
        <div className="muted small" style={{ color: '#f87171', marginBottom: 8 }}>
          {error}
        </div>
      ) : null}

      {mode === 'image' ? (
        <div className="row" style={{ gap: 8 }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={onFileSelected}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : 'Choose photo'}
          </button>
          <span className="muted small">PNG, JPG, or WEBP — max 1MB</span>
        </div>
      ) : mode === 'clip' ? (
        <div className="row" style={{ gap: 8 }}>
          <input
            ref={clipRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            style={{ display: 'none' }}
            onChange={onClipSelected}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => clipRef.current?.click()} disabled={busy}>
            {busy ? 'Checking…' : 'Choose clip'}
          </button>
          <span className="muted small">
            MP4, WEBM, or MOV — max {MAX_VIDEO_SECONDS}s and {MAX_VIDEO_BYTES / 1_000_000}MB
          </span>
        </div>
      ) : (
        <form className="row" style={{ gap: 8 }} onSubmit={submitVideo}>
          <input
            className="input"
            style={{ flex: 1 }}
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !videoUrl.trim()}>
            {busy ? 'Adding…' : 'Add'}
          </button>
        </form>
      )}
      {mode === 'link' ? (
        <p className="hint" style={{ marginTop: 6 }}>
          YouTube, Vimeo, or Loom links only — use “Upload clip” for a short video of your own.
        </p>
      ) : null}
    </div>
  );
}

function SkillRow({ item, tone, onRemove, onChangeLevel, onMediaChange, showMedia = true }) {
  const [addingProof, setAddingProof] = useState(false);
  const [removingMediaId, setRemovingMediaId] = useState(null);
  const [levelBusy, setLevelBusy] = useState(false);
  const [lightboxItem, setLightboxItem] = useState(null);

  async function changeLevel(e) {
    const level = Number(e.target.value);
    setLevelBusy(true);
    try {
      await onChangeLevel(item, level);
    } finally {
      setLevelBusy(false);
    }
  }

  async function removeMedia(mediaItem) {
    setRemovingMediaId(mediaItem.id);
    try {
      const data = await api(`/skills/mine/${item.id}/media/${mediaItem.id}`, { method: 'DELETE' });
      onMediaChange(data.skills);
    } catch {
      // A failed delete just leaves the thumbnail in place — nothing to clean up.
    } finally {
      setRemovingMediaId(null);
    }
  }

  const media = item.media || [];

  return (
    <div className={`skill-row skill-row-${tone}`}>
      <div className="skill-row-main">
        <span className={`legend-dot ${tone}`} />
        <span className="skill-row-name">{item.name}</span>
        <select className="select select-sm" value={item.level} onChange={changeLevel} disabled={levelBusy} aria-label={`${item.name} level`}>
          {LEVEL_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <LevelPips level={item.level} />
        <button className="chip-x" onClick={onRemove} aria-label={`Remove ${item.name}`} title="Remove skill" style={{ marginLeft: 'auto' }}>
          ×
        </button>
      </div>

      {showMedia ? (
        <>
          {media.length ? (
            <div className="media-strip" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0' }}>
              {media.map((m) => (
                <MediaThumb
                  key={m.id}
                  item={m}
                  onRemove={() => removeMedia(m)}
                  onOpen={() => (m.type === 'image' || !isExternalVideo(m.url)) && setLightboxItem(m)}
                  removing={removingMediaId === m.id}
                />
              ))}
            </div>
          ) : null}

          {addingProof ? (
            <AddProofForm
              userSkillId={item.id}
              onAdded={(skills) => {
                onMediaChange(skills);
              }}
              onCancel={() => setAddingProof(false)}
            />
          ) : media.length < MAX_MEDIA_PER_SKILL ? (
            <button type="button" className="btn btn-ghost btn-sm proof-toggle" onClick={() => setAddingProof(true)}>
              <PlusIcon size={13} />
              {media.length ? 'Add more proof' : 'Add proof (photo or video)'}
            </button>
          ) : (
            <span className="muted small">Max {MAX_MEDIA_PER_SKILL} items reached</span>
          )}

          {lightboxItem ? (
            <Modal
              title={`${item.name} — proof ${lightboxItem.type === 'image' ? 'photo' : 'clip'}`}
              onClose={() => setLightboxItem(null)}
            >
              {lightboxItem.type === 'image' ? (
                <img
                  src={lightboxItem.url}
                  alt={lightboxItem.caption || ''}
                  style={{
                    display: 'block',
                    width: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    borderRadius: 8,
                    margin: '0 auto',
                  }}
                />
              ) : (
                <video
                  src={lightboxItem.url}
                  controls
                  autoPlay
                  playsInline
                  style={{ display: 'block', width: '100%', maxHeight: '70vh', borderRadius: 8, margin: '0 auto' }}
                />
              )}
              <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    removeMedia(lightboxItem);
                    setLightboxItem(null);
                  }}
                >
                  Remove this {lightboxItem.type === 'image' ? 'photo' : 'clip'}
                </button>
              </div>
            </Modal>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default function SkillEditor({ skills, onChange }) {
  const safeSkills = skills ?? { teach: [], learn: [] };
  const [catalogue, setCatalogue] = useState([]);
  const [teachName, setTeachName] = useState('');
  const [learnName, setLearnName] = useState('');
  const [teachLevel, setTeachLevel] = useState('3');
  const [learnLevel, setLearnLevel] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/skills')
      .then((data) => setCatalogue(data.skills))
      .catch(() => {});
  }, []);

  async function add(type) {
    const name = (type === 'teach' ? teachName : learnName).trim();
    if (!name) return;
    setBusy(true);
    setError('');
    try {
      const level = Number(type === 'teach' ? teachLevel : learnLevel);
      const data = await api('/skills/mine', { method: 'POST', body: { name, type, level } });
      onChange(data.skills);
      if (type === 'teach') setTeachName('');
      else setLearnName('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    setError('');
    try {
      const data = await api(`/skills/mine/${item.id}`, { method: 'DELETE' });
      onChange(data.skills);
    } catch (e) {
      setError(e.message);
    }
  }

  async function changeLevel(item, level) {
    setError('');
    try {
      const data = await api(`/skills/mine/${item.id}`, { method: 'PATCH', body: { level } });
      onChange(data.skills);
    } catch (e) {
      setError(e.message);
    }
  }

  const totalSkills = (safeSkills.teach?.length || 0) + (safeSkills.learn?.length || 0);

  return (
    <div className="card pad">
      <div className="spread" style={{ marginBottom: 14 }}>
        <h2>My skills</h2>
        <div className="skill-legend small">
          <span>
            <span className="legend-dot teach" />
            you teach
          </span>
          <span>
            <span className="legend-dot learn" />
            you learn
          </span>
        </div>
      </div>

      <datalist id="skill-catalogue">
        {catalogue.map((s) => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>

      {error ? (
        <div style={{ marginBottom: 12 }}>
          <Notice kind="error" onClose={() => setError('')}>
            {error}
          </Notice>
        </div>
      ) : null}

      <div
        className="skill-columns"
        style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}
      >
        <section
          style={{
            flex: '1 1 320px',
            minWidth: 280,
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: 16,
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div className="skill-col-head">
            <h3>
              <span className="legend-dot teach" />I can teach
            </h3>
            <span className="count-chip">{safeSkills.teach?.length || 0}</span>
          </div>
          <div className="skill-list skill-list-rows">
            {(safeSkills.teach || []).map((item) => (
              <SkillRow
                key={item.id}
                item={item}
                tone="teach"
                showMedia
                onRemove={() => remove(item)}
                onChangeLevel={changeLevel}
                onMediaChange={onChange}
              />
            ))}
            {!safeSkills.teach?.length ? (
              <span className="muted small">Nothing yet — add a skill you could teach.</span>
            ) : null}
          </div>
          <AddSkillRow
            label="Skill you can teach"
            name={teachName}
            onName={setTeachName}
            level={teachLevel}
            onLevel={setTeachLevel}
            onAdd={() => add('teach')}
            busy={busy}
            placeholder="e.g. Python"
          />
          <p className="hint">These are the skills other students can match with you for. Add a photo or video to back it up.</p>
        </section>

        <section
          style={{
            flex: '1 1 320px',
            minWidth: 280,
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: 16,
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div className="skill-col-head">
            <h3>
              <span className="legend-dot learn" />I want to learn
            </h3>
            <span className="count-chip">{safeSkills.learn?.length || 0}</span>
          </div>
          <div className="skill-list skill-list-rows">
            {(safeSkills.learn || []).map((item) => (
              <SkillRow
                key={item.id}
                item={item}
                tone="learn"
                showMedia={false}
                onRemove={() => remove(item)}
                onChangeLevel={changeLevel}
                onMediaChange={onChange}
              />
            ))}
            {!safeSkills.learn?.length ? (
              <span className="muted small">Nothing yet — add something you want to learn.</span>
            ) : null}
          </div>
          <AddSkillRow
            label="Skill you want to learn"
            name={learnName}
            onName={setLearnName}
            level={learnLevel}
            onLevel={setLearnLevel}
            onAdd={() => add('learn')}
            busy={busy}
            placeholder="e.g. Guitar"
          />
          <p className="hint">Level is where you are today — 1 means total beginner. Photos and videos aren't needed here — save proof for skills you teach.</p>
        </section>
      </div>

      {totalSkills === 0 ? (
        <p className="hint">Tip: add at least one skill on each side so the matcher has something to work with.</p>
      ) : null}
    </div>
  );
}
