import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Notice, PlusIcon, SkillChip } from './ui.jsx';

export const LEVEL_OPTIONS = [
  ['1', 'Curious'],
  ['2', 'Beginner'],
  ['3', 'Intermediate'],
  ['4', 'Advanced'],
  ['5', 'Expert'],
];

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

export default function SkillEditor({ skills, onChange }) {
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

  const totalSkills = (skills.teach?.length || 0) + (skills.learn?.length || 0);

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

      <div className="skill-columns">
        <section>
          <div className="skill-col-head">
            <h3>
              <span className="legend-dot teach" />I can teach
            </h3>
            <span className="count-chip">{skills.teach?.length || 0}</span>
          </div>
          <div className="skill-list">
            {(skills.teach || []).map((item) => (
              <SkillChip key={item.id} skill={item} tone="teach" onRemove={() => remove(item)} />
            ))}
            {!skills.teach?.length ? <span className="muted small">Nothing yet — add a skill you could teach.</span> : null}
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
          <p className="hint">These are the skills other students can match with you for.</p>
        </section>

        <section>
          <div className="skill-col-head">
            <h3>
              <span className="legend-dot learn" />I want to learn
            </h3>
            <span className="count-chip">{skills.learn?.length || 0}</span>
          </div>
          <div className="skill-list">
            {(skills.learn || []).map((item) => (
              <SkillChip key={item.id} skill={item} tone="learn" onRemove={() => remove(item)} />
            ))}
            {!skills.learn?.length ? <span className="muted small">Nothing yet — add something you want to learn.</span> : null}
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
          <p className="hint">Level is where you are today — 1 means total beginner.</p>
        </section>
      </div>

      {totalSkills === 0 ? (
        <p className="hint">Tip: add at least one skill on each side so the matcher has something to work with.</p>
      ) : null}
    </div>
  );
}
