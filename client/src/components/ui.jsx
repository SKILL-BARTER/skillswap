import { useEffect, useId } from 'react';

/* ---------- Inline icons (stroke style) ---------- */
const strokeProps = (size, strokeWidth = 2) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export const SwapIcon = ({ size = 20 }) => (
  <svg {...strokeProps(size, 2.2)}>
    <path d="M4 8h13l-3.2-3.2" />
    <path d="M20 16H7l3.2 3.2" />
  </svg>
);

export const CheckIcon = ({ size = 15 }) => (
  <svg {...strokeProps(size, 2.4)}>
    <path d="M5 12.5l4.2 4.2L19 7" />
  </svg>
);

export const CoinIcon = ({ size = 15 }) => (
  <svg {...strokeProps(size, 1.8)}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M14.8 9.4c-.4-.9-1.5-1.4-2.9-1.4-1.6 0-2.8.7-2.8 1.8s1.1 1.5 2.9 1.9 2.9.9 2.9 2-1.3 1.9-3 1.9c-1.5 0-2.7-.6-3-1.5" />
  </svg>
);

export const StarIcon = ({ size = 15, filled = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinejoin="round"
  >
    <path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.4 6.3 20.3l1.1-6.3L2.8 9.5l6.4-.9z" />
  </svg>
);

export const PlusIcon = ({ size = 16 }) => (
  <svg {...strokeProps(size, 2.2)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const CameraIcon = ({ size = 18 }) => (
  <svg {...strokeProps(size, 1.9)}>
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2a2 2 0 0 0 1.7-1l.5-.8A1.5 1.5 0 0 1 10.2 3h3.6a1.5 1.5 0 0 1 1.3.8l.5.8a2 2 0 0 0 1.7 1h1.2A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
    <circle cx="12" cy="12.3" r="3.6" />
  </svg>
);

/* ---------- Verified student badge ---------- */
export function VerifiedBadge({ size = 16, className = '', title = 'Verified student — confirmed with a live selfie' }) {
  return (
    <span className={`verified-badge ${className}`} title={title} role="img" aria-label={title}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#1d9bf0"
          d="M12 1.6l2.5 2.1 3.3-.3.9 3.2 2.9 1.6-1.3 3 1.3 3-2.9 1.6-.9 3.2-3.3-.3L12 22.4l-2.5-2.1-3.3.3-.9-3.2-2.9-1.6 1.3-3-1.3-3 2.9-1.6.9-3.2 3.3.3z"
        />
        <path
          d="M8 12.4l2.9 2.9 5.5-5.7"
          fill="none"
          stroke="#fff"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/* ---------- Brand ---------- */
export function Logo({ size = 30 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--grad)',
        color: '#071018',
        flex: 'none',
      }}
    >
      <SwapIcon size={size * 0.62} />
    </span>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ user, size = 40, className = '' }) {
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className={`avatar avatar-photo ${className}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  const initials = (user?.name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36, '--c': user?.avatar_color || '#6366f1' }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

/* ---------- Skill chip ---------- */
function LevelPips({ level = 0 }) {
  return (
    <span className="level-pips" title={`Level ${level}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`pip ${i <= level ? 'on' : ''}`} />
      ))}
    </span>
  );
}

export function SkillChip({ skill, tone = 'teach', onRemove, showLevel = true }) {
  return (
    <span className={`skill-chip ${tone}`}>
      {skill.name}
      {showLevel && skill.level ? <LevelPips level={skill.level} /> : null}
      {onRemove ? (
        <button className="chip-x" onClick={onRemove} aria-label={`Remove ${skill.name}`} title="Remove">
          ×
        </button>
      ) : null}
    </span>
  );
}

/* ---------- Match ring ---------- */
const RING_TIERS = [
  { min: 85, colors: ['#22d3ee', '#34d399'] },
  { min: 65, colors: ['#a78bfa', '#22d3ee'] },
  { min: 0, colors: ['#f472b6', '#a78bfa'] },
];

export function MatchRing({ score = 0, size = 78, strokeWidth = 7 }) {
  const rawId = useId();
  const gradId = `ring-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.max(0.02, score / 100) * circumference;
  const [from, to] = RING_TIERS.find((t) => score >= t.min).colors;

  return (
    <div className="ring" style={{ width: size, height: size }} title={`Match score: ${score}%`}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-label">
        <strong>{score}</strong>
        <span>%</span>
      </div>
    </div>
  );
}

/* ---------- Stars ---------- */
export function Stars({ value = 0, size = 15, className = '' }) {
  return (
    <span className={`stars ${className}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={size} filled={i <= Math.round(value)} />
      ))}
    </span>
  );
}

export function StarPicker({ value, onChange }) {
  return (
    <div className="star-picker" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className={i <= value ? 'on' : ''}
          onClick={() => onChange(i)}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
        >
          <StarIcon size={30} filled={i <= value} />
        </button>
      ))}
    </div>
  );
}

/* ---------- Status pill ---------- */
const STATUS_MAP = {
  pending: { label: 'Pending', cls: 'warn' },
  accepted: { label: 'In progress', cls: 'info' },
  completed: { label: 'Completed', cls: 'ok' },
  declined: { label: 'Declined', cls: 'bad' },
  cancelled: { label: 'Cancelled', cls: 'bad' },
};

export function StatusPill({ status }) {
  const s = STATUS_MAP[status] || { label: status, cls: '' };
  return <span className={`pill ${s.cls}`}>{s.label}</span>;
}

/* ---------- Notice ---------- */
export function Notice({ kind = 'info', children, onClose }) {
  return (
    <div className={`notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span style={{ flex: 1 }}>{children}</span>
      {onClose ? (
        <button className="chip-x" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal card" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="empty">
      <span className="empty-ico">{icon || <SwapIcon size={24} />}</span>
      <h3>{title}</h3>
      {children ? <p style={{ maxWidth: '44ch' }}>{children}</p> : null}
      {action}
    </div>
  );
}
