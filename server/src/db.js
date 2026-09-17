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
  credits       INTEGER NOT NULL DEFAULT 0,
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
CREATE INDEX IF NOT EXISTS idx_swaps_users ON swaps(from_user_id, to_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
`;

export function initSchema() {
  db.exec(SCHEMA);
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
