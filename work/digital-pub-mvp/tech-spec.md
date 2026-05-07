---
created: 2026-05-06
status: approved
branch: dev
size: L
---

# Tech Spec: Диджитал Паб — MVP

## Solution

Transform the existing Next.js 14 prototype into a production-ready MVP job board. The prototype has a working feed with PostgreSQL data, basic filtering (text search), search in navbar, pagination ("Показать ещё"), and Telegram sync — but lacks responsive design, real tag system, articles, SEO pages, and has 1359 lines of custom CSS with zero media queries.

The implementation covers 5 major workstreams:

1. **Tailwind CSS migration** — Replace custom CSS with Tailwind utility classes (mobile-first). Keep CSS variables for theme colors, use Tailwind's `dark:` modifier with `[data-theme="dark"]` selector. Theme transition ≥200ms via `transition-colors duration-200`.

2. **Tag system** — Activate the existing Tag/PostTag M:N schema. Add `slug`, `seoTitle`, `seoDescription`, `seoText` fields to Tag model. Modify sync-telegram.ts to auto-assign tags via keyword mapping. Replace text-based filtering with tag-based queries.

3. **SEO tag pages** — Dynamic routes `/vacancies/tag/{tag-slug}` with posts filtered by Tag/PostTag relations. Unique meta tags, h1, and SEO text per tag page.

4. **Articles section** — MDX files in `content/articles/` processed by `next-mdx-remote` with explicit component allowlist (security). Pages `/articles` (listing) and `/articles/{slug}` (detail). ≥10 articles created by agents before launch.

5. **Infrastructure** — Navbar/footer cleanup, real DB statistics, privacy/terms pages, sitemap.xml, security headers, E2E and integration tests.

## Architecture

### What we're building/modifying

- **Prisma Schema** (`prisma/schema.prisma`) — Extend Tag model with SEO fields (slug, seoTitle, seoDescription, seoText). Add migration.
- **Sync Script** (`scripts/sync-telegram.ts`) — Add tag auto-assignment logic after post creation using keyword→tag mapping.
- **Tag Data Layer** (`lib/tags.ts`) — New module: queries for tags with post counts, tag lookup by slug, posts by tag.
- **Article Data Layer** (`lib/articles.ts`) — New module: read MDX files from `content/articles/`, parse frontmatter, render content. Slug validation to prevent path traversal.
- **Feed Component** (`components/feed/Feed.tsx`) — Replace text-based chip filtering with tag-based filtering. Preserve existing search (client-side by title/description/company) and pagination ("Показать ещё").
- **Layout Components** — Migrate all components from custom CSS classes to Tailwind utility classes: Navbar, LeftSidebar, RightSidebar, Footer, HomePage, ListingPage, PageShell, PostDetail, JobCard.
- **SEO Tag Pages** (`app/vacancies/tag/[tagSlug]/page.tsx`) — New dynamic route with tag-filtered posts and SEO content.
- **Articles Pages** (`app/articles/page.tsx`, `app/articles/[slug]/page.tsx`) — New routes for article listing and detail.
- **Static Pages** (`app/privacy/page.tsx`, `app/terms/page.tsx`) — Legal pages.
- **Sitemap** (`app/sitemap.ts`) — Dynamic sitemap generation.
- **Tailwind Config** (`tailwind.config.ts`) — Extended theme with project CSS variables, darkMode selector config.
- **Security** — next.config.mjs security headers (CSP, X-Frame-Options).
- **Tests** — Unit (co-located with tasks), E2E (Playwright), integration tests.

### How it works

**Tag assignment flow:**
Sync script fetches Telegram posts → saves post to DB → runs keyword matching against tag definitions (word boundary matching to avoid false positives) → creates PostTag entries for matched tags → tags are immediately available for filtering and SEO pages.

**Tag-based filtering flow (main feed):**
Server component fetches published posts with their tags (Prisma `include: { tags: { include: { tag: true } } }`) → passes to Feed component → user clicks filter chip → client-side filters by tag name match against post's assigned tags (not text search). Existing search (by title/description/company) and pagination ("Показать ещё", 10 per page) are preserved unchanged.

**SEO tag page flow:**
User visits `/vacancies/tag/smm` → Next.js resolves `[tagSlug]` param → validates slug format (`/^[a-z0-9-]+$/`) → server component queries Tag by slug → fetches posts via PostTag join → generates page with unique meta/title/h1 from Tag's SEO fields → renders post list + SEO text block at bottom.

**Article flow:**
MDX files in `content/articles/` with frontmatter (title, slug, description, publishedAt) → `lib/articles.ts` reads directory, validates slug against allowlist of existing files (prevents path traversal), parses frontmatter with `gray-matter`, renders with `next-mdx-remote` using explicit component allowlist (h1-h6, p, ul, ol, li, a, img, code, pre, blockquote, table — no custom components, no script/iframe) → `/articles` lists all published articles sorted by date → `/articles/{slug}` renders full MDX content.

**Responsive flow:**
Tailwind mobile-first approach: base styles = mobile (320px+), `md:` breakpoint (768px) = tablet/desktop with sidebars. Navbar collapses to burger menu below `md:`. Grid layout uses `grid-cols-1 md:grid-cols-[210px_1fr_220px]`. Theme transition: `transition-colors duration-200` on root element (≥200ms).

### Shared resources

| Resource | Owner (creates) | Consumers | Instance count |
|----------|----------------|-----------|----------------|
| Prisma Client | `lib/prisma.ts` | All server components, sync script, lib/tags.ts, lib/posts.ts | 1 (singleton) |

## Decisions

### Decision 1: Tailwind darkMode via [data-theme] selector
**Decision:** Configure `darkMode: ['selector', '[data-theme="dark"]']` in Tailwind config. Keep existing `[data-theme]` attribute toggling in HomePage/ListingPage. Add `transition-colors duration-200` to root element for ≥200ms animated theme transitions.
**Rationale:** Preserves the existing theme switching mechanism (localStorage + data attribute) while enabling Tailwind's `dark:` modifier. Supports US: "Dark/Light тема с анимированным переключением (transition ≥200ms) через Tailwind dark: модификатор".
**Alternatives considered:** `darkMode: 'class'` with `.dark` class — would require changing all theme toggle logic. `darkMode: 'media'` — no user control.

### Decision 2: CSS variables stay in globals.css, component styles move to Tailwind
**Decision:** Keep `:root` and `[data-theme='dark']` CSS variable blocks in globals.css (~60 lines). Remove all 1300+ lines of component CSS. Map CSS vars to Tailwind theme in config.
**Rationale:** CSS variables define the color palette centrally; Tailwind classes consume them. Best of both worlds. Supports US: "Миграция стилей с кастомного CSS на Tailwind CSS".
**Alternatives considered:** Move all colors into Tailwind config directly — harder to maintain light/dark variants.

### Decision 3: Tag auto-assignment via keyword map with word boundary matching
**Decision:** Define a `TAG_KEYWORDS` map in sync-telegram.ts: `{ "SMM": ["smm", "соцсети", "social media"], "SEO": ["seo", "поисковая оптимизация"], ... }`. Match using word boundaries (regex `\b` or Cyrillic-aware boundary) to avoid false positives (e.g., "seotext" should not match "seo"). `[TECHNICAL]`
**Rationale:** Simple, deterministic, easy to extend. Supports US: "Синхронизация из Telegram автоматически назначает теги постам при импорте".
**Alternatives considered:** LLM-based classification — overkill for MVP.

### Decision 4: Tag model extension for SEO pages
**Decision:** Add fields to Tag model: `slug` (String, unique), `seoTitle` (String?), `seoDescription` (String?), `seoText` (String?). Seed tags with SEO content via a seed script.
**Rationale:** Each SEO tag page needs unique meta title, description, and bottom text. Supports US: "SEO-страницы по тегам с уникальным title, meta description, h1, SEO-текстом внизу".
**Alternatives considered:** MDX files per tag — unnecessary complexity.

### Decision 5: MDX articles with security: component allowlist + path traversal prevention
**Decision:** Articles stored as MDX files in `content/articles/`. Use `next-mdx-remote` with explicit component allowlist (only safe HTML elements: h1-h6, p, ul, ol, li, a, img, code, pre, blockquote, table). Article slugs validated against `/^[a-z0-9-]+$/` regex and cross-checked with actual filenames from `fs.readdirSync` to prevent path traversal. `[TECHNICAL]`
**Rationale:** MDX can execute arbitrary JSX — allowlist prevents XSS. Slug validation prevents reading arbitrary server files. Supports US: "Статьи хранятся как MDX-файлы в репо с поддержкой батчевого деплоя".
**Alternatives considered:** `@next/mdx` — requires file-based routing, less flexible. No allowlist — XSS risk.

### Decision 6: Tag page URL prefix to avoid route collision
**Decision:** Use `/vacancies/tag/{tagSlug}` for SEO tag pages. Keep `/vacancies/{postSlug}` for individual vacancy pages. `[TECHNICAL]`
**Rationale:** Both tag slugs and post slugs share `/vacancies/` namespace. Using `/tag/` prefix avoids collision. Supports US: "SEO-страницы по тегам: /vacancies/{tag-slug}".
**Alternatives considered:** Catch-all `[...slug]` — fragile. Query params — poor SEO.

### Decision 7: Remove "Войти", link "+ Разместить" to bot
**Decision:** Remove "Войти" button from Navbar. Change "+ Разместить" to link to `https://t.me/resume_vac_bot`. Footer "Разместить вакансию" and "Реклама" links already point to bot — preserve them. `[TECHNICAL]`
**Rationale:** Auth not in MVP. Supports US: "Кнопка «+ Разместить» в хэдере — ведёт на бота @resume_vac_bot".

### Decision 8: Navbar simplification — remove dead links
**Decision:** Remove Отзывы, Курсы, Полезное from Navbar and Footer. Keep: Главная, Вакансии, Резюме, Статьи. `[TECHNICAL]`
**Rationale:** Dead links hurt UX and SEO. Supports US: "Навбар сокращён до 4 пунктов".

### Decision 9: Hide posts without description + remove mock data fallback
**Decision:** Add `description: { not: null }` filter to all post queries in `lib/posts.ts`. Remove mock data fallback (`getMockPosts`) in production — return empty array instead. `[TECHNICAL]`
**Rationale:** Posts without description provide no value. Mock data fallback can show fabricated listings to real users — data integrity risk. Supports US: "Посты без описания не показываются в ленте".

### Decision 10: Input validation on all URL slug parameters
**Decision:** Validate all dynamic route slugs (tagSlug, articleSlug, postSlug) with `zod` schema: `z.string().regex(/^[a-z0-9-_]{1,80}$/)`. Return 404 for invalid slugs without querying DB. Keep `zod` dependency (was proposed for removal). `[TECHNICAL]`
**Rationale:** Prevents malformed input from reaching DB queries, information disclosure via error messages, and potential ReDoS.
**Alternatives considered:** Remove zod and use raw regex — zod provides better error messages and composability.

### Decision 11: Security headers via next.config.mjs
**Decision:** Add security headers: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. `[TECHNICAL]`
**Rationale:** Prevents clickjacking and MIME sniffing. CSP deferred to iteration 2 (needs careful tuning with Tailwind inline styles).

### Decision 12: Sync writes posts as `published` (PK override)
**Decision:** Telegram sync creates posts with `status: 'published'` directly, bypassing the `pending → published` moderation flow described in Project Knowledge (patterns.md). `[TECHNICAL]`
**Rationale:** User-spec explicitly states "Синхронизация из Telegram пишет посты со статусом published напрямую, без модерации. Модерация — в итерации 2 с админкой." PK was written for the full product vision; MVP skips moderation intentionally.

## Data Models

### Tag model (extended)

```prisma
model Tag {
  id              Int       @id @default(autoincrement())
  name            String    @unique
  slug            String    @unique
  tagType         TagType
  seoTitle        String?
  seoDescription  String?
  seoText         String?
  posts           PostTag[]
}
```

New fields: `slug` (required, unique), `seoTitle`, `seoDescription`, `seoText`.

### Tag seed data

Initial tags to seed:

| name | slug | tagType |
|------|------|---------|
| Удалёнка | udalyonka | format |
| Офис | ofis | format |
| Гибрид | gibrid | format |
| SMM | smm | specialization |
| SEO | seo | specialization |
| Дизайн | dizajn | specialization |
| Маркетинг | marketing | specialization |
| Менеджер | menedzher | specialization |
| Таргет | target | specialization |
| Разработка | razrabotka | specialization |
| Аналитика | analitika | specialization |
| Финансы | finansy | specialization |
| HR | hr | specialization |
| WordPress | wordpress | specialization |
| Junior | junior | level |
| Middle | middle | level |
| Senior | senior | level |

### FeedPost interface (extended)

```typescript
export interface FeedPost {
  id: number
  type: 'vacancy' | 'resume'
  title: string
  slug: string | null
  description: string | null
  company: string | null
  salary: string | null
  imageUrl: string | null
  channelUsername: string | null
  telegramMessageId: string | null
  createdAt: string
  isNew: boolean
  tags: { id: number; name: string; slug: string }[]
}
```

### Article MDX frontmatter

```yaml
---
title: "Как найти работу SMM-щику в 2026 году"
slug: "kak-najti-rabotu-smm"
description: "Гайд по поиску работы в SMM"
publishedAt: "2026-05-10"
tags: ["SMM", "карьера"]
---
```

## Dependencies

### New packages
- `next-mdx-remote` — Server-side MDX rendering for articles (pin to specific version)
- `gray-matter` — Frontmatter parsing for MDX files (pin to specific version)
- `@playwright/test` — E2E testing

### Using existing (from project)
- `next` (14.2.35) — Framework, SSR, App Router
- `@prisma/client` — ORM for all DB queries
- `tailwindcss` (3.4) — Already installed, currently underutilized
- `tsx` — Running sync script
- `zod` (4.3) — Input validation for URL slugs (was unused, now activated)

### Remove (unused)
- `next-auth` — Not in MVP, never configured
- `node-cron` — Not used (cron via auto-sync.sh)

## Testing Strategy

**Feature size:** L

### Unit tests (co-located with implementation tasks)
- Tag keyword matching: correct tag IDs for given text, empty text, multi-tag match, case-insensitive Cyrillic, word boundary (no partial matches)
- Article frontmatter parsing: valid/invalid MDX, missing title, invalid date, empty body
- Slug validation: valid slugs pass, path traversal attempts rejected, too-long slugs rejected
- Post description cleaning: regex removes @mentions, disclaimers
- Statistics queries: correct COUNT by type
- Posts without description filtered out

### Integration tests
- Telegram sync + tag assignment: sync creates posts AND assigns correct tags via PostTag
- Article listing: MDX files in content/ directory are correctly parsed and listed
- Tag page data: `/vacancies/tag/smm` returns only posts with "SMM" tag
- Sitemap: contains entries for homepage, /vacancies, /resumes, /articles, tag pages, article pages

### E2E tests
- Critical path: Homepage → click filter chip → posts filtered → click vacancy → "Откликнуться" button has t.me/ href
- Responsive: viewport 375px → burger menu visible, no horizontal scroll (`scrollWidth <= clientWidth`), sidebar hidden
- SEO tag page: `/vacancies/tag/smm` → unique h1, meta title, posts list, SEO text block
- Theme toggle: click theme button → dark mode applied, transition ≥200ms, all text readable
- Articles: `/articles` → listing rendered → click article → MDX content with correct heading

## Agent Verification Plan

**Source:** user-spec "Как проверить" section.

### Verification approach

1. Build check: `npm run build` passes without errors
2. Homepage: `curl http://localhost:3000` → HTTP 200, HTML contains job cards
3. Search: Playwright — type "SMM" in search → results filtered by title/description/company
4. Filter: Playwright — click "SMM" chip → only posts with SMM tag shown
5. SEO tag page: `curl http://localhost:3000/vacancies/tag/smm` → HTTP 200, unique title, h1 contains "SMM"
6. "Откликнуться" button: Playwright — vacancy page has link with `href` starting with `https://t.me/`
7. Articles: `curl http://localhost:3000/articles` → HTTP 200, ≥10 articles listed
8. Article detail: `curl http://localhost:3000/articles/{slug}` → HTTP 200, MDX content rendered
9. Responsive: Playwright (viewport 375×667) → burger menu visible, no horizontal scroll
10. Sync + tags: `npm run sync` → new posts in DB with assigned tags
11. Statistics: Homepage sidebar shows numbers matching `SELECT COUNT(*) FROM "Post" WHERE status='published'`
12. Sitemap: `curl http://localhost:3000/sitemap.xml` → valid XML with tag pages and articles

### Tools required
- Playwright (E2E tests)
- curl (smoke checks)
- bash (DB queries via `npx prisma db execute`)

## Risks

| Risk | Mitigation |
|------|-----------|
| Tailwind migration is large (1359 lines CSS → utility classes across 10+ components) | Migrate in 2 sequential tasks (layout first, then content). Each task independently testable. |
| Tag keyword matching may produce false positives | Word boundary matching. Conservative keyword list. Review first batch manually. |
| Post slug conflicts with tag slug in /vacancies/ route | `/vacancies/tag/{tagSlug}` prefix separates namespaces (Decision 6). |
| .next/ directory ownership conflict (root prod vs claude dev) | Separate distDir or fix permissions. Documented in user-spec risks. |
| MDX XSS risk from arbitrary component rendering | Explicit component allowlist, no custom components (Decision 5). |
| Path traversal via article slug → filesystem | Slug validation + filename allowlist (Decision 5). |
| Telegram t.me/s/ rate limiting during sync | 30-min cron interval, graceful error handling. |
| Bot token exposure via cross-service .env reading | Log bot token source in sync script docs. Environment variable preferred in future. |

## User-Spec Deviations

- **SEO tag pages URL:** user-spec says `/vacancies/{tag-slug}`, tech-spec uses `/vacancies/tag/{tag-slug}`. Reason: avoiding route collision with existing `/vacancies/{post-slug}` (Decision 6). The SEO value is identical — the URL still contains the tag keyword. --> [APPROVED]

- **Remove unused packages:** user-spec doesn't mention this, tech-spec proposes removing `next-auth` and `node-cron`. Reason: dead dependencies add confusion and security surface. `zod` is kept and activated for input validation. --> [APPROVED]

- **Added: /resumes/tag/{tagSlug} pages** (not in user-spec, which only mentions /vacancies/{tag}). Reason: minimal extra effort, symmetric with vacancies, better UX for resume seekers. --> [APPROVED]

- **Articles "из БД" vs MDX:** user-spec acceptance criterion says "листинг статей из БД", but technical decision section says MDX files. Tech-spec follows MDX approach per user-spec technical decisions section. Existing Article Prisma model is unused in MVP. --> [INFORMATIONAL]

## Acceptance Criteria

Technical acceptance criteria (complement user-spec criteria):

- [ ] `npm run build` passes without errors or warnings
- [ ] Prisma migration applies cleanly: `npx prisma migrate deploy` succeeds
- [ ] All unit tests pass: `npm test` exits 0
- [ ] All E2E tests pass: `npx playwright test` exits 0
- [ ] Integration tests pass: sync assigns tags, sitemap valid
- [ ] No TypeScript errors: `npx tsc --noEmit` exits 0
- [ ] Lighthouse mobile score ≥ 80 for performance (homepage)
- [ ] No horizontal scroll at viewport 320px
- [ ] Dark mode: all text readable, theme transition ≥200ms
- [ ] globals.css reduced to <100 lines (CSS variables + minimal base styles only)
- [ ] All components use Tailwind classes — no custom CSS class selectors in JSX
- [ ] Articles pages functional with sample article (real ≥10 articles created post-launch by agent team: marketer → seo → writer)
- [ ] Security headers present (X-Frame-Options, X-Content-Type-Options)
- [ ] All URL slugs validated with zod before DB queries

## Implementation Tasks

### Wave 1 (независимые)

#### Task 1: Prisma Schema Update & Tag Seed
- **Description:** Extend Tag model with slug, seoTitle, seoDescription, seoText fields. Create migration. Write seed script to populate initial tags with SEO content. Write unit tests for slug generation.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor, test-reviewer
- **Verify-smoke:** `npx prisma migrate deploy` succeeds, `npx prisma db seed` populates tags, `npx prisma studio` shows Tag table with 17 rows
- **Files to modify:** `prisma/schema.prisma`, `prisma/seed.ts` (new)
- **Files to read:** `prisma/schema.prisma`, `scripts/sync-telegram.ts`

#### Task 2: Tailwind Configuration & Theme Setup
- **Description:** Configure Tailwind for the project: darkMode selector `[data-theme="dark"]`, extend theme with all CSS variables, set up responsive breakpoints. Add security headers to next.config.mjs. Add `transition-colors duration-200` base style for ≥200ms theme transitions.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor, test-reviewer
- **Verify-smoke:** Create test component with `dark:text-white` → class compiles correctly. `curl -I localhost:3000` → X-Frame-Options header present.
- **Files to modify:** `tailwind.config.ts`, `app/globals.css`, `next.config.mjs`
- **Files to read:** `app/globals.css` (current CSS vars), `components/HomePage.tsx` (theme toggle logic)

#### Task 3: MDX Articles Infrastructure
- **Description:** Set up next-mdx-remote + gray-matter for article rendering with security: explicit component allowlist (safe HTML elements only), slug validation via zod + filename allowlist to prevent path traversal. Create `lib/articles.ts`. Write unit tests for frontmatter parsing and slug validation.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor, test-reviewer
- **Verify-smoke:** `node -e "require('next-mdx-remote')"` succeeds, sample article parseable, path traversal slug rejected
- **Files to modify:** `package.json`, `lib/articles.ts` (new), `content/articles/sample.mdx` (new)
- **Files to read:** `app/layout.tsx`, `lib/posts.ts` (pattern reference)

### Wave 2 (зависит от Wave 1)

#### Task 4: Tailwind Migration — Layout, Navbar, Responsive
- **Description:** Migrate page layout grid, Navbar, HomePage, ListingPage, PageShell from custom CSS to Tailwind classes. Implement burger menu below md breakpoint. Remove layout/navbar CSS from globals.css. Depends on Task 2.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor, test-reviewer
- **Verify-user:** Open localhost:3000 at 375px width → burger menu visible, no horizontal scroll. Open at 1200px → full navbar.
- **Files to modify:** `components/Navbar.tsx`, `components/HomePage.tsx`, `components/ListingPage.tsx`, `components/PageShell.tsx`, `app/globals.css`
- **Files to read:** `app/globals.css`, `tailwind.config.ts`

#### Task 5: Tailwind Migration — Feed, Cards, Sidebars, Footer, PostDetail
- **Description:** Migrate Feed, JobCard, LeftSidebar, RightSidebar, Footer, PostDetail from custom CSS to Tailwind classes. Remove remaining component CSS from globals.css. After this task, globals.css should be <100 lines. Depends on Task 4 (sequential to avoid globals.css conflict).
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor, test-reviewer
- **Verify-user:** Open localhost:3000 → all components render correctly in light/dark mode, mobile/desktop.
- **Files to modify:** `components/feed/Feed.tsx`, `components/feed/JobCard.tsx`, `components/LeftSidebar.tsx`, `components/RightSidebar.tsx`, `components/Footer.tsx`, `components/PostDetail.tsx`, `app/globals.css`
- **Files to read:** `app/globals.css`, `tailwind.config.ts`

#### Task 6: Tag System — Sync, Data Layer, Backfill
- **Description:** Add keyword→tag mapping with word boundary matching and auto-assignment logic to sync-telegram.ts. Create lib/tags.ts with query functions. Update lib/posts.ts: include tags in FeedPost, filter out posts without description, remove mock data fallback. Add zod slug validation. Write unit tests for tag matching. Depends on Task 1.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor, test-reviewer
- **Verify-smoke:** `npm run sync` → posts have PostTag entries. `npx prisma studio` → PostTag table populated.
- **Files to modify:** `scripts/sync-telegram.ts`, `lib/tags.ts` (new), `lib/posts.ts`
- **Files to read:** `prisma/schema.prisma`, `scripts/sync-telegram.ts`

### Wave 3 (зависит от Wave 2)

#### Task 7: SEO Tag Pages, Dynamic Sidebar & Feed Filtering
- **Description:** Create /vacancies/tag/{tagSlug} with tag-filtered posts, unique meta, h1, SEO text. Replace text-based chip filtering in Feed with tag-based filtering. Make filter chips dynamic from DB. Update LeftSidebar with real DB statistics. Make RightSidebar categories dynamic with real counts, tags link to SEO pages. Depends on Tasks 5, 6.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor, test-reviewer
- **Verify-smoke:** `curl http://localhost:3000/vacancies/tag/smm` → 200, unique title. Homepage chips filter by tags. Sidebar stats match DB.
- **Files to modify:** `app/vacancies/tag/[tagSlug]/page.tsx` (new), `components/feed/Feed.tsx`, `components/LeftSidebar.tsx`, `components/RightSidebar.tsx`, `components/HomePage.tsx`, `components/ListingPage.tsx`
- **Files to read:** `lib/tags.ts`, `lib/posts.ts`, `app/vacancies/page.tsx`

#### Task 8: Articles Pages, Navbar/Footer Cleanup, Static Pages, Sitemap
- **Description:** Create /articles listing and /articles/{slug} detail pages. Create 1 sample MDX article for testing. Remove dead links from Navbar/Footer. Link "+ Разместить" to bot. Create /privacy, /terms pages. Create app/sitemap.ts. Depends on Tasks 3, 4. NOTE: Real articles (≥10) will be created separately by agent team (marketer → seo → writer) after the site is fully deployed.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor, test-reviewer
- **Verify-smoke:** `curl localhost:3000/articles` → 200, sample article listed. `curl localhost:3000/privacy` → 200. `curl localhost:3000/sitemap.xml` → valid XML. Navbar has 4 links.
- **Files to modify:** `app/articles/page.tsx` (new), `app/articles/[slug]/page.tsx` (new), `content/articles/sample.mdx` (new), `components/Navbar.tsx`, `components/Footer.tsx`, `app/privacy/page.tsx` (new), `app/terms/page.tsx` (new), `app/sitemap.ts` (new)
- **Files to read:** `lib/articles.ts`, `components/Navbar.tsx`, `components/Footer.tsx`

### Wave 4 (зависит от Wave 3)

#### Task 9: E2E & Integration Tests
- **Description:** Write E2E tests (Playwright): critical path, responsive, SEO tag page, theme toggle, articles flow. Write integration tests: sync + tag assignment, sitemap validation. This validates all feature work end-to-end.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor, test-reviewer
- **Verify-smoke:** `npx playwright test` → all pass. `npm test` → all pass.
- **Files to modify:** `tests/e2e/critical-path.spec.ts` (new), `tests/e2e/responsive.spec.ts` (new), `tests/e2e/articles.spec.ts` (new), `tests/integration/sync-tags.test.ts` (new), `tests/integration/sitemap.test.ts` (new), `playwright.config.ts` (new)
- **Files to read:** `scripts/sync-telegram.ts`, `app/page.tsx`, `app/sitemap.ts`

### Audit Wave

#### Task 10: Code Audit
- **Description:** Full-feature code quality audit. Read all source files created/modified in Tasks 1-9. Review for cross-component issues: duplicate Prisma queries, Tailwind class consistency, architectural patterns. Write audit report.
- **Skill:** code-reviewing
- **Reviewers:** none
- **Files to read:** All files modified in Tasks 1-9

#### Task 11: Security Audit
- **Description:** Full-feature security audit. Read all source files created/modified in Tasks 1-9. Verify: MDX component allowlist enforced, path traversal prevention in articles, slug validation on all routes, security headers present, no bot token in logs. Write audit report.
- **Skill:** security-auditor
- **Reviewers:** none
- **Files to read:** All files modified in Tasks 1-9

#### Task 12: Test Audit
- **Description:** Full-feature test quality audit. Read all test files from Tasks 1-9. Verify coverage of critical paths, meaningful assertions, test pyramid balance (unit > integration > E2E). Write audit report.
- **Skill:** test-master
- **Reviewers:** none
- **Files to read:** All test files created in Tasks 1-9

### Final Wave

#### Task 13: Pre-deploy QA
- **Description:** Acceptance testing: run all tests (unit, integration, E2E), verify all acceptance criteria from user-spec and tech-spec, check build succeeds, verify Lighthouse scores.
- **Skill:** pre-deploy-qa
- **Reviewers:** none

#### Task 14: Deploy & Post-deploy Verification
- **Description:** Push to main branch → CI/CD deploys to VPS. Run `npx prisma migrate deploy` on production. Verify PM2 restart, Nginx proxy, SSL. Post-deploy checks on d-pub.ru: homepage loads (200), SEO tag page works, articles page shows ≥10 articles, sitemap.xml valid, mobile responsive, dark mode works. Tools: curl, Playwright, bash.
- **Skill:** deploy-pipeline
- **Reviewers:** none
