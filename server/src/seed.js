import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initSchema, resetDb } from './db.js';
import { hashPassword } from './auth.js';

/*
 * Demo seed — 5 students from 3 universities whose skills deliberately
 * cross-match, plus one completed swap with reviews, one in-progress swap and
 * one pending request waiting for Maya (the account we demo with).
 * Sign in with maya@demo.edu / demo1234 (or any of the others).
 */

export const DEMO_PASSWORD = 'demo1234';

const ago = (days) =>
  new Date(Date.now() - days * 86400000).toISOString().slice(0, 19).replace('T', ' ');

const CATALOGUE = [
  ['Python', 'Tech'],
  ['JavaScript', 'Tech'],
  ['React', 'Tech'],
  ['Data Science', 'Tech'],
  ['SQL', 'Tech'],
  ['Guitar', 'Music'],
  ['Piano', 'Music'],
  ['Songwriting', 'Music'],
  ['Spanish', 'Language'],
  ['French', 'Language'],
  ['Japanese', 'Language'],
  ['Public Speaking', 'Business'],
  ['Marketing', 'Business'],
  ['Excel', 'Business'],
  ['Photography', 'Art'],
  ['Video Editing', 'Art'],
  ['Graphic Design', 'Art'],
  ['Calculus', 'Academic'],
  ['Statistics', 'Academic'],
  ['Essay Writing', 'Academic'],
  ['Cooking', 'Life'],
  ['Yoga', 'Fitness'],
  ['Chess', 'Other'],
];

function insertUser({ name, email, university, bio, color, credits, agoDays }) {
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, university, bio, avatar_color, credits, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(name, email, hashPassword(DEMO_PASSWORD), university, bio, color, credits, ago(agoDays));
  return Number(info.lastInsertRowid);
}

const skillId = (name) => db.prepare('SELECT id FROM skills WHERE name = ?').get(name).id;

function addSkills(userId, teach, learn) {
  const stmt = db.prepare('INSERT INTO user_skills (user_id, skill_id, type, level) VALUES (?, ?, ?, ?)');
  for (const [name, level = 3] of teach) stmt.run(userId, skillId(name), 'teach', level);
  for (const [name, level = 3] of learn) stmt.run(userId, skillId(name), 'learn', level);
}

function addSwap({ from, to, teach, learn, status, message, agoDays }) {
  const info = db
    .prepare(
      `INSERT INTO swaps (from_user_id, to_user_id, teach_skill_id, learn_skill_id, message, status,
                          created_at, updated_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      from,
      to,
      skillId(teach),
      learn ? skillId(learn) : null,
      message,
      status,
      ago(agoDays),
      ago(Math.max(0, agoDays - 1)),
      status === 'completed' ? ago(Math.max(0, agoDays - 1)) : null
    );
  return Number(info.lastInsertRowid);
}

function addReview({ swapId, reviewer, reviewee, rating, comment, agoDays }) {
  db.prepare(
    `INSERT INTO reviews (swap_id, reviewer_id, reviewee_id, rating, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(swapId, reviewer, reviewee, rating, comment, ago(agoDays));
}

export function seedDemoData() {
  for (const [name, category] of CATALOGUE) {
    db.prepare('INSERT OR IGNORE INTO skills (name, category) VALUES (?, ?)').run(name, category);
  }

  const maya = insertUser({
    name: 'Maya Chen',
    email: 'maya@demo.edu',
    university: 'UC Berkeley',
    bio: 'CS junior. I can make a React app sing, but I have never played a chord. Trade you code for music.',
    color: '#22d3ee',
    credits: 10,
    agoDays: 40,
  });
  const alice = insertUser({
    name: 'Alice Novak',
    email: 'alice@demo.edu',
    university: 'UC Berkeley',
    bio: 'Music major, weekend guitar teacher. Currently fighting my way through CS 61A.',
    color: '#a78bfa',
    credits: 30,
    agoDays: 60,
  });
  const diego = insertUser({
    name: 'Diego Ruiz',
    email: 'diego@demo.edu',
    university: 'NYU',
    bio: 'Songwriter with three chords and a dream. Learning to code so I can build my own tools.',
    color: '#f472b6',
    credits: 20,
    agoDays: 45,
  });
  const priya = insertUser({
    name: 'Priya Sharma',
    email: 'priya@demo.edu',
    university: 'Stanford',
    bio: 'Stats TA. I explain things until they click. Want to ship my own web app someday.',
    color: '#34d399',
    credits: 20,
    agoDays: 38,
  });
  const tom = insertUser({
    name: 'Tom Becker',
    email: 'tom@demo.edu',
    university: 'Stanford',
    bio: 'Photographer and golden-hour enthusiast. Would genuinely love to learn guitar.',
    color: '#fbbf24',
    credits: 10,
    agoDays: 25,
  });

  addSkills(maya, [['Python', 4], ['React', 4]], [['Guitar', 1], ['Spanish', 2]]);
  addSkills(alice, [['Guitar', 5], ['Spanish', 4]], [['Python', 5], ['React', 4]]);
  addSkills(diego, [['Guitar', 4], ['Songwriting', 3]], [['Python', 4]]);
  addSkills(priya, [['Spanish', 5], ['Public Speaking', 4], ['Data Science', 4]], [['React', 4], ['Python', 3]]);
  addSkills(tom, [['Photography', 4], ['Video Editing', 3]], [['Guitar', 3]]);

  // Completed swap #1: Maya taught Python, Tom taught Photography. Both reviewed.
  const swapMayaTom = addSwap({
    from: tom,
    to: maya,
    teach: 'Photography',
    learn: 'Python',
    status: 'completed',
    message: 'Photo walk for Python tutoring? I saw you taught CS 61A.',
    agoDays: 14,
  });
  addReview({
    swapId: swapMayaTom,
    reviewer: maya,
    reviewee: tom,
    rating: 5,
    comment: 'The golden-hour photo walk was unforgettable. Feedback on every single shot.',
    agoDays: 13,
  });
  addReview({
    swapId: swapMayaTom,
    reviewer: tom,
    reviewee: maya,
    rating: 5,
    comment: 'Made recursion click in one session. Explained it like I was five, in a good way.',
    agoDays: 13,
  });

  // Completed swap #2: Priya taught Spanish, Diego taught Guitar.
  const swapPriyaDiego = addSwap({
    from: priya,
    to: diego,
    teach: 'Spanish',
    learn: 'Guitar',
    status: 'completed',
    message: 'Espanol por guitarra? I have a strict lesson plan, be warned.',
    agoDays: 21,
  });
  addReview({
    swapId: swapPriyaDiego,
    reviewer: diego,
    reviewee: priya,
    rating: 4,
    comment: 'Structured lessons with actual homework. Tough but I can hold a conversation now.',
    agoDays: 20,
  });
  addReview({
    swapId: swapPriyaDiego,
    reviewer: priya,
    reviewee: diego,
    rating: 5,
    comment: 'Four chords in thirty minutes. My fingertips hurt, worth it.',
    agoDays: 20,
  });

  // In-progress swap: Maya teaches React, Priya teaches Spanish.
  addSwap({
    from: maya,
    to: priya,
    teach: 'React',
    learn: 'Spanish',
    status: 'accepted',
    message: 'Trade React for Spanish? I have a trip to Barcelona in June.',
    agoDays: 2,
  });

  // Pending request waiting for Maya when the demo starts.
  addSwap({
    from: alice,
    to: maya,
    teach: 'Guitar',
    learn: 'React',
    status: 'pending',
    message: 'Saw your profile — I will trade you guitar for React. Deal?',
    agoDays: 1,
  });

  // Declined request, so the History tab shows a rejection too.
  addSwap({
    from: tom,
    to: diego,
    teach: 'Photography',
    learn: 'Guitar',
    status: 'declined',
    message: 'Photo lessons for guitar lessons?',
    agoDays: 5,
  });

  return { users: 5 };
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  resetDb();
  const result = seedDemoData();
  console.log(`Seeded ${result.users} demo students (password: ${DEMO_PASSWORD}).`);
  console.log('Sign in as maya@demo.edu to see pending requests, matches and history.');
} else {
  initSchema();
}
