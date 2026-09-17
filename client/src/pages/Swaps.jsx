import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import ReviewModal from '../components/ReviewModal.jsx';
import SwapCard from '../components/SwapCard.jsx';
import { EmptyState, Notice } from '../components/ui.jsx';

const TABS = [
  ['incoming', 'Incoming'],
  ['sent', 'Sent'],
  ['active', 'Active'],
  ['history', 'History'],
];

export default function Swaps() {
  const [swaps, setSwaps] = useState(null);
  const [tab, setTab] = useState('incoming');
  const [error, setError] = useState('');
  const [reviewSwap, setReviewSwap] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api('/swaps');
      setSwaps(data.swaps);
    } catch (e) {
      setError(e.message);
      setSwaps([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const list = swaps || [];
    return {
      incoming: list.filter((s) => s.status === 'pending' && s.i_am === 'recipient'),
      sent: list.filter((s) => s.status === 'pending' && s.i_am === 'sender'),
      active: list.filter((s) => s.status === 'accepted'),
      history: list.filter((s) => ['completed', 'declined', 'cancelled'].includes(s.status)),
    };
  }, [swaps]);

  const replaceSwap = (updated) =>
    setSwaps((prev) => (prev || []).map((s) => (s.id === updated.id ? updated : s)));

  const current = groups[tab] || [];

  return (
    <div className="stack">
      <header className="spread">
        <div>
          <h1>
            My <span className="grad-text">swaps</span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Every exchange, from the first request to the final review.
          </p>
        </div>
        <Link className="btn btn-ghost" to="/discover">
          Find new matches
        </Link>
      </header>

      {error ? (
        <Notice kind="error" onClose={() => setError('')}>
          {error}
        </Notice>
      ) : null}

      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={`tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
            {groups[key]?.length ? <span className="tab-count">{groups[key].length}</span> : null}
          </button>
        ))}
      </div>

      {swaps === null ? (
        <div className="card pad muted">Loading swaps…</div>
      ) : current.length === 0 ? (
        <div className="card">
          <EmptyState
            title={
              tab === 'incoming'
                ? 'No incoming requests right now'
                : tab === 'sent'
                  ? 'No requests sent yet'
                  : tab === 'active'
                    ? 'Nothing in progress'
                    : 'No history yet'
            }
            action={
              tab === 'incoming' || tab === 'sent' ? (
                <Link className="btn btn-primary btn-sm" to="/discover">
                  Find matches
                </Link>
              ) : null
            }
          >
            {tab === 'incoming'
              ? 'When someone wants to trade skills with you, it lands here.'
              : tab === 'sent'
                ? 'Offer a swap from the Discover page and track it here.'
                : tab === 'active'
                  ? 'Accepted swaps show up here until they are completed.'
                  : 'Completed, declined and cancelled swaps are kept here as your track record.'}
          </EmptyState>
        </div>
      ) : (
        <div className="stack">
          {current.map((swap) => (
            <SwapCard key={swap.id} swap={swap} onUpdate={replaceSwap} onReview={setReviewSwap} />
          ))}
        </div>
      )}

      {reviewSwap ? (
        <ReviewModal
          swap={reviewSwap}
          onClose={() => setReviewSwap(null)}
          onDone={(updated) => {
            setReviewSwap(null);
            replaceSwap(updated);
          }}
        />
      ) : null}
    </div>
  );
}
