import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { getProfile, getReviewsFor, getSwapsFor } from '../helpers.js';

const router = Router();

// Update my own profile.
router.patch('/me', requireAuth, (req, res) => {
  const { name, university, bio, avatar_color } = req.body || {};
  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!current) return res.status(404).json({ error: 'User not found' });
  db.prepare('UPDATE users SET name = ?, university = ?, bio = ?, avatar_color = ? WHERE id = ?').run(
    name !== undefined ? String(name).trim() || current.name : current.name,
    university !== undefined ? String(university).trim() : current.university,
    bio !== undefined ? String(bio).slice(0, 500) : current.bio,
    avatar_color !== undefined ? String(avatar_color) : current.avatar_color,
    req.user.id
  );
  res.json({ user: getProfile(req.user.id, { includeEmail: true }) });
});

// Public profile: skills, reviews received, and (if it's me) my swaps.
router.get('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const profile = getProfile(id);
  if (!profile) return res.status(404).json({ error: 'Student not found' });
  const payload = {
    user: profile,
    reviews: getReviewsFor(id),
  };
  if (id === req.user.id) {
    payload.swaps = getSwapsFor(req.user.id);
  }
  res.json(payload);
});

export default router;
