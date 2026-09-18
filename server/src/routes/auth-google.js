import express from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { hashPassword, createSession } from '../auth.js';
import admin from '../firebaseAdmin.js';
import { isUniversityEmail, UNIVERSITY_EMAIL_REJECTION } from '../university.js';

const router = express.Router();

const AVATAR_COLORS = ['#6366f1', '#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24'];

function publicUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

router.post('/google', async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: 'Invalid Google token' });
  }

  const email = decoded.email;
  if (!email) return res.status(400).json({ error: 'Google account has no email' });
  if (decoded.email_verified === false) {
    return res.status(401).json({ error: 'Google email is not verified' });
  }
  if (!isUniversityEmail(email.toLowerCase())) {
    return res.status(403).json({ error: UNIVERSITY_EMAIL_REJECTION });
  }

  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    const name = decoded.name || email.split('@')[0];
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    // Google-only accounts don't need a usable password. We still store a
    // hash (the column is NOT NULL) but it's random and never checked
    // against, so password login stays impossible for this account.
    const unusedPasswordHash = hashPassword(crypto.randomBytes(32).toString('hex'));
    const info = db
      .prepare('INSERT INTO users (name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?)')
      .run(name, email, unusedPasswordHash, avatarColor);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  }

  const token = createSession(user.id);
  res.json({ token, user: publicUser(user) });
});

export default router;