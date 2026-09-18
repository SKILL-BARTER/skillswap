import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
 
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });
 
export const db = new DatabaseSync(path.join(DATA_DIR, 'skillswap.db'));
db.exec('PRAGMA foreign_keys = ON;');
 
/*
 * Skill-Swap schema
 *
 * users       - students (auth + profile + optional skill credits)
 *              verified / selfie_data back the selfie-verification badge:
 *              a student is marked verified once they submit a live selfie,
 *              which is stored so a human can re-check it later if needed.
 * skills      - normalized catalogue ("Guitar", "React", ...)
 * user_skills - a user either teaches or wants to learn a skill (type = 'teach' | 'learn')
 * swaps       - a request to exchange skills; status walks pending -> accepted -> completed
 * reviews     - after a swap completes both sides can rate each other (one review per side)
 * sessions    - bearer tokens for the API
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  university    TEXT NOT NULL DEFAULT '',
  bio           TEXT NOT NULL DEFAULT '',
  avatar_color  TEXT NOT NULL DEFAULT '#6366f1',
  avatar_url    TEXT,
  degree        TEXT NOT NULL DEFAULT '',
  year_of_study TEXT NOT NULL DEFAULT '',
  campus        TEXT NOT NULL DEFAULT '',
  interests     TEXT NOT NULL DEFAULT '[]',
  availability  TEXT NOT NULL DEFAULT '',
  linkedin_url  TEXT NOT NULL DEFAULT '',
  github_url    TEXT NOT NULL DEFAULT '',
  portfolio_url TEXT NOT NULL DEFAULT '',
  credits       INTEGER NOT NULL DEFAULT 0,
  verified      INTEGER NOT NULL DEFAULT 0,
  selfie_data   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
 
CREATE TABLE IF NOT EXISTS skills (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Other'
);
 
CREATE TABLE IF NOT EXISTS user_skills (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id   INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('teach', 'learn')),
  level      INTEGER NOT NULL DEFAULT 3 CHECK (level BETWEEN 1 AND 5),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, skill_id, type)
);
 
-- Photo/video proof attached to a specific user_skills row, so a viewer can
-- see evidence for "Guitar" specifically rather than a generic profile gallery.
-- Images are stored as base64 data URLs (like the avatar). Videos are stored
-- as a link to an external host (YouTube/Vimeo/Loom) rather than uploaded
-- directly — raw video files are too large for this app's JSON-body upload
-- approach and would need real file storage/multipart handling instead.
CREATE TABLE IF NOT EXISTS skill_media (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_skill_id INTEGER NOT NULL REFERENCES user_skills(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('image', 'video')),
  url           TEXT NOT NULL,
  caption       TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
 
CREATE TABLE IF NOT EXISTS swaps (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id   INTEGER NOT NULL REFERENCES users(id),
  to_user_id     INTEGER NOT NULL REFERENCES users(id),
  teach_skill_id INTEGER NOT NULL REFERENCES skills(id),
  learn_skill_id INTEGER REFERENCES skills(id),
  message        TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at   TEXT
);
 
CREATE TABLE IF NOT EXISTS reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  swap_id     INTEGER NOT NULL REFERENCES swaps(id) ON DELETE CASCADE,
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  reviewee_id INTEGER NOT NULL REFERENCES users(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (swap_id, reviewer_id)
);
 
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
 
CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON user_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_media_user_skill ON skill_media(user_skill_id);
CREATE INDEX IF NOT EXISTS idx_swaps_users ON swaps(from_user_id, to_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
`;
 
// Columns added to `users` after the table may already have existed on disk.
// CREATE TABLE IF NOT EXISTS above only builds the table from scratch, so on
// an existing database.db these have to be patched in with ALTER TABLE.
const USER_COLUMN_MIGRATIONS = [
  ['avatar_url', "ALTER TABLE users ADD COLUMN avatar_url TEXT"],
  ['degree', "ALTER TABLE users ADD COLUMN degree TEXT NOT NULL DEFAULT ''"],
  ['year_of_study', "ALTER TABLE users ADD COLUMN year_of_study TEXT NOT NULL DEFAULT ''"],
  ['campus', "ALTER TABLE users ADD COLUMN campus TEXT NOT NULL DEFAULT ''"],
  ['interests', "ALTER TABLE users ADD COLUMN interests TEXT NOT NULL DEFAULT '[]'"],
  ['availability', "ALTER TABLE users ADD COLUMN availability TEXT NOT NULL DEFAULT ''"],
  ['linkedin_url', "ALTER TABLE users ADD COLUMN linkedin_url TEXT NOT NULL DEFAULT ''"],
  ['github_url', "ALTER TABLE users ADD COLUMN github_url TEXT NOT NULL DEFAULT ''"],
  ['portfolio_url', "ALTER TABLE users ADD COLUMN portfolio_url TEXT NOT NULL DEFAULT ''"],
];
 
function migrateUserColumns() {
  const existing = new Set(db.prepare('PRAGMA table_info(users)').all().map((c) => c.name));
  for (const [column, sql] of USER_COLUMN_MIGRATIONS) {
    if (!existing.has(column)) db.exec(sql);
  }
}
 
export function initSchema() {
  db.exec(SCHEMA);
  migrateUserColumns();
  migrateVerificationColumns();
}

/*
 * Lightweight migration for databases created before verified/selfie_data
 * existed (CREATE TABLE IF NOT EXISTS never alters an existing table).
 */
function migrateVerificationColumns() {
  const columns = new Set(db.prepare('PRAGMA table_info(users)').all().map((c) => c.name));
  const added = [];

  if (!columns.has('verified')) {
    db.exec('ALTER TABLE users ADD COLUMN verified INTEGER NOT NULL DEFAULT 0');
    added.push('verified');
  }
  if (!columns.has('selfie_data')) {
    db.exec('ALTER TABLE users ADD COLUMN selfie_data TEXT');
    added.push('selfie_data');
  }

  // One-time: flag the demo students (except maya@demo.edu, the account we
  // demo the selfie flow with) as verified so the badge is visible out of the box.
  if (added.includes('verified')) {
    db.exec(
      "UPDATE users SET verified = 1 WHERE email LIKE '%@demo.edu' AND email != 'maya@demo.edu'"
    );
  }
}
export function resetDb() {
  db.exec(`
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS swaps;
    DROP TABLE IF EXISTS user_skills;
    DROP TABLE IF EXISTS skills;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS users;
  `);
  initSchema();
}
 