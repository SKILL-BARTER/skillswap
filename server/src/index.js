import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
 
import { db, initSchema } from './db.js';
import { seedDemoData } from './seed.js';
import authRoutes from './routes/auth.js';
import authGoogleRoutes from './routes/auth-google.js';
import skillsRoutes from './routes/skills.js';
import matchesRoutes from './routes/matches.js';
import swapsRoutes from './routes/swaps.js';
import usersRoutes from './routes/users.js';
 
const __dirname = path.dirname(fileURLToPath(import.meta.url));
 
initSchema();
 
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0) {
  seedDemoData();
  console.log('[seed] empty database detected — demo students created (password: demo1234)');
}
 
const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://YOUR-NETLIFY-URL.netlify.app'
  ],
  credentials: true,
}));
app.use(express.json({ limit: '3mb' }));
 
app.use('/api/auth', authRoutes);
app.use('/api/auth', authGoogleRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/swaps', swapsRoutes);
app.use('/api/users', usersRoutes);
 
app.get('/api/health', (req, res) => res.json({ ok: true }));
 
// Demo accounts power the quick-login chips on the sign-in screen.
app.get('/api/demo-accounts', (req, res) => {
  const users = db
    .prepare("SELECT name, email FROM users WHERE email LIKE '%@demo.edu' ORDER BY id LIMIT 6")
    .all();
  res.json({ password: 'demo1234', accounts: users });
});
 
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
 
// Serve the built client (npm run build) so the whole app runs on one port.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}
 
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'That image is too large. Please choose a smaller photo.' });
  }
  console.error('[server]', err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});
 
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`SkillSwap API running on http://localhost:${PORT}`);
  if (existsSync(clientDist)) console.log(`Serving built client from ${clientDist}`);
});
 