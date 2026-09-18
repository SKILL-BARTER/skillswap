import { db } from './db.js';

const mapSkill = (r) => ({
  id: r.id,
  skill_id: r.skill_id,
  name: r.name,
  category: r.category,
  level: r.level,
});

export function getUserSkills(userId) {
  const rows = db
    .prepare(
      `SELECT us.id, us.type, us.level, s.id AS skill_id, s.name, s.category
       FROM user_skills us JOIN skills s ON s.id = us.skill_id
       WHERE us.user_id = ?
       ORDER BY s.name`
    )
    .all(userId);
  return {
    teach: rows.filter((r) => r.type === 'teach').map(mapSkill),
    learn: rows.filter((r) => r.type === 'learn').map(mapSkill),
  };
}

export function getRating(userId) {
  const row = db
    .prepare('SELECT ROUND(AVG(rating), 1) AS avg, COUNT(*) AS count FROM reviews WHERE reviewee_id = ?')
    .get(userId);
  return { avg: row?.avg ?? 0, count: row?.count ?? 0 };
}

export function getCompletedCount(userId) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM swaps
       WHERE status = 'completed' AND (from_user_id = ? OR to_user_id = ?)`
    )
    .get(userId, userId);
  return row?.n ?? 0;
}

export function getProfile(userId, { includeEmail = false } = {}) {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!u) return null;
  let interests = [];
  try {
    const parsed = JSON.parse(u.interests || '[]');
    if (Array.isArray(parsed)) interests = parsed;
  } catch {
    // Malformed/legacy value, just show no interests rather than erroring.
  }
  return {
    id: u.id,
    name: u.name,
    ...(includeEmail ? { email: u.email } : {}),
    university: u.university,
    bio: u.bio,
    avatar_color: u.avatar_color,
    avatar_url: u.avatar_url,
    degree: u.degree,
    year_of_study: u.year_of_study,
    campus: u.campus,
    interests,
    availability: u.availability,
    linkedin_url: u.linkedin_url,
    github_url: u.github_url,
    portfolio_url: u.portfolio_url,
    credits: u.credits,
    verified: !!u.verified,
    created_at: u.created_at,
    rating: getRating(u.id),
    completed_swaps: getCompletedCount(u.id),
    skills: getUserSkills(u.id),
  };
}

export function getReviewsFor(userId, limit = 20) {
  return db
    .prepare(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.id AS reviewer_id, u.name AS reviewer_name, u.avatar_color AS reviewer_color,
              ts.name AS swap_teach, ls.name AS swap_learn
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       JOIN swaps sw ON sw.id = r.swap_id
       LEFT JOIN skills ts ON ts.id = sw.teach_skill_id
       LEFT JOIN skills ls ON ls.id = sw.learn_skill_id
       WHERE r.reviewee_id = ?
       ORDER BY r.created_at DESC
       LIMIT ?`
    )
    .all(userId, limit);
}

export function findOrCreateSkill(name, category = 'Other') {
  const clean = String(name || '').trim().slice(0, 60);
  if (!clean) return null;
  let row = db.prepare('SELECT * FROM skills WHERE name = ? COLLATE NOCASE').get(clean);
  if (!row) {
    const info = db.prepare('INSERT INTO skills (name, category) VALUES (?, ?)').run(clean, category);
    row = { id: Number(info.lastInsertRowid), name: clean, category };
  }
  return row;
}

export function isTeaching(userId, skillId) {
  return !!db
    .prepare("SELECT 1 FROM user_skills WHERE user_id = ? AND skill_id = ? AND type = 'teach'")
    .get(userId, skillId);
}

export function touchSwap(id) {
  db.prepare("UPDATE swaps SET updated_at = datetime('now') WHERE id = ?").run(id);
}

const SWAP_SELECT = `
  SELECT sw.*,
         f.name AS from_name, f.avatar_color AS from_color, f.university AS from_university, f.verified AS from_verified,
         t.name AS to_name,   t.avatar_color AS to_color,   t.university AS to_university,   t.verified AS to_verified,
         ts.name AS teach_skill, ls.name AS learn_skill
  FROM swaps sw
  JOIN users f ON f.id = sw.from_user_id
  JOIN users t ON t.id = sw.to_user_id
  LEFT JOIN skills ts ON ts.id = sw.teach_skill_id
  LEFT JOIN skills ls ON ls.id = sw.learn_skill_id
`;

export function getSwapRow(id) {
  return db.prepare(`${SWAP_SELECT} WHERE sw.id = ?`).get(id);
}

function decorateSwap(row, viewerId, reviewedSwapIds) {
  const iAmSender = row.from_user_id === viewerId;
  return {
    ...row,
    i_am: iAmSender ? 'sender' : 'recipient',
    // What the viewer teaches / learns in this swap, from the viewer's perspective.
    i_teach: iAmSender ? row.teach_skill : row.learn_skill,
    i_learn: iAmSender ? row.learn_skill : row.teach_skill,
    counterpart: iAmSender
      ? { id: row.to_user_id, name: row.to_name, avatar_color: row.to_color, university: row.to_university, verified: !!row.to_verified }
      : { id: row.from_user_id, name: row.from_name, avatar_color: row.from_color, university: row.from_university, verified: !!row.from_verified },
    my_review: reviewedSwapIds.some((r) => r.swap_id === row.id && r.reviewer_id === viewerId),
    their_review: reviewedSwapIds.some((r) => r.swap_id === row.id && r.reviewer_id !== viewerId),
  };
}

export function getSwapsFor(userId) {
  const rows = db
    .prepare(`${SWAP_SELECT} WHERE sw.from_user_id = ? OR sw.to_user_id = ? ORDER BY sw.updated_at DESC`)
    .all(userId, userId);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const reviewed = db
    .prepare(`SELECT swap_id, reviewer_id FROM reviews WHERE swap_id IN (${placeholders})`)
    .all(...ids);
  return rows.map((r) => decorateSwap(r, userId, reviewed));
}