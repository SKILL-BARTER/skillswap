import { Router } from 'express';
import { db } from '../db.js';
import { hashPassword, verifyPassword, createSession, destroySession, requireAuth } from '../auth.js';
import { getProfile } from '../helpers.js';

const router = Router();

const AVATAR_COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#fb7185'];

router.post('/register', (req, res) => {
  const { name, email, password, university = '' } = req.body || {};
  if (!String(name || '').trim() || !String(email || '').trim() || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const exists = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(cleanEmail);
  if (exists) return res.status(409).json({ error: 'An account with that email already exists' });

  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, university, avatar_color) VALUES (?, ?, ?, ?, ?)')
    .run(String(name).trim(), cleanEmail, hashPassword(password), String(university).trim(), color);
  const userId = Number(info.lastInsertRowid);
  const token = createSession(userId);
  res.status(201).json({ token, user: getProfile(userId, { includeEmail: true }) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = db
    .prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE')
    .get(String(email).trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  const token = createSession(user.id);
  res.json({ token, user: getProfile(user.id, { includeEmail: true }) });
});

router.post('/logout', requireAuth, (req, res) => {
  destroySession(req.token);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: getProfile(req.user.id, { includeEmail: true }) });
});

export default router;
