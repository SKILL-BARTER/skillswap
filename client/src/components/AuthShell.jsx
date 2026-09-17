import { Link } from 'react-router-dom';
import { CheckIcon, Logo, SwapIcon } from './ui.jsx';

const PITCH = [
  {
    title: 'Skills are the currency',
    text: 'No money changes hands. You teach what you know, you learn what you want.',
    icon: <SwapIcon size={17} />,
  },
  {
    title: 'Smart two-way matching',
    text: 'We look for students where the exchange goes both ways — you teach React, they teach guitar.',
    icon: <CheckIcon size={15} />,
  },
  {
    title: 'Trust built in',
    text: 'Reviews and completed-swap history come from real exchanges, not profile claims.',
    icon: <CheckIcon size={15} />,
  },
];

export default function AuthShell({ children }) {
  return (
    <div className="auth-wrap">
      <section className="auth-pitch">
        <Link to="/" className="brand" style={{ fontSize: '1.25rem' }}>
          <Logo size={36} />
          SkillSwap
        </Link>
        <h1>
          Trade skills,
          <br />
          <span className="grad-text">not money.</span>
        </h1>
        <p className="muted" style={{ maxWidth: '46ch', fontSize: '1.02rem' }}>
          Every student knows something worth teaching and something they are dying to learn. SkillSwap
          finds the classmate on the other side of that trade.
        </p>
        <ul className="pitch-list">
          {PITCH.map((item) => (
            <li key={item.title}>
              <span className="pitch-ico">{item.icon}</span>
              <span>
                <strong>{item.title}</strong>
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="auth-form-side">
        <div className="auth-card">{children}</div>
      </section>
    </div>
  );
}
