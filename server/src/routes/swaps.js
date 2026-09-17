import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { getSwapRow, getSwapsFor, isTeaching, touchSwap } from '../helpers.js';

const router = Router();
router.use(requireAuth);

const CREDITS_PER_COMPLETED_SWAP = 10;

router.get('/', (req, res) => {
  res.json({ swaps: getSwapsFor(req.user.id) });
});

// Send a swap request: "I'll teach you <teach_skill_id>, you teach me <learn_skill_id>".
router.post('/', (req, res) => {
  const { to_user_id, teach_skill_id, learn_skill_id = null, message = '' } = req.body || {};
  const toId = Number(to_user_id);
  const teachId = Number(teach_skill_id);
  const learnId = learn_skill_id ? Number(learn_skill_id) : null;

  if (!toId || toId === req.user.id) {
    return res.status(400).json({ error: "You can't send a swap request to yourself" });
  }
  const to = db.prepare('SELECT id, name FROM users WHERE id = ?').get(toId);
  if (!to) return res.status(404).json({ error: 'Student not found' });
  if (!teachId || !isTeaching(req.user.id, teachId)) {
    return res.status(400).json({ error: 'You can only offer a skill from your "I can teach" list' });
  }
  if (learnId && !isTeaching(toId, learnId)) {
    return res.status(400).json({ error: `They don't teach that skill, so it can't be part of the swap` });
  }

  const existing = db
    .prepare(
      `SELECT id FROM swaps
       WHERE status IN ('pending', 'accepted')
         AND ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))`
    )
    .get(req.user.id, toId, toId, req.user.id);
  if (existing) {
    return res.status(409).json({ error: `You already have an active swap with ${to.name}` });
  }

  const info = db
    .prepare(
      `INSERT INTO swaps (from_user_id, to_user_id, teach_skill_id, learn_skill_id, message)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(req.user.id, toId, teachId, learnId, String(message).slice(0, 500));

  const swap = getSwapsFor(req.user.id).find((s) => s.id === Number(info.lastInsertRowid));
  res.status(201).json({ swap });
});

function loadSwapForAction(req, res, allowedStatuses) {
  const swap = getSwapRow(Number(req.params.id));
  if (!swap) {
    res.status(404).json({ error: 'Swap not found' });
    return null;
  }
  const isParticipant = swap.from_user_id === req.user.id || swap.to_user_id === req.user.id;
  if (!isParticipant) {
    res.status(403).json({ error: 'This swap is not yours' });
    return null;
  }
  if (!allowedStatuses.includes(swap.status)) {
    res.status(409).json({ error: `Swap is ${swap.status}, can't do that` });
    return null;
  }
  return swap;
}

function respondWithSwap(res, swapId, userId) {
  const swap = getSwapsFor(userId).find((s) => s.id === swapId);
  res.json({ swap });
}

router.post('/:id/accept', (req, res) => {
  const swap = loadSwapForAction(req, res, ['pending']);
  if (!swap) return;
  if (swap.to_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the recipient can accept this swap' });
  }
  db.prepare("UPDATE swaps SET status = 'accepted', updated_at = datetime('now') WHERE id = ?").run(swap.id);
  respondWithSwap(res, swap.id, req.user.id);
});

router.post('/:id/decline', (req, res) => {
  const swap = loadSwapForAction(req, res, ['pending']);
  if (!swap) return;
  if (swap.to_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the recipient can decline this swap' });
  }
  db.prepare("UPDATE swaps SET status = 'declined', updated_at = datetime('now') WHERE id = ?").run(swap.id);
  respondWithSwap(res, swap.id, req.user.id);
});

router.post('/:id/cancel', (req, res) => {
  const swap = loadSwapForAction(req, res, ['pending', 'accepted']);
  if (!swap) return;
  db.prepare("UPDATE swaps SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(swap.id);
  respondWithSwap(res, swap.id, req.user.id);
});

// Either participant can mark an accepted swap as completed.
// Both sides earn skill credits.
router.post('/:id/complete', (req, res) => {
  const swap = loadSwapForAction(req, res, ['accepted']);
  if (!swap) return;
  db.prepare(
    "UPDATE swaps SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(swap.id);
  const bump = db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?');
  bump.run(CREDITS_PER_COMPLETED_SWAP, swap.from_user_id);
  bump.run(CREDITS_PER_COMPLETED_SWAP, swap.to_user_id);
  respondWithSwap(res, swap.id, req.user.id);
});

// After completion both sides review each other once.
router.post('/:id/review', (req, res) => {
  const swap = loadSwapForAction(req, res, ['completed']);
  if (!swap) return;
  const { rating, comment = '' } = req.body || {};
  const value = Number(rating);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5' });
  }
  const revieweeId = swap.from_user_id === req.user.id ? swap.to_user_id : swap.from_user_id;
  const already = db
    .prepare('SELECT id FROM reviews WHERE swap_id = ? AND reviewer_id = ?')
    .get(swap.id, req.user.id);
  if (already) return res.status(409).json({ error: 'You already reviewed this swap' });

  db.prepare(
    'INSERT INTO reviews (swap_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?)'
  ).run(swap.id, req.user.id, revieweeId, value, String(comment).slice(0, 500));
  touchSwap(swap.id);
  respondWithSwap(res, swap.id, req.user.id);
});

export default router;
