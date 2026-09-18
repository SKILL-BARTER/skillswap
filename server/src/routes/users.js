import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { getProfile, getReviewsFor, getSwapsFor } from '../helpers.js';

const router = Router();

// Max selfie size: 8M chars of base64 (~6 MB decoded) before we even parse it,
// and 4 MB after decoding — plenty for a 480px JPEG, small enough to store.
const MAX_DATAURL_CHARS = 8_000_000;
const MAX_SELFIE_BYTES = 4 * 1024 * 1024;

function validateSelfie(dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.length > MAX_DATAURL_CHARS) {
    return 'That image is too large — retake the selfie and try again.';
  }
  const match = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return 'Selfie must be a base64-encoded JPEG, PNG or WebP image.';

  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length < 2048) return 'That image looks empty — retake the selfie and try again.';
  if (bytes.length > MAX_SELFIE_BYTES) return 'That image is too large — retake the selfie and try again.';

  // Magic-byte check so arbitrary text files renamed as images are rejected.
  const head = bytes.subarray(0, 12).toString('latin1');
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp = head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP';
  if (!isJpeg && !isPng && !isWebp) return 'That file is not a valid image — retake the selfie.';

  return null;
}

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

/*
 * Selfie verification: the student captures a live selfie in the browser and
 * submits the image. We validate it is a real (magic-byte-checked) image of a
 * sane size, store it, and switch on the verified badge everyone else sees.
 */
router.post('/me/verify-selfie', requireAuth, (req, res) => {
  const { selfie } = req.body || {};
  const problem = validateSelfie(selfie);
  if (problem) return res.status(400).json({ error: problem });

  db.prepare('UPDATE users SET verified = 1, selfie_data = ? WHERE id = ?').run(selfie, req.user.id);
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
