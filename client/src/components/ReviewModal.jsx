import { useState } from 'react';
import { api, emitSwapsChanged } from '../api.js';
import { Avatar, Modal, Notice, StarPicker } from './ui.jsx';

export default function ReviewModal({ swap, onClose, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api(`/swaps/${swap.id}/review`, {
        method: 'POST',
        body: { rating, comment },
      });
      emitSwapsChanged();
      onDone(data.swap);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Review ${swap.counterpart.name.split(' ')[0]}`}
      subtitle="Reviews build the trust score other students see when matching."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="review-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit review'}
          </button>
        </>
      }
    >
      <form id="review-form" onSubmit={submit}>
        <div className="row" style={{ marginBottom: 16 }}>
          <Avatar user={swap.counterpart} size={40} />
          <div>
            <strong>{swap.counterpart.name}</strong>
            <div className="muted small">
              Swapped {swap.i_teach || 'a skill'} for {swap.i_learn || 'a skill'}
            </div>
          </div>
        </div>

        {error ? (
          <div style={{ marginBottom: 14 }}>
            <Notice kind="error" onClose={() => setError('')}>
              {error}
            </Notice>
          </div>
        ) : null}

        <div className="field">
          <label>Your rating</label>
          <StarPicker value={rating} onChange={setRating} />
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="review-comment">What was it like learning from them?</label>
          <textarea
            id="review-comment"
            className="textarea"
            placeholder="e.g. Explained recursion until it finally clicked. Would swap again."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />
        </div>
      </form>
    </Modal>
  );
}
