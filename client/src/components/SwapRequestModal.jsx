import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Avatar, Modal, Notice, SwapIcon } from './ui.jsx';

export default function SwapRequestModal({ match, onClose, onSent }) {
  const { user: me } = useAuth();
  const { user: them, suggestion } = match;

  const myTeach = me?.skills?.teach || [];
  const theirTeach = them?.skills?.teach || [];

  const [teachId, setTeachId] = useState(
    String(suggestion?.teach?.skill_id ?? myTeach[0]?.skill_id ?? '')
  );
  const [learnId, setLearnId] = useState(
    String(suggestion?.learn?.skill_id ?? theirTeach[0]?.skill_id ?? '')
  );
  const [message, setMessage] = useState('');
  const [messageTouched, setMessageTouched] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const firstName = them.name.split(' ')[0];
  const teachName = myTeach.find((s) => String(s.skill_id) === teachId)?.name;
  const learnName = theirTeach.find((s) => String(s.skill_id) === learnId)?.name;

  // Auto-draft a friendly opener until the user edits the message themselves.
  useEffect(() => {
    if (messageTouched) return;
    const parts = [`Hi ${firstName}! We matched on SkillSwap.`];
    if (teachName) parts.push(`I can teach you ${teachName}`);
    if (learnName) parts.push(`and I'd love to learn ${learnName} from you.`);
    else if (teachName) parts.push('and I noticed you want to learn it.');
    parts.push('Want to swap?');
    setMessage(parts.join(' '));
  }, [firstName, teachName, learnName, messageTouched]);

  async function submit(e) {
    e.preventDefault();
    if (!teachId) {
      setError('Pick a skill you can teach first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api('/swaps', {
        method: 'POST',
        body: {
          to_user_id: them.id,
          teach_skill_id: Number(teachId),
          learn_skill_id: learnId ? Number(learnId) : null,
          message,
        },
      });
      onSent(data.swap);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Swap request to ${firstName}`}
      subtitle="Propose exactly what you will exchange — clear offers get accepted faster."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="submit"
            form="swap-request-form"
            className="btn btn-primary"
            disabled={busy || !teachId || !myTeach.length}
          >
            {busy ? 'Sending…' : 'Send request'}
          </button>
        </>
      }
    >
      <form id="swap-request-form" onSubmit={submit}>
        <div className="row" style={{ marginBottom: 16 }}>
          <Avatar user={them} size={40} />
          <div>
            <strong>{them.name}</strong>
            <div className="muted small">{them.university || 'SkillSwap member'}</div>
          </div>
        </div>

        {error ? (
          <div style={{ marginBottom: 14 }}>
            <Notice kind="error" onClose={() => setError('')}>
              {error}
            </Notice>
          </div>
        ) : null}

        {!myTeach.length ? (
          <Notice kind="info">
            Add a skill to your “I can teach” list before offering a swap.
          </Notice>
        ) : (
          <>
            <div className="field">
              <label htmlFor="swap-teach">I will teach</label>
              <select
                id="swap-teach"
                className="select"
                value={teachId}
                onChange={(e) => setTeachId(e.target.value)}
              >
                <option value="">Select a skill you can teach…</option>
                {myTeach.map((s) => (
                  <option key={s.skill_id} value={s.skill_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="swap-learn">I want to learn from them</label>
              <select
                id="swap-learn"
                className="select"
                value={learnId}
                onChange={(e) => setLearnId(e.target.value)}
              >
                <option value="">Nothing for now — pay it forward</option>
                {theirTeach.map((s) => (
                  <option key={s.skill_id} value={s.skill_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {teachName || learnName ? (
              <div className="exchange" style={{ marginBottom: 16 }}>
                <span>
                  You teach <b>{teachName || '—'}</b>
                </span>
                <span className="exchange-arrow">
                  <SwapIcon size={15} />
                </span>
                <span>
                  You learn <b>{learnName || '—'}</b>
                </span>
              </div>
            ) : null}

            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="swap-message">Message</label>
              <textarea
                id="swap-message"
                className="textarea"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setMessageTouched(true);
                }}
                maxLength={500}
              />
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
