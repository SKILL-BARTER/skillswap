import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, emitSwapsChanged } from '../api.js';
import { Avatar, CheckIcon, Notice, StatusPill, SwapIcon } from './ui.jsx';

function TrustTags({ swap }) {
  if (swap.status !== 'completed') return null;
  return (
    <div className="swap-trust">
      <span className={`trust-tag ${swap.my_review ? 'done' : ''}`}>
        {swap.my_review ? <CheckIcon size={11} /> : null}
        {swap.my_review ? 'You reviewed' : 'Your review pending'}
      </span>
      <span className={`trust-tag ${swap.their_review ? 'done' : ''}`}>
        {swap.their_review ? <CheckIcon size={11} /> : null}
        {swap.their_review ? 'They reviewed you' : 'Waiting on their review'}
      </span>
    </div>
  );
}

export function ExchangeLine({ swap }) {
  return (
    <div className="exchange" style={{ padding: '9px 13px' }}>
      <span>
        You teach <b>{swap.i_teach || '—'}</b>
      </span>
      <span className="exchange-arrow">
        <SwapIcon size={14} />
      </span>
      <span>
        You learn <b>{swap.i_learn || '—'}</b>
      </span>
    </div>
  );
}

export default function SwapCard({ swap, onUpdate, onReview }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function act(action) {
    setBusy(true);
    setError('');
    try {
      const data = await api(`/swaps/${swap.id}/${action}`, { method: 'POST' });
      onUpdate(data.swap);
      emitSwapsChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const isRecipient = swap.i_am === 'recipient';

  return (
    <article className="card swap-card">
      <Avatar user={swap.counterpart} size={44} />
      <div className="swap-body">
        <div className="swap-head">
          <strong>
            <Link to={`/u/${swap.counterpart.id}`} className="link">
              {swap.counterpart.name}
            </Link>
          </strong>
          <StatusPill status={swap.status} />
          {swap.counterpart.university ? (
            <span className="muted small">{swap.counterpart.university}</span>
          ) : null}
        </div>

        <ExchangeLine swap={swap} />

        {swap.message ? <p className="swap-message">“{swap.message}”</p> : null}

        <TrustTags swap={swap} />

        {error ? (
          <Notice kind="error" onClose={() => setError('')}>
            {error}
          </Notice>
        ) : null}
      </div>

      <div className="swap-actions">
        {swap.status === 'pending' && isRecipient ? (
          <>
            <button className="btn btn-success btn-sm" onClick={() => act('accept')} disabled={busy}>
              Accept
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => act('decline')} disabled={busy}>
              Decline
            </button>
          </>
        ) : null}

        {swap.status === 'pending' && !isRecipient ? (
          <button className="btn btn-ghost btn-sm" onClick={() => act('cancel')} disabled={busy}>
            Withdraw
          </button>
        ) : null}

        {swap.status === 'accepted' ? (
          <>
            <button className="btn btn-primary btn-sm" onClick={() => act('complete')} disabled={busy}>
              Mark completed
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => act('cancel')} disabled={busy}>
              Cancel
            </button>
          </>
        ) : null}

        {swap.status === 'completed' && !swap.my_review ? (
          <button className="btn btn-primary btn-sm" onClick={() => onReview(swap)} disabled={busy}>
            Leave a review
          </button>
        ) : null}
      </div>
    </article>
  );
}
