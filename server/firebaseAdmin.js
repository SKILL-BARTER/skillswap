import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = __dirname;

/*
 * Tiny .env loader (no dotenv dependency). Looks for server/.env and
 * server/src/.env so credentials keep working no matter how the server
 * is started (npm run dev, npm start, node src/index.js, ...).
 * Existing environment variables always win.
 */
function loadEnvFiles() {
  const candidates = [path.join(__dirname, '.env'), path.join(__dirname, 'src', '.env')];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const [, key, value] = match;
      if (!(key in process.env)) process.env[key] = value.replace(/^["']|["']$/g, '');
    }
  }
}

let authInstance = null;

/*
 * Initialize Firebase Admin lazily on first use. This keeps the whole API
 * bootable even when the Google credentials are missing or broken — only
 * the /auth/google route returns an error instead of crashing the server.
 *
 * Credential resolution order:
 *   1. FIREBASE_SERVICE_ACCOUNT       — JSON content in one env var
 *   2. FIREBASE_SERVICE_ACCOUNT_PATH  — path to the JSON file (relative
 *                                       paths resolve against server root)
 *   3. server/src/firebase-service-account.json / server/firebase-service-account.json
 */
function loadCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  const candidates = [];
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    candidates.push(path.isAbsolute(p) ? p : path.join(__dirname, p));
  }
  candidates.push(path.join(__dirname, 'src', 'firebase-service-account.json'));
  candidates.push(path.join(__dirname, 'firebase-service-account.json'));

  for (const file of candidates) {
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  }
  throw new Error(
    'Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH, ' +
      'or place firebase-service-account.json in the server directory.'
  );
}

export function getFirebaseAuth() {
  if (authInstance) return authInstance;
  loadEnvFiles();
  const app = getApps()[0] || initializeApp({ credential: cert(loadCredential()) });
  authInstance = getAuth(app);
  return authInstance;
}
