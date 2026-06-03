# SA Learner's Licence Practice Platform

A mobile-first TypeScript PWA starter for a South African learner's licence **practice and preparation** product. It deliberately avoids presenting itself as an official online learner's licence test.

## What is included

- Normalised learner metadata for LL1 learner classes `1`, `2`, and `3` and user-facing driving code families (`A1`, `A`, `B`, `EB`, `C1`, `C`, `EC1`, `EC`).
- Official-practice scoring metadata for a 68-question, 1-hour mock with sectional pass marks of 22/28 rules, 23/28 signs, and 6/8 controls.
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

This project uses **nginx**, not Apache — `.htaccess` has no effect. Built files live in `dist/` (gitignored). After each deploy:

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
