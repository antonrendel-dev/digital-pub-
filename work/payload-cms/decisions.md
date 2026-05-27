# Decisions Log: payload-cms

Agent reports on completed tasks. Each entry is written by the agent that executed the task.

---

<!-- Entries are added by agents as tasks are completed.

Format is strict — use only these sections, do not add others.
Do not include: file lists, findings tables, JSON reports, step-by-step logs.
Review details — in JSON files via links. QA report — in logs/working/.

## Task N: [title]

**Status:** Done
**Commit:** abc1234
**Agent:** [teammate name or "main agent"]
**Summary:** 1-3 sentences: what was done, key decisions. Not a file list.
**Deviations:** None / Deviated from spec: [reason], did [what].

**Reviews:**

*Round 1:*
- code-reviewer: 2 findings → [logs/working/task-N/code-reviewer-1.json]
- security-auditor: OK → [logs/working/task-N/security-auditor-1.json]

*Round 2 (after fixes):*
- code-reviewer: OK → [logs/working/task-N/code-reviewer-2.json]

**Verification:**
- `npm test` → 42 passed
- Manual check → OK

-->

## Task 1: Next.js 15 + React 19 Upgrade

**Status:** Done
**Commit:** d58da25
**Agent:** main agent

**Summary:** Upgraded next 14.2.35 → 15.5.18 and react/react-dom ^18 → 19.2.6. Fixed all 5 dynamic route files and 2 listing pages to use `Promise<{...}>` typing with `await` before field access (Next.js 15 breaking change). Fixed a pre-existing type annotation bug in `app/vacancies/[category]/[slug]/page.tsx` where `post.tags` was accessed via a nested `{ tag: { slug } }` shape inconsistent with the actual flat FeedPost structure.

**Deviations:** Also fixed `app/vacancies/page.tsx` and `app/resumes/page.tsx` (searchParams → Promise) discovered during build — not listed in spec's 5 files. Test file extended with 4 tests beyond the 8 TDD anchor items (VacancyPage generateMetadata, ArticlePage generateMetadata, both searchParams listing pages). Spec mock example listed `@/lib/vacancies` — module doesn't exist; actual mocks use `@/lib/posts`. `next-mdx-remote@5.0.0` retained with React 19 despite peer dep warning — build passes; upgrade deferred.

**Reviews:**

_Round 1:_

- code-reviewer: 6 findings (CR-3, CR-5 rejected — @/lib/vacancies non-existent, transform override needed for preserve jsx; CR-1, CR-2 skipped; CR-4 documented) → [logs/working/task-1/code-reviewer-1.json]
- security-auditor: 3 findings (SA-1/SA-2 pre-existing dangerouslySetInnerHTML documented for Phase 2; SA-3 same as CR-4) → [logs/working/task-1/security-auditor-1.json]
- test-reviewer: 6 findings (TR-1, TR-3 fixed — added 4 tests; TR-2, TR-4, TR-5, TR-6 rejected/skipped) → [logs/working/task-1/test-reviewer-1.json]

**Known risk (SA-1/SA-2):** `tag.seoText` rendered via `dangerouslySetInnerHTML` without sanitization in two tag pages. Pre-existing; Phase 2 Payload CMS write path must add server-side sanitization.

**Verification:**

- `npm test` → 79 passed, 4 todo (pre-existing), 0 failures
- `npx tsc --noEmit` → 0 errors
- `npm run build` → exit 0
- `npm run lint` → 0 errors (1 pre-existing img warning unrelated)
- Smoke (staging) → pending deploy

## Task 2: Deploy Pipeline Updates

**Status:** Done
**Commit:** 3bdee5f
**Agent:** main agent

**Summary:** Removed Prisma steps (generate + rsync generated/prisma/) from both workflows. Added Payload-aware steps: `--exclude=uploads/` on public/ rsync, `payload-migrations/` rsync with `--ignore-missing-args`, NVM-aware `npm ci --omit=dev` on server, and guarded `npx payload migrate` (skips if payload not yet installed). Timeout raised to 20 min. Created `deploy-staging.yml` deploying from `dev` to red server via PM2.

**Deviations:** DATABASE_URL kept alongside DB_CONNECTION_STRING in prod build env during transition (Prisma still active until Task 8). Staging app path kept as `~/staging/d-pub/` (existing working setup) instead of `~/staging.d-pub.ru/app/` from spec. `NEXT_PUBLIC_YANDEX_METRIKA_ID` shared between staging and prod — intentional, single counter.

**Reviews:**

_Round 1:_

- code-reviewer: 4 findings → [logs/working/task-2/code-reviewer-1.json]
- security-auditor: 7 findings → [logs/working/task-2/security-auditor-1.json]
- deploy-reviewer: 8 findings → [logs/working/task-2/deploy-reviewer-1.json]

Applied: CR-1/SA-3/SA-4 (payload guard), CR-2/DR-1 (NVM in staging), DR-4 (timeout 20m).
Rejected: CR-3 (Task 3 scope), CR-4/SA-7 (intentional), SA-1/2 (credentials from .env correct), SA-5/6 (intentional), DR-2/3/5/6/7/8 (out of scope or not real issues).

**Verification:**

- YAML valid: both files parse cleanly
- No prisma in deploy.yml: confirmed
- uploads excluded: confirmed
- migrate before reload: line 67 < line 76
- No prod secrets in staging: confirmed

## Task 3: Payload Installation & Base Config

**Status:** Done
**Commit:** da441e7
**Agent:** main agent

**Summary:** Installed Payload CMS 3.85.0 with `--legacy-peer-deps` (Next.js 15.5.18 not yet in @payloadcms/next peer dep range — same pattern as next-mdx-remote). Created payload.config.ts with postgresAdapter (pool.connectionString API), stub collections/globals, onInit user seed with idempotency guard. Created all app/(payload) route files from official blank template. Added @payload-config tsconfig alias.

**Deviations:** Users stub extended beyond minimal (added `auth: { useAPIKey: true }`, `role` field, basic access control) — required for onInit to generate apiKey and prevent open /api/users endpoint. serverURL uses `NEXT_PUBLIC_SERVER_URL` env var with fallback to d-pub.ru (task said hardcode, but CR-4 showed staging would break). Global CSP source changed from `/(.*)`to `/((?!admin).*)` negative lookahead — prevents Next.js from merging global frame-ancestors:'none' with admin frame-ancestors:'self'.

**Reviews:**

_Round 1:_

- code-reviewer: 8 findings → [logs/working/task-3/code-reviewer-1.json]
- security-auditor: 7 findings → [logs/working/task-3/security-auditor-1.json]

Applied: CR-1/SA-1 (secret guard), CR-2/SA-2 (password guard), CR-3 (Users stub role+useAPIKey), SA-4 (Users access control), CR-5 (CSP non-merging via negative lookahead), CR-6 (try/catch in onInit), CR-4 (serverURL env var), CR-8 (WebSocket in admin connect-src).
Rejected: SA-5 (DB guard — pg throws at connect), SA-7 (unsafe-eval intentional for Lexical). SA-3 accepted — console.log API key is per task spec, one-time only.

**Verification:**

- `npx tsc --noEmit` → 0 errors
- `npm run build` (with PAYLOAD_SECRET set) → exit 0, /admin/[[...segments]] in route table
- `npm test` → 79 passed, 0 failures
- stub files: 5 collections + 4 globals confirmed
- DB_CONNECTION_STRING: no DATABASE_URI/DATABASE_URL in payload.config.ts ✓
- withPayload() wrapping next.config.mjs ✓

## Task 10: Agent API Route (/api/articles)

**Status:** Done
**Commit:** pending
**Agent:** main agent

**Summary:** Created `app/api/articles/route.ts` with GET (public, `overrideAccess: false` — delegates filtering to the collection's `read` access function) and POST (agent/admin create via `payload.auth({ headers })` + manual role check + `user` threaded into `payload.create()` with `overrideAccess: false`). P1 post-review fixes: removed API key from `console.log` in `payload.config.ts` (replaced with safe logger hint); added field-level `status` access control in `articles.ts` (agent cannot publish directly); fixed `req` cast to pass `user` directly; fixed error handler to preserve `err.status` and not leak non-public messages; GET now uses Payload access control instead of manual `where` filter.

**Deviations:** Added `post_create_validation_error_returns_400` as a 9th test (P1 from test-reviewer — catch branch was uncovered). `post_invalid_token_returns_401` now mocks `auth` throwing (not returning `user: null`) to distinguish "malformed token" from "no token" — route wraps `payload.auth()` in try/catch returning 401 on any auth exception.

**Reviews:**

_Round 1:_

- code-reviewer: 3 P1 findings (req cast, Forbidden as 400, GET overrideAccess default), 3 P2, 2 P3 → all P1 fixed → [logs/working/task-10/code-reviewer-1.json]
- security-auditor: 3 P1 findings (API key in logs, mass assignment on status, error leakage), 4 P2/P3 → all P1 fixed → [logs/working/task-10/security-auditor-1.json]
- test-reviewer: 2 P1 findings (duplicate 401 test, missing ValidationError test), 5 P2/P3 → all P1 fixed → [logs/working/task-10/test-reviewer-1.json]

**Verification:**

- `npx tsc --noEmit` → 0 errors
- `npm test` → 139 passed, 4 todo, 0 failures
- No `overrideAccess: true` in route.ts ✓
- No secrets in logs ✓

## Task 11: Sync Script Migration (Prisma → Payload REST API)

**Status:** Done
**Commit:** da129d5
**Agent:** main agent

**Summary:** Removed all Prisma imports and dependencies from `scripts/sync-telegram.ts`. Replaced `assignTags`/`savePost` (Prisma) with `loadTagMap()` (GET /api/tags) + `resolveTagIds()` + `savePost(post, tagMap)` (POST /api/posts). Deleted `backfillTags` and `backfillImages` functions entirely. Added `require.main === module` guard to prevent `main()` execution on test import. PAYLOAD_API_KEY resolved at call-time inside `savePost()` to avoid module-load throw during test imports.

**Deviations:** PAYLOAD_API_KEY validation moved from module load time to `savePost()` call time — spec showed it as a top-level throw, but that pattern breaks Jest imports. Functionally equivalent at runtime; key absence throws with the same message on first sync attempt.

**Reviews:**

_Round 1:_

- code-reviewer: 3 minor/low findings, all skipped — no action required → [logs/working/task-11/code-reviewer-1.json]
- security-auditor: approve — no secrets in logs confirmed → [logs/working/task-11/security-auditor-1.json]
- test-reviewer: approve — all 3 TDD anchors passing → [logs/working/task-11/test-reviewer-1.json]

**Verification:**

- `npx tsc --noEmit` → 0 errors
- `npm test -- --testPathPatterns=sync-telegram` → 9 passed, 0 failures
- Smoke: no prisma imports ✓, no PAYLOAD_API_KEY in console._ ✓, no Authorization in console._ ✓, 409 handled ✓, no backfill functions ✓, no prisma.$disconnect ✓
