import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { findOrCreateSkill, getUserSkills } from '../helpers.js';

const router = Router();

// Public skill catalogue, used for autocomplete suggestions.
router.get('/', (req, res) => {
  const q = String(req.query.q || '').trim();
  const rows = q
    ? db.prepare('SELECT * FROM skills WHERE name LIKE ? ORDER BY name LIMIT 20').all(`%${q}%`)
    : db.prepare('SELECT * FROM skills ORDER BY name LIMIT 200').all();
  res.json({ skills: rows });
});

router.get('/mine', requireAuth, (req, res) => {
  res.json({ skills: getUserSkills(req.user.id) });
});

// Add (or update) one of my skills: type is 'teach' or 'learn'.
router.post('/mine', requireAuth, (req, res) => {
  const { name, type, level = 3, category = 'Other' } = req.body || {};
  if (!['teach', 'learn'].includes(type)) {
    return res.status(400).json({ error: "type must be 'teach' or 'learn'" });
  }
  const skill = findOrCreateSkill(name, category);
  if (!skill) return res.status(400).json({ error: 'Skill name is required' });
  const lvl = Math.max(1, Math.min(5, Number(level) || 3));

  db.prepare(
    `INSERT INTO user_skills (user_id, skill_id, type, level) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, skill_id, type) DO UPDATE SET level = excluded.level`
  ).run(req.user.id, skill.id, type, lvl);

  res.status(201).json({ skills: getUserSkills(req.user.id) });
});

router.patch('/mine/:id', requireAuth, (req, res) => {
  const lvl = Math.max(1, Math.min(5, Number(req.body?.level) || 3));
  const info = db
    .prepare('UPDATE user_skills SET level = ? WHERE id = ? AND user_id = ?')
    .run(lvl, Number(req.params.id), req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Skill not found' });
  res.json({ skills: getUserSkills(req.user.id) });
});

router.delete('/mine/:id', requireAuth, (req, res) => {
  const info = db
    .prepare('DELETE FROM user_skills WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Skill not found' });
  res.json({ skills: getUserSkills(req.user.id) });
});

export default router;
