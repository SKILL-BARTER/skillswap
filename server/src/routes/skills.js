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

// --- Proof media (photos/video links) attached to one of my skills ---

const MAX_MEDIA_PER_SKILL = 4;
const MAX_IMAGE_DATA_URL_LENGTH = 1_400_000; // ~1MB image, base64-inflated
const IMAGE_DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,/;
const VIDEO_URL_RE = /^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|loom\.com)\//i;

function ownUserSkill(userSkillId, userId) {
  return db.prepare('SELECT id FROM user_skills WHERE id = ? AND user_id = ?').get(userSkillId, userId);
}

router.post('/mine/:id/media', requireAuth, (req, res) => {
  const userSkillId = Number(req.params.id);
  if (!ownUserSkill(userSkillId, req.user.id)) return res.status(404).json({ error: 'Skill not found' });

  const count = db.prepare('SELECT COUNT(*) AS n FROM skill_media WHERE user_skill_id = ?').get(userSkillId).n;
  if (count >= MAX_MEDIA_PER_SKILL) {
    return res.status(400).json({ error: `You can add up to ${MAX_MEDIA_PER_SKILL} photos/videos per skill.` });
  }

  const { type, url, caption = '' } = req.body || {};
  let cleanUrl;
  if (type === 'image') {
    if (typeof url !== 'string' || !IMAGE_DATA_URL_RE.test(url)) {
      return res.status(400).json({ error: 'Image must be a PNG, JPEG, or WEBP upload.' });
    }
    if (url.length > MAX_IMAGE_DATA_URL_LENGTH) {
      return res.status(400).json({ error: 'Image is too large (max ~1MB).' });
    }
    cleanUrl = url;
  } else if (type === 'video') {
    const trimmed = typeof url === 'string' ? url.trim() : '';
    if (!VIDEO_URL_RE.test(trimmed)) {
      return res.status(400).json({ error: 'Video must be a YouTube, Vimeo, or Loom link.' });
    }
    cleanUrl = trimmed;
  } else {
    return res.status(400).json({ error: "type must be 'image' or 'video'" });
  }

  db.prepare('INSERT INTO skill_media (user_skill_id, type, url, caption) VALUES (?, ?, ?, ?)').run(
    userSkillId,
    type,
    cleanUrl,
    String(caption).trim().slice(0, 140)
  );

  res.status(201).json({ skills: getUserSkills(req.user.id) });
});

router.delete('/mine/:id/media/:mediaId', requireAuth, (req, res) => {
  const userSkillId = Number(req.params.id);
  if (!ownUserSkill(userSkillId, req.user.id)) return res.status(404).json({ error: 'Skill not found' });

  const info = db
    .prepare('DELETE FROM skill_media WHERE id = ? AND user_skill_id = ?')
    .run(Number(req.params.mediaId), userSkillId);
  if (info.changes === 0) return res.status(404).json({ error: 'Media not found' });

  res.json({ skills: getUserSkills(req.user.id) });
});

export default router;
 