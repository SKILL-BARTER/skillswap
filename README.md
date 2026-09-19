# SkillSwap — trade skills, not money

A campus skill-exchange platform. Students list what they **can teach** and what they **want to learn**;
the app finds the classmates on the other side of that trade, they swap, complete, and review each other.

Built for the Skill-Swap hackathon. Stack: React + Vite (client), Express (API), SQLite via Node's
built-in `node:sqlite` (zero native dependencies).

## Live Demo

Frontend: https://visionary-cranachan-ed343f.netlify.app
https://boisterous-praline-483844.netlify.app

Backend API: https://skillswap-szay.onrender.com

## Project Documents

- [SkillSwap Pitch Deck](docs/SkillSwap_Pitch_Deck.pptx)
- [SkillSwap Presentation Playbook](docs/SkillSwap_Presentation_Playbook.docx)
- boisterous-praline-483844.netlify.app
- 
---

## The pitch (for judges)

**Problem.** Tutoring costs money, study groups are random, and most students already know something
valuable — they just have no structured way to trade it.

**Solution.** SkillSwap turns "I know React, I want to learn guitar" into a match with the exact person
who needs React and plays guitar. No money changes hands.

**How the matching works.** Every pair of students is scored by an explainable formula:

| Signal | Points |
| --- | --- |
| They teach a skill on my "want to learn" list | +25 per skill (max 2) |
| I teach a skill on their "want to learn" list | +25 per skill (max 2) |
| **Two-way bonus** — the swap works in both directions | +20 |
| Same university | +5 |
| Trust bonus from their average review score | +0…5 |
| Total | capped at 100% |

Each match card shows the exact breakdown, so students (and judges) can see *why* they matched.

**Impact.** Two students who would have paid for tutors get a verified, reviewed exchange instead —
and the review history makes the next swap safer for everyone.

---

## Quick start

```bash
npm install          # installs server + client workspaces
npm run dev          # API on :4000, web on :5173 (proxies /api to the API)
```

Open http://localhost:5173 and click a demo student chip on the sign-in page.

**Demo mode (single port, like the hackathon stage):**

```bash
npm run build        # build the client
npm start            # server serves the built app on http://localhost:4000
```

The database is created and seeded automatically on first run. To reset the demo data at any time:

```bash
npm run seed         # drops everything and re-creates the sample students
```

**Run the end-to-end flow test** (server must be running):

```bash
npm run test:flow    # register → skills → match → request → accept → complete → review + verification (30 checks)
```

---

## Students-only access & verification

**Google sign-in, university domain only.** "Continue with Google" verifies the Google ID token
server-side with Firebase Admin and only lets the account in when the e-mail domain belongs to a
university: any `*.edu`, academic country domains (`*.ac.uk`, `*.edu.au`, `*.ac.jp`, …), or a domain
in the allow-list in `server/src/university.js`. Personal Gmail/Outlook addresses get a friendly
rejection. Registration with e-mail/password is gated the same way. Add extra domains without
touching code via `ALLOWED_UNIVERSITY_DOMAINS=example.edu,another.ac.za` in the environment.

Google credentials are loaded from `server/.env` (or `server/src/.env`) via
`FIREBASE_SERVICE_ACCOUNT_PATH`, or simply drop `firebase-service-account.json` into `server/`.
Firebase Admin is initialized lazily, so a missing credential disables only `/api/auth/google` —
the rest of the API keeps running.

**Selfie verification with the blue tick.** On the profile page a student can "Verify with a
selfie": a live camera capture (with an upload fallback for devices without a camera) is submitted
to `POST /api/users/me/verify-selfie`, which validates it is a real image (magic-byte checked,
size-capped), stores it, and flips on `verified`. Verified students get a blue tick next to their
name on match cards, swap cards and profiles. The stored photo is never sent back to clients.

---

## Open in VS Code

The repo ships with VS Code config so everything is one click away:

- **Run and Debug (F5)** → *Debug API server* (breakpoints work in the Express code)
- **Terminal → Run Task** → *dev (API + web)*, *seed demo data*, *build client*, *test: full swap flow*
- Recommended extensions are offered when you open the folder (Prettier, SQLite viewer, REST Client)

```powershell
npm install          # once per machine
code .               # open this folder in VS Code
npm run dev          # then browse http://localhost:5173
```

> Requires **Node 22.13+** (24 recommended) — the API uses Node's built-in `node:sqlite`,
> so there are no native add-ons to compile.

### Moving the project to another folder (same machine)

Copy only the source — dependencies and the database are recreated automatically:

```powershell
robocopy "C:\Users\sinog\Documents\Qoder\2026-09-17\chat-1" "$env:USERPROFILE\Documents\skillswap" /E /XD node_modules .git dist data
cd "$env:USERPROFILE\Documents\skillswap"
npm install
npm run dev
```

### Moving to another machine or teammates (GitHub, recommended)

```bash
cd <this folder>
git init -b main
git add .
git commit -m "SkillSwap: hackathon build"
git remote add origin https://github.com/<you>/skillswap.git
git push -u origin main
```

```bash
# on the other machine / teammate's laptop
git clone https://github.com/<you>/skillswap.git
cd skillswap
npm install
npm run dev
```

The SQLite database lives in `server/data/` (git-ignored) and is **created and seeded automatically**
on first run, so a fresh clone works with zero extra setup. Run `npm run seed` any time to restore the
pristine demo state.

---

## Demo accounts (password: `demo1234` for all)

| Student | University | Teaches | Wants to learn |
| --- | --- | --- | --- |
| **Maya Chen** `maya@demo.edu` | UC Berkeley | Python, React | Guitar, Spanish |
| Alice Novak `alice@demo.edu` | UC Berkeley | Guitar, Spanish | Python, React |
| Diego Ruiz `diego@demo.edu` | NYU | Guitar, Songwriting | Python |
| Priya Sharma `priya@demo.edu` | Stanford | Spanish, Public Speaking, Data Science | React, Python |
| Tom Becker `tom@demo.edu` | Stanford | Photography, Video Editing | Guitar |

Pre-seeded storylines: a **pending request from Alice waiting for Maya**, an **in-progress swap** with
Priya, a **completed swap with reviews** (Maya ↔ Tom), and rating history across the group.
Alice, Diego, Priya and Tom arrive **selfie-verified** (blue tick); Maya starts unverified so the
selfie flow can be demoed live.

## 3-minute demo script

1. **Sign in as Maya** (one click from the demo chips) → dashboard shows her swap board: 10 credits,
   a request waiting, matches ready.
2. **Discover** → Alice Novak ranks **100%**: she teaches both Guitar *and* Spanish that Maya wants,
   wants both skills Maya teaches, and is at the same university. Expand *"How this score is
   calculated"* to show the point-by-point breakdown. Priya (97%) and Diego (75%) show one-way
   and trust-weighted variations.
3. **Offer a swap** → the modal pre-fills Maya's proposal ("You teach Python ⇄ You learn Guitar") and
   drafts the message. Send it.
4. **My swaps → Incoming** → Alice's request is sitting there. Accept → Complete.
5. **Leave a review** → 5 stars + a comment; the trust tag flips to "You reviewed".
6. **Profile / Alice's profile** → ratings, swap history and reviews are visible to everyone, and
   both students earned **+10 skill credits** for the completed swap.
7. **Get verified** → on Maya's profile click *Verify with a selfie*, capture a quick photo and
   submit — the blue tick instantly appears next to her name. (Alice's profile already shows the
   tick and a "Verified student" chip.)

---

## Project structure

```
server/
  firebaseAdmin.js   lazy Firebase Admin init + .env loading (Google sign-in)
  src/index.js       Express app, static client serving, auto-seed
  src/db.js          SQLite connection + full schema + migrations
  src/auth.js        scrypt password hashing, sessions (30-day TTL), requireAuth
  src/matching.js    the explainable match-scoring engine
  src/university.js  university e-mail domain gate
  src/helpers.js     profile/skill/swap query helpers
  src/routes/        auth, auth-google, skills, matches, swaps, users
  src/seed.js        demo students + swap storylines
  scripts/smoke.mjs  end-to-end flow test
client/
  src/pages/         Login, Register, Dashboard, Discover, Swaps, Profile, UserProfile
  src/components/    MatchCard, SwapCard, SwapRequestModal, ReviewModal, SkillEditor, NavBar,
                     GoogleButton, SelfieVerify, ui
  src/styles/        design tokens + components
```

## Database schema

- `users` — profile, `credits` (earned 10 per completed swap), avatar color, `verified` +
  `selfie_data` (the selfie-verification backing store)
- `skills` — normalised catalogue for clean matching
- `user_skills` — `type = 'teach' | 'learn'`, level 1–5
- `swaps` — `pending → accepted → completed` (plus `declined`, `cancelled`), skills + message
- `reviews` — one per side per swap, drives every rating on the platform
- `sessions` — bearer tokens (expire after 30 days)

## API reference

| Method & path | Purpose |
| --- | --- |
| `POST /api/auth/register` · `login` · `logout` | accounts & sessions |
| `POST /api/auth/google` | Google sign-in (university-domain enforced) |
| `GET /api/auth/me` | my profile + skills + rating |
| `GET /api/skills` | skill catalogue (autocomplete) |
| `GET/POST /api/skills/mine`, `PATCH/DELETE /api/skills/mine/:id` | manage my teach/learn skills |
| `GET /api/matches` | ranked matches with reasons + score breakdown |
| `GET/POST /api/swaps` | list my swaps / send a request |
| `POST /api/swaps/:id/accept·decline·cancel·complete` | swap lifecycle |
| `POST /api/swaps/:id/review` | rate a completed swap |
| `POST /api/users/me/verify-selfie` | submit a selfie, earn the verified tick |
| `GET/PATCH /api/users/me` · `GET /api/users/:id` | profile read/write |

## Deliberately out of scope (per the plan)

No chat, no AI, no calendars, no payments. Skill credits exist as a lightweight reputation counter.
University e-mail gating and selfie verification ship as of this build. The next things to add
after the hackathon: in-app messaging, scheduling, automated face-match verification (the current
check confirms a real image was submitted, not that it matches the student), and negative-balance
credit trading.
