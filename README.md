# SA Learner's Licence Practice Platform

A mobile-first TypeScript PWA starter for a South African learner's licence **practice and preparation** product. It deliberately avoids presenting itself as an official online learner's licence test.

## What is included

- Normalised learner metadata for LL1 learner classes `1`, `2`, and `3` and user-facing driving code families (`A1`, `A`, `B`, `EB`, `C1`, `C`, `EC1`, `EC`).
- Official-practice scoring metadata for a 64-question, 1-hour mock (28 rules + 28 signs + 8 controls) with sectional pass marks of 22/28, 23/28, and 6/8.
- Readiness logic that uses the weakest sectional readiness score rather than a misleading aggregate percentage.
- A responsive UI with a legal disclaimer, code-family selector, readiness dashboard, weak-area queue, and accessible sample test runner.
- Unit tests for the scoring model, readiness formula, mastery calculation, and remediation priority helper.

## Scripts

```bash
npm run dev
npm run test
npm run build
```

## Deploying (e.g. ll.scanme.site)

This project uses **nginx**, not Apache — `.htaccess` has no effect. Built files live in `dist/` (gitignored).

### Supabase config (required for full mock)

Get your **Project URL** and **anon public key** from [Supabase](https://app.supabase.com) → your project → **Settings** → **API**.

On the server, create a `.env` file in the project root (gitignored):

```bash
cp .env.example .env
# edit .env with your real values
```

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

`npm run build` reads `.env` and writes `dist/public/config.js` automatically.

Alternative: create `public/config.local.js` from `public/config.local.js.example`.

After each deploy:

```bash
cd /data/www/ll.scanme.site
npm ci
npm run build
```

Point nginx `root` at the build output (simplest):

```nginx
root /data/www/ll.scanme.site/dist;
index index.html;
```

See `deploy/nginx.conf.example` for a full server block. If `root` stays on the repo checkout, use `try_files /dist$uri /dist$uri/ /dist/index.html;` instead.

If assets still 404, confirm `dist/main.js` and `dist/styles.css` exist and reload nginx after config changes (`nginx -t && systemctl reload nginx`).

## Seeding the question bank

Full mocks need at least **28 rules**, **28 signs**, and **8 controls** questions per licence family (e.g. code **B**).

The repo includes an original practice question bank in `supabase/seed/question-bank.mjs`. It is **not** an official government paper — review and expand it before production use.

### 1. Add your service role key to `.env`

From Supabase → **Settings** → **API** → **service_role** key (keep this secret):

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Run the seed script

```bash
npm run seed
```

This inserts questions for all eight licence families (A1, A, B, EB, C1, C, EC1, EC). The script refuses to run if the `questions` table already has rows.

### Phone sign-in (SMS OTP)

The app signs users in with a **South African mobile number** and a one-time SMS code via Supabase Auth.

#### 1. Enable phone auth in Supabase

1. Open [Supabase Dashboard](https://app.supabase.com) → your project → **Authentication** → **Providers**
2. Enable **Phone**
3. Configure an SMS provider (Twilio is the most common):
   - **Authentication** → **Providers** → **Phone** → Twilio
   - Add your Twilio Account SID, Auth Token, and Message Service SID or From number
4. Save

See [Supabase phone login docs](https://supabase.com/docs/guides/auth/phone-login).

#### 2. Test numbers

For development, Twilio trial accounts can send SMS only to verified numbers. Add your test mobile in the Twilio console first.

Users enter numbers like `082 123 4567` — the app normalizes them to E.164 format (`+27821234567`) before calling Supabase.

### 3. Reseeding from scratch

If you need to start over, run this in the Supabase SQL editor:

```sql
truncate table public.attempt_answers, public.attempt_questions, public.attempts, public.questions cascade;
```

Then run `npm run seed` again.

### Adding your own questions

Edit `supabase/seed/question-bank.mjs` or import from CSV later. Each row needs:

| Field | Example |
|-------|---------|
| `official_domain` | `rules`, `signs`, or `controls` |
| `topic_slug` | `roundabouts` |
| `stem` | Question text |
| `option_a` / `option_b` / `option_c` | Three answer options |
| `correct_option` | `a`, `b`, or `c` |
| `learner_class` | `1`, `2`, or `3` (set automatically per bank) |
| `licence_family` | Set automatically from learner class |

## Product guardrails

- This is a practice platform only. It does not issue, book, invigilate, certify, or replace the official learner's licence process at a driving licence testing centre.
- Rule sets and licence-family mappings are modelled as data so they can be reviewed and updated as official guidance changes.
- Question wording should be original and source-aligned, with provenance stored for review before publication.

## First deploy checklist

The current starter is a static TypeScript PWA, so the first deploy only needs the compiled `dist/` output. No Supabase project, database migration, or secrets are required until backend/auth features are added.

1. **Confirm the app builds locally**
   ```bash
   npm run build
   ```
   This compiles TypeScript with `tsc`, recreates `dist/`, and copies the HTML, manifest, and stylesheet into the deployable folder.

2. **Run the test suite**
   ```bash
   npm run test
   ```
   This runs the build first, then executes the Node test files for the scoring and readiness helpers.

3. **Deploy as a static site**
   - Build command: `npm run build`
   - Publish/output directory: `dist`
   - Node version: Node 20 or newer is recommended because the test suite uses the built-in `node:test` runner.

4. **Use the lightweight local preview before pointing users at it**
   ```bash
   npm run dev
   ```
   This builds the app and serves `dist/` at `http://localhost:4173` for a quick smoke test.

5. **Manual first-deploy smoke checks**
   - The landing page says it is a practice platform only, not an official test.
   - The code-family selector changes the selected LL1 metadata.
   - The readiness dashboard shows rules, signs, and controls separately.
   - The sample runner shows the 28/28/8 quotas and 22/23/6 pass marks.
