/*
 * Match scoring — explainable by design so we can show judges *why* two
 * students were matched.
 *
 *   +25 per skill they teach that I want to learn   (max 2 counted -> 50)
 *   +25 per skill I teach that they want to learn   (max 2 counted -> 50)
 *   +20 two-way bonus when both directions hit
 *   +5  same university
 *   +0..5 trust bonus from their average review score
 *   capped at 100
 */

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const MAX_HITS_PER_DIRECTION = 2;

export function matchScore(me, other) {
  const myTeach = new Set(me.skills.teach.map((s) => s.skill_id));
  const myLearn = new Set(me.skills.learn.map((s) => s.skill_id));

  // Skills they teach that are on my "want to learn" list.
  const wantHits = other.skills.teach.filter((s) => myLearn.has(s.skill_id));
  // Skills I teach that are on their "want to learn" list.
  const teachHits = other.skills.learn.filter((s) => myTeach.has(s.skill_id));

  const breakdown = [];
  const reasons = [];

  if (wantHits.length) {
    const points = Math.min(wantHits.length, MAX_HITS_PER_DIRECTION) * 25;
    const names = wantHits.map((s) => s.name).join(', ');
    breakdown.push({ label: `Teaches ${names} — on your learn list`, points });
    reasons.push(`Teaches ${names}, which you want to learn`);
  }
  if (teachHits.length) {
    const points = Math.min(teachHits.length, MAX_HITS_PER_DIRECTION) * 25;
    const names = teachHits.map((s) => s.name).join(', ');
    breakdown.push({ label: `Wants to learn ${names} — you can teach that`, points });
    reasons.push(`Wants to learn ${names}, which you can teach`);
  }
  if (wantHits.length && teachHits.length) {
    breakdown.push({ label: 'Two-way swap — you both have what the other wants', points: 20 });
    reasons.push('Two-way swap: you both have exactly what the other wants');
  }
  if (me.university && other.university && me.university === other.university) {
    breakdown.push({ label: `Same university (${other.university})`, points: 5 });
    reasons.push(`Same university: ${other.university}`);
  }
  if (other.rating && other.rating.count > 0) {
    const points = clamp(Math.round((Number(other.rating.avg) - 3.5) * 3), 0, 5);
    if (points > 0) {
      breakdown.push({ label: `Trusted — ${other.rating.avg}★ from ${other.rating.count} review(s)`, points });
    }
    reasons.push(`${other.rating.avg}★ from ${other.rating.count} review${other.rating.count === 1 ? '' : 's'}`);
  }

  const raw = breakdown.reduce((sum, b) => sum + b.points, 0);
  return {
    score: clamp(Math.round(raw), 0, 100),
    reasons,
    breakdown,
    wantHits,
    teachHits,
    hasOverlap: wantHits.length + teachHits.length > 0,
  };
}

export function rankMatches(me, others) {
  const results = [];
  for (const other of others) {
    if (other.id === me.id) continue;
    const m = matchScore(me, other);
    if (!m.hasOverlap) continue;
    results.push({
      user: {
        id: other.id,
        name: other.name,
        university: other.university,
        bio: other.bio,
        avatar_color: other.avatar_color,
        avatar_url: other.avatar_url,
        credits: other.credits,
        verified: !!other.verified,
        rating: other.rating,
        completed_swaps: other.completed_swaps,
        skills: other.skills,
      },
      score: m.score,
      reasons: m.reasons,
      breakdown: m.breakdown,
      suggestion:
        m.wantHits.length && m.teachHits.length
          ? { teach: m.teachHits[0], learn: m.wantHits[0] }
          : null,
    });
  }
  return results.sort((a, b) => b.score - a.score || a.user.name.localeCompare(b.user.name));
}