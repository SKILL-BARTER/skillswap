import { Router } from 'express';
import { db } from '../db.js';
import { verifyPassword, createSession, destroySession, requireAuth } from '../auth.js';
import { getProfile } from '../helpers.js';

const router = Router();

const DEMO_EMAIL_SUFFIX = '@demo.edu';

router.post('/register', (req, res) => {
  res.status(403).json({ error: 'Please create your account with Google sign-in' });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const cleanEmail = String(email).trim().toLowerCase();

  if (!cleanEmail.endsWith(DEMO_EMAIL_SUFFIX)) {
    return res.status(403).json({ error: 'Please sign in with Google' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(cleanEmail);
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
