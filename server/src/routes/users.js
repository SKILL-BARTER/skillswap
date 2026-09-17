import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { getProfile, getReviewsFor, getSwapsFor } from '../helpers.js';

const router = Router();

const MAX_AVATAR_DATA_URL_LENGTH = 2_100_000; // ~1.5MB image, base64-inflated, plus data: prefix
const AVATAR_DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,/;

// Update my own profile.
router.patch('/me', requireAuth, (req, res) => {
  const {
    name,
    university,
    bio,
    avatar_color,
    avatar_data,
    degree,
    year_of_study,
    campus,
    interests,
    availability,
    linkedin_url,
    github_url,
    portfolio_url,
  } = req.body || {};

  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!current) return res.status(404).json({ error: 'User not found' });

  // avatar_data is only sent when the photo actually changed: a data URL to
  // save, or null to remove the existing photo. Anything else is left alone.
  let avatarUrl = current.avatar_url;
  if (avatar_data === null) {
    avatarUrl = null;
  } else if (typeof avatar_data === 'string') {
    if (!AVATAR_DATA_URL_RE.test(avatar_data)) {
      return res.status(400).json({ error: 'Avatar must be a PNG, JPEG, or WEBP image.' });
    }
    if (avatar_data.length > MAX_AVATAR_DATA_URL_LENGTH) {
      return res.status(400).json({ error: 'Avatar image is too large.' });
    }
    avatarUrl = avatar_data;
  }

  const interestsJson =
    interests !== undefined
      ? JSON.stringify(Array.isArray(interests) ? interests.map(String).slice(0, 25) : [])
      : current.interests;

  const str = (v, fallback, max) => {
    if (v === undefined) return fallback;
    const s = String(v).trim();
    return max ? s.slice(0, max) : s;
  };

  db.prepare(
    `UPDATE users SET
      name = ?, university = ?, bio = ?, avatar_color = ?, avatar_url = ?,
      degree = ?, year_of_study = ?, campus = ?, interests = ?, availability = ?,
      linkedin_url = ?, github_url = ?, portfolio_url = ?
    WHERE id = ?`
  ).run(
    name !== undefined ? String(name).trim() || current.name : current.name,
    str(university, current.university),
    bio !== undefined ? String(bio).slice(0, 500) : current.bio,
    avatar_color !== undefined ? String(avatar_color) : current.avatar_color,
    avatarUrl,
    str(degree, current.degree, 120),
    str(year_of_study, current.year_of_study, 40),
    str(campus, current.campus, 120),
    interestsJson,
    str(availability, current.availability, 200),
    str(linkedin_url, current.linkedin_url, 300),
    str(github_url, current.github_url, 300),
    str(portfolio_url, current.portfolio_url, 300),
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
 