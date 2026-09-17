import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { rankMatches } from '../matching.js';

const router = Router();

// Ranked, explainable matches for the signed-in student.
router.get('/', requireAuth, (req, res) => {
  const users = db
    .prepare('SELECT id, name, university, bio, avatar_color, credits FROM users')
    .all();
  const skillRows = db
    .prepare(
      `SELECT us.user_id, us.type, us.level, s.id AS skill_id, s.name, s.category
       FROM user_skills us JOIN skills s ON s.id = us.skill_id
       ORDER BY s.name`
    )
    .all();
  const ratings = db
    .prepare(
      `SELECT reviewee_id AS user_id, ROUND(AVG(rating), 1) AS avg, COUNT(*) AS count
       FROM reviews GROUP BY reviewee_id`
    )
    .all();
  const completed = db
    .prepare(
      `SELECT user_id, COUNT(*) AS n FROM (
         SELECT from_user_id AS user_id FROM swaps WHERE status = 'completed'
         UNION ALL
         SELECT to_user_id AS user_id FROM swaps WHERE status = 'completed'
       ) GROUP BY user_id`
    )
    .all();

  const ratingOf = new Map(ratings.map((r) => [r.user_id, { avg: r.avg, count: r.count }]));
  const completedOf = new Map(completed.map((r) => [r.user_id, r.n]));

  const profiles = new Map(
    users.map((u) => [
      u.id,
      {
        ...u,
        rating: ratingOf.get(u.id) || { avg: 0, count: 0 },
        completed_swaps: completedOf.get(u.id) || 0,
        skills: { teach: [], learn: [] },
      },
    ])
  );

  for (const s of skillRows) {
    const p = profiles.get(s.user_id);
    if (!p) continue;
    const entry = { skill_id: s.skill_id, name: s.name, category: s.category, level: s.level };
    p.skills[s.type].push(entry);
  }

  const me = profiles.get(req.user.id);
  if (!me) return res.status(404).json({ error: 'User not found' });
  const others = [...profiles.values()].filter((u) => u.id !== req.user.id);

  res.json({ matches: rankMatches(me, others) });
});

export default router;
