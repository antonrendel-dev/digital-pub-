---
created: 2026-05-06
status: draft
branch: dev
size: L
---

# Tech Spec: Диджитал Паб — MVP

## Solution

Transform the existing Next.js 14 prototype into a production-ready MVP job board. The prototype has a working feed with PostgreSQL data, basic filtering (text search), and Telegram sync — but lacks responsive design, real tag system, articles, SEO pages, and has 1359 lines of custom CSS with zero media queries.

The implementation covers 5 major workstreams:

1. **Tailwind CSS migration** — Replace custom CSS with Tailwind utility classes (mobile-first). Keep CSS variables for theme colors, use Tailwind's `dark:` modifier with `[data-theme="dark"]` selector.

2. **Tag system** — Activate the existing Tag/PostTag M:N schema. Add `slug`, `seoTitle`, `seoDescription`, `seoText` fields to Tag model. Modify sync-telegram.ts to auto-assign tags via keyword mapping. Replace text-based filtering with tag-based queries.

3. **SEO tag pages** — Dynamic routes `/vacancies/{tag-slug}` and `/resumes/{tag-slug}` with posts filtered by Tag/PostTag relations. Unique meta tags, h1, and SEO text per tag page.

4. **Articles section** — MDX files in `content/articles/` processed by `next-mdx-remote`. Pages `/articles` (listing) and `/articles/{slug}` (detail). Batch deploy: agents commit 3-5 MDX files at once, build picks them all up.

5. **Infrastructure** — Navbar/footer cleanup, real DB statistics, privacy/terms pages, sitemap.xml, E2E and integration tests.

## Architecture

### What we're building/modifying

- **Prisma Schema** (`prisma/schema.prisma`) — Extend Tag model with SEO fields (slug, seoTitle, seoDescription, seoText). Add migration.
- **Sync Script** (`scripts/sync-telegram.ts`) — Add tag auto-assignment logic after post creation using keyword→tag mapping.
- **Tag Data Layer** (`lib/tags.ts`) — New module: queries for tags with post counts, tag lookup by slug, posts by tag.
- **Article Data Layer** (`lib/articles.ts`) — New module: read MDX files from `content/articles/`, parse frontmatter, render content.
- **Feed Component** (`components/feed/Feed.tsx`) — Replace text-based filtering with tag-based filtering. Receive tags with posts from server.
- **Layout Components** — Migrate all components from custom CSS classes to Tailwind utility classes: Navbar, LeftSidebar, RightSidebar, Footer, HomePage, ListingPage, PageShell, PostDetail, JobCard.
- **SEO Tag Pages** (`app/vacancies/[tagSlug]/page.tsx`, `app/resumes/[tagSlug]/page.tsx`) — New dynamic routes with tag-filtered posts and SEO content.
- **Articles Pages** (`app/articles/page.tsx`, `app/articles/[slug]/page.tsx`) — New routes for article listing and detail.
- **Static Pages** (`app/privacy/page.tsx`, `app/terms/page.tsx`) — Legal pages.
- **Sitemap** (`app/sitemap.ts`) — Dynamic sitemap generation.
- **Tailwind Config** (`tailwind.config.ts`) — Extended theme with project CSS variables, darkMode selector config.
- **Tests** — E2E (Playwright) and integration tests.

### How it works

**Tag assignment flow:**
Sync script fetches Telegram posts → saves post to DB → runs keyword matching against tag definitions → creates PostTag entries for matched tags → tags are immediately available for filtering and SEO pages.

**Tag-based filtering flow (main feed):**
Server component fetches published posts with their tags (Prisma `include: { tags: { include: { tag: true } } }`) → passes to Feed component → user clicks filter chip → client-side filters by tag name match against post's assigned tags (not text search).

**SEO tag page flow:**
User visits `/vacancies/smm` → Next.js resolves `[tagSlug]` param → server component queries Tag by slug → fetches posts via PostTag join → generates page with unique meta/title/h1 from Tag's SEO fields → renders post list + SEO text block at bottom.

**Article flow:**
MDX files in `content/articles/` with frontmatter (title, slug, description, publishedAt) → `lib/articles.ts` reads directory, parses frontmatter with `gray-matter`, renders with `next-mdx-remote` → `/articles` lists all published articles sorted by date → `/articles/{slug}` renders full MDX content.

**Responsive flow:**
Tailwind mobile-first approach: base styles = mobile (320px+), `md:` breakpoint (768px) = tablet/desktop with sidebars. Navbar collapses to burger menu below `md:`. Grid layout uses `grid-cols-1 md:grid-cols-[210px_1fr_220px]`.

### Shared resources

| Resource | Owner (creates) | Consumers | Instance count |
|----------|----------------|-----------|----------------|
| Prisma Client | `lib/prisma.ts` | All server components, sync script, lib/tags.ts, lib/posts.ts | 1 (singleton) |

## Decisions

### Decision 1: Tailwind darkMode via [data-theme] selector
**Decision:** Configure `darkMode: ['selector', '[data-theme="dark"]']` in Tailwind config. Keep existing `[data-theme]` attribute toggling in HomePage/ListingPage.
**Rationale:** Preserves the existing theme switching mechanism (localStorage + data attribute) while enabling Tailwind's `dark:` modifier. No refactoring of theme toggle logic needed. Supports US: "Dark/Light тема с анимированным переключением через Tailwind dark: модификатор".
**Alternatives considered:** `darkMode: 'class'` with `.dark` class — would require changing all theme toggle logic. `darkMode: 'media'` — no user control.

### Decision 2: CSS variables stay in globals.css, component styles move to Tailwind
**Decision:** Keep `:root` and `[data-theme='dark']` CSS variable blocks in globals.css (~60 lines). Remove all 1300+ lines of component CSS. Map CSS vars to Tailwind theme in config.
**Rationale:** CSS variables define the color palette centrally; Tailwind classes consume them. Best of both worlds — one place for color definitions, Tailwind for responsive/utility styling. Supports US: "Миграция стилей с кастомного CSS на Tailwind CSS".
**Alternatives considered:** Move all colors into Tailwind config directly — harder to maintain light/dark variants, loses the data-theme approach.

### Decision 3: Tag auto-assignment via keyword map in sync script
**Decision:** Define a `TAG_KEYWORDS` map in sync-telegram.ts: `{ "SMM": ["smm", "соцсети", "social media"], "SEO": ["seo", "поисковая оптимизация"], ... }`. After creating a post, match title+description against keywords, create PostTag entries. `[TECHNICAL]`
**Rationale:** Simple, deterministic, easy to extend. No ML or external API needed. Matches the existing sync architecture. Supports US: "Синхронизация из Telegram автоматически назначает теги постам при импорте".
**Alternatives considered:** LLM-based classification — overkill for MVP, adds latency and cost. Category model for grouping — doesn't replace per-post tags.

### Decision 4: Tag model extension for SEO pages
**Decision:** Add fields to Tag model: `slug` (String, unique), `seoTitle` (String?), `seoDescription` (String?), `seoText` (String?). Seed tags with SEO content via a seed script.
**Rationale:** Each SEO tag page needs unique meta title, description, and bottom text. Storing in the Tag model keeps everything in one place and makes it queryable. Supports US: "SEO-страницы по тегам с уникальным title, meta description, h1, SEO-текстом внизу".
**Alternatives considered:** MDX files per tag — unnecessary complexity for short SEO text. Hardcoded in page components — not scalable.

### Decision 5: MDX articles via next-mdx-remote (filesystem-based)
**Decision:** Articles stored as MDX files in `content/articles/` directory. Use `next-mdx-remote` for server-side rendering. Frontmatter parsed by `gray-matter`. No DB storage for articles in MVP.
**Rationale:** Agents commit MDX files to git → deploy picks up automatically. Batch deploy is naturally supported (commit 3-5 files at once). No API needed. Supports US: "Статьи хранятся как MDX-файлы в репо с поддержкой батчевого деплоя".
**Alternatives considered:** `@next/mdx` — requires file-based routing in `app/articles/`, less flexible. DB-stored articles — requires admin UI, not in MVP scope.

### Decision 6: Existing vacancy slug route conflicts with tag slug route
**Decision:** Use `/vacancies/tag/{tagSlug}` for SEO tag pages. Keep `/vacancies/{postSlug}` for individual vacancy pages. `[TECHNICAL]`
**Rationale:** Both tag slugs and post slugs share the `/vacancies/` namespace. Using a `/tag/` prefix avoids collision. Next.js can't distinguish two `[slug]` routes at the same level. Alternative: rename post detail to `/vacancy/{slug}` (singular) — but this breaks existing links.
**Alternatives considered:** Use catch-all `[...slug]` and detect type server-side — fragile, hard to maintain. Use query params `/vacancies?tag=smm` — poor SEO, not a separate indexable page.

### Decision 7: Remove "Войти" button, link "+ Разместить" to bot
**Decision:** Remove "Войти" button from Navbar (auth not in MVP). Change "+ Разместить" to link to `https://t.me/resume_vac_bot`. `[TECHNICAL]`
**Rationale:** User-spec explicitly excludes auth from MVP. The submit flow goes through Telegram bot. Supports US: "Кнопка «+ Разместить» в хэдере — ведёт на бота @resume_vac_bot".
**Alternatives considered:** Keep "Войти" as disabled — confusing for users.

### Decision 8: Navbar simplification — remove dead links
**Decision:** Remove Отзывы, Курсы, Полезное from Navbar. Keep: Главная, Вакансии, Резюме, Статьи. Same for Footer. `[TECHNICAL]`
**Rationale:** These pages don't exist and aren't in MVP scope. Dead links hurt UX and SEO. Supports US: "Навбар сокращён до 4 пунктов".

### Decision 9: Hide posts without description
**Decision:** Add `AND description IS NOT NULL AND description != ''` to all post queries in `lib/posts.ts`. `[TECHNICAL]`
**Rationale:** Posts without description provide no value to users. Supports US: "Посты без описания не показываются в ленте".

### Decision 10: FeedPost interface includes tags
**Decision:** Extend `FeedPost` interface with `tags: { id: number; name: string; slug: string }[]`. Prisma queries include tag relation.
**Rationale:** Tags needed for client-side filtering and display on cards. Supports US: "Фильтр-чипы на главной фильтруют ленту по тегам".
**Alternatives considered:** Separate API call for tags — unnecessary round trip when data is small.

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
- `next-mdx-remote` — Server-side MDX rendering for articles
- `gray-matter` — Frontmatter parsing for MDX files
- `@playwright/test` — E2E testing

### Using existing (from project)
- `next` (14.2.35) — Framework, SSR, App Router
- `@prisma/client` — ORM for all DB queries
- `tailwindcss` (3.4) — Already installed, currently underutilized
- `tsx` — Running sync script

### Remove (unused)
- `next-auth` — Not in MVP, never configured
- `node-cron` — Not used (cron via auto-sync.sh)
- `zod` — Not imported anywhere

## Testing Strategy

**Feature size:** L

### Unit tests
- Tag keyword matching logic: given post text, returns correct tag IDs
- Article frontmatter parsing: valid/invalid MDX files
- Slug generation for tags: Cyrillic transliteration correctness
- Post description cleaning: regex removes @mentions, disclaimers
- Statistics queries: correct COUNT by type

### Integration tests
- Telegram sync + tag assignment: sync creates posts AND assigns correct tags via PostTag
- Article listing: MDX files in content/ directory are correctly parsed and listed
- Tag page data: `/vacancies/tag/smm` returns only posts with "SMM" tag

### E2E tests
- Critical path: Homepage → click filter chip → posts filtered → click vacancy → "Откликнуться" button has t.me/ href
- Responsive: viewport 375px → burger menu visible, no horizontal scroll, sidebar hidden
- SEO tag page: `/vacancies/tag/smm` → unique h1, meta title, posts list, SEO text block
- Theme toggle: click theme button → dark mode applied, page readable

## Agent Verification Plan

**Source:** user-spec "Как проверить" section.

### Verification approach

1. Build check: `npm run build` passes without errors
2. Homepage: `curl http://localhost:3001` → HTTP 200, HTML contains job cards
3. Filter: Playwright — click "SMM" chip → only posts with SMM tag shown
4. SEO tag page: `curl http://localhost:3001/vacancies/tag/smm` → HTTP 200, unique title, h1 contains "SMM"
5. "Откликнуться" button: Playwright — vacancy page has link with `href` starting with `https://t.me/`
6. Articles: `curl http://localhost:3001/articles` → HTTP 200, article list rendered
7. Article detail: `curl http://localhost:3001/articles/{slug}` → HTTP 200, MDX content rendered
8. Responsive: Playwright (viewport 375×667) → burger menu visible, no horizontal scroll
9. Sync + tags: `npm run sync` → new posts in DB with assigned tags
10. Statistics: Homepage sidebar shows numbers matching `SELECT COUNT(*) FROM "Post" WHERE status='published'`

### Tools required
- Playwright (E2E tests)
- curl (smoke checks)
- bash (DB queries via `npx prisma db execute`)

## Risks

| Risk | Mitigation |
|------|-----------|
| Tailwind migration is large (1359 lines CSS → utility classes across 10+ components) | Migrate component by component. Each task is independently testable. Keep CSS vars for colors. |
| Tag keyword matching may produce false positives | Start with conservative keyword list. Review first batch of tagged posts manually. Easy to adjust mapping. |
| Post slug conflicts with tag slug in /vacancies/ route | Use `/vacancies/tag/{tagSlug}` prefix to separate namespaces (Decision 6). |
| .next/ directory ownership conflict (root prod vs claude dev) | Use separate `distDir` in next.config.mjs for dev, or fix permissions. Documented in user-spec risks. |
| MDX rendering performance with many articles | At MVP scale (10-20 articles) this is not an issue. next-mdx-remote supports caching. |
| Telegram t.me/s/ rate limiting during sync | Existing mitigation: 30-min cron interval, fallback to mock data. |

## User-Spec Deviations

- **SEO tag pages URL:** user-spec says `/vacancies/{tag-slug}`, tech-spec uses `/vacancies/tag/{tag-slug}`. Reason: avoiding route collision with existing `/vacancies/{post-slug}` (Decision 6). The SEO value is identical — the URL still contains the tag keyword. --> [PENDING USER APPROVAL]

- **Remove unused packages:** user-spec doesn't mention this, tech-spec proposes removing `next-auth`, `node-cron`, `zod`. Reason: dead dependencies add confusion and security surface. --> [PENDING USER APPROVAL]

## Acceptance Criteria

Technical acceptance criteria (complement user-spec criteria):

- [ ] `npm run build` passes without errors or warnings
- [ ] Prisma migration applies cleanly: `npx prisma migrate deploy` succeeds
- [ ] All unit tests pass: `npm test` exits 0
- [ ] All E2E tests pass: `npx playwright test` exits 0
- [ ] Integration test passes: sync script assigns tags correctly
- [ ] No TypeScript errors: `npx tsc --noEmit` exits 0
- [ ] Lighthouse mobile score ≥ 80 for performance (homepage)
- [ ] No horizontal scroll at viewport 320px
- [ ] Dark mode: all text readable, no contrast issues
- [ ] globals.css reduced to <100 lines (CSS variables + minimal base styles only)
- [ ] All components use Tailwind classes — no custom CSS class selectors in JSX

## Implementation Tasks

### Wave 1 (независимые)

#### Task 1: Prisma Schema Update & Tag Seed
- **Description:** Extend Tag model with slug, seoTitle, seoDescription, seoText fields. Create migration. Write seed script to populate initial tags with SEO content. This is the foundation for all tag-related features.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor, test-reviewer
- **Verify-smoke:** `npx prisma migrate deploy` succeeds, `npx prisma db seed` populates tags, `npx prisma studio` shows Tag table with 17 rows
- **Files to modify:** `prisma/schema.prisma`, `prisma/seed.ts` (new)
- **Files to read:** `prisma/schema.prisma`, `scripts/sync-telegram.ts`

#### Task 2: Tailwind Configuration & Theme Setup
- **Description:** Configure Tailwind for the project: darkMode selector, extend theme with all CSS variables, set up responsive breakpoints. Create base utility layer. This enables all subsequent Tailwind migration tasks.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, test-reviewer
- **Verify-smoke:** `npx tailwindcss --help` works, create test component with `dark:bg-red-500` → class compiles correctly
- **Files to modify:** `tailwind.config.ts`, `app/globals.css`
- **Files to read:** `app/globals.css` (current CSS vars), `components/HomePage.tsx` (theme toggle logic)

#### Task 3: MDX Articles Infrastructure
- **Description:** Set up next-mdx-remote + gray-matter for article rendering. Create `content/articles/` directory with one sample article. Create `lib/articles.ts` with functions to list and read articles. This enables the articles section without touching any existing code.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, test-reviewer
- **Verify-smoke:** `node -e "require('next-mdx-remote')"` succeeds, sample article parseable
- **Files to modify:** `package.json`, `lib/articles.ts` (new), `content/articles/sample.mdx` (new)
- **Files to read:** `app/layout.tsx`, `lib/posts.ts` (pattern reference)

### Wave 2 (зависит от Wave 1)

#### Task 4: Tailwind Migration — Layout, Navbar, Responsive
- **Description:** Migrate page layout grid, Navbar component, and responsive burger menu from custom CSS to Tailwind classes. Implement mobile-first responsive: burger menu below md, sidebar hidden below md. Remove corresponding CSS from globals.css. Depends on Task 2 (Tailwind config).
- **Skill:** code-writing
- **Reviewers:** code-reviewer, test-reviewer
- **Verify-user:** Open localhost:3001 at 375px width → burger menu visible, no horizontal scroll. Open at 1200px → full navbar with links.
- **Files to modify:** `components/Navbar.tsx`, `components/HomePage.tsx`, `components/ListingPage.tsx`, `components/PageShell.tsx`, `app/globals.css`
- **Files to read:** `app/globals.css` (CSS to remove), `tailwind.config.ts`

#### Task 5: Tailwind Migration — Feed, Cards, Sidebars, Footer
- **Description:** Migrate Feed, JobCard, LeftSidebar, RightSidebar, Footer, and PostDetail from custom CSS to Tailwind classes. Remove corresponding CSS from globals.css. After this task, globals.css should be <100 lines. Depends on Task 2 (Tailwind config).
- **Skill:** code-writing
- **Reviewers:** code-reviewer, test-reviewer
- **Verify-user:** Open localhost:3001 → all components render correctly in light/dark mode, mobile/desktop.
- **Files to modify:** `components/feed/Feed.tsx`, `components/feed/JobCard.tsx`, `components/LeftSidebar.tsx`, `components/RightSidebar.tsx`, `components/Footer.tsx`, `components/PostDetail.tsx`, `app/globals.css`
- **Files to read:** `app/globals.css` (CSS to remove), `tailwind.config.ts`

#### Task 6: Tag System — Sync Assignment & Data Layer
- **Description:** Add keyword→tag mapping and auto-assignment logic to sync-telegram.ts. Create lib/tags.ts with query functions (getTagsWithCounts, getTagBySlug, getPostsByTag). Update lib/posts.ts to include tags in FeedPost. Run backfill to tag existing posts. Depends on Task 1 (schema).
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor, test-reviewer
- **Verify-smoke:** `npm run sync` → check DB: posts have PostTag entries. `npx prisma studio` → PostTag table populated.
- **Files to modify:** `scripts/sync-telegram.ts`, `lib/tags.ts` (new), `lib/posts.ts`
- **Files to read:** `prisma/schema.prisma`, `scripts/sync-telegram.ts`

#### Task 7: Articles Section — Pages & Listing
- **Description:** Create /articles page (listing all published articles) and /articles/{slug} page (full MDX render). Add article links to RightSidebar (dynamic from filesystem). Depends on Task 3 (MDX infrastructure).
- **Skill:** code-writing
- **Reviewers:** code-reviewer, test-reviewer
- **Verify-smoke:** `curl http://localhost:3001/articles` → 200, article list. `curl http://localhost:3001/articles/sample` → 200, rendered content.
- **Files to modify:** `app/articles/page.tsx` (new), `app/articles/[slug]/page.tsx` (new), `components/RightSidebar.tsx`
- **Files to read:** `lib/articles.ts`, `components/PostDetail.tsx` (layout pattern), `app/vacancies/[slug]/page.tsx` (pattern)

### Wave 3 (зависит от Wave 2)

#### Task 8: SEO Tag Pages
- **Description:** Create dynamic route /vacancies/tag/{tagSlug} with tag-filtered posts, unique meta title/description, h1, and SEO text block. Same for /resumes/tag/{tagSlug}. Update RightSidebar tags to link to these pages instead of triggering client-side filters. Depends on Task 6 (tag data layer).
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor, test-reviewer
- **Verify-smoke:** `curl http://localhost:3001/vacancies/tag/smm` → 200, unique title "SMM вакансии", h1, SEO text block.
- **Files to modify:** `app/vacancies/tag/[tagSlug]/page.tsx` (new), `app/resumes/tag/[tagSlug]/page.tsx` (new), `components/RightSidebar.tsx`
- **Files to read:** `lib/tags.ts`, `app/vacancies/page.tsx` (pattern), `prisma/schema.prisma`

#### Task 9: Tag-Based Feed Filtering & Dynamic Sidebar
- **Description:** Replace text-based chip filtering in Feed with tag-based filtering (match against post.tags). Make filter chips dynamic from DB tags. Update LeftSidebar statistics to use real DB counts. Make RightSidebar categories dynamic with real counts. Depends on Task 6 (tags in FeedPost).
- **Skill:** code-writing
- **Reviewers:** code-reviewer, test-reviewer
- **Verify-smoke:** Homepage → click "SMM" chip → only posts with SMM tag shown. Sidebar numbers match DB counts.
- **Files to modify:** `components/feed/Feed.tsx`, `components/LeftSidebar.tsx`, `components/RightSidebar.tsx`, `components/HomePage.tsx`, `components/ListingPage.tsx`
- **Files to read:** `lib/tags.ts`, `lib/posts.ts`

#### Task 10: Navbar/Footer Cleanup, Privacy, Terms, Sitemap
- **Description:** Remove dead links (Отзывы, Курсы, Полезное) from Navbar and Footer. Link "+ Разместить" to @resume_vac_bot. Remove "Войти" button. Create /privacy and /terms pages with basic 152-ФЗ text. Create app/sitemap.ts for dynamic sitemap. Hide posts without description. Depends on Task 4 (Tailwind navbar).
- **Skill:** code-writing
- **Reviewers:** code-reviewer, security-auditor, test-reviewer
- **Verify-smoke:** `curl http://localhost:3001/privacy` → 200. `curl http://localhost:3001/sitemap.xml` → valid XML with all routes. Navbar has 4 links only.
- **Files to modify:** `components/Navbar.tsx`, `components/Footer.tsx`, `app/privacy/page.tsx` (new), `app/terms/page.tsx` (new), `app/sitemap.ts` (new), `lib/posts.ts`
- **Files to read:** `components/Navbar.tsx`, `components/Footer.tsx`

### Wave 4 (зависит от Wave 3)

#### Task 11: E2E & Integration Tests
- **Description:** Write E2E tests (Playwright): critical path (homepage → filter → vacancy → откликнуться), responsive (375px viewport, burger menu), SEO tag page, theme toggle. Write integration test: sync script + tag assignment. This validates all feature work end-to-end.
- **Skill:** code-writing
- **Reviewers:** code-reviewer, test-reviewer
- **Verify-smoke:** `npx playwright test` → all pass. `npm test` → all pass.
- **Files to modify:** `tests/e2e/critical-path.spec.ts` (new), `tests/e2e/responsive.spec.ts` (new), `tests/integration/sync-tags.test.ts` (new), `playwright.config.ts` (new)
- **Files to read:** `scripts/sync-telegram.ts`, `app/page.tsx`

### Audit Wave

#### Task 12: Code Audit
- **Description:** Full-feature code quality audit. Read all source files created/modified in this feature. Review holistically for cross-component issues: duplicate Prisma queries, shared resource compliance, Tailwind class consistency, architectural patterns. Write audit report.
- **Skill:** code-reviewing
- **Reviewers:** none

#### Task 13: Security Audit
- **Description:** Full-feature security audit. Read all source files created/modified in this feature. Analyze for OWASP Top 10 across all components: XSS in MDX rendering, SQL injection in tag queries, path traversal in article file reading, information disclosure. Write audit report.
- **Skill:** security-auditor
- **Reviewers:** none

#### Task 14: Test Audit
- **Description:** Full-feature test quality audit. Read all test files created in this feature. Verify coverage of critical paths, meaningful assertions, test pyramid balance (unit > integration > E2E). Write audit report.
- **Skill:** test-master
- **Reviewers:** none

### Final Wave

#### Task 15: Pre-deploy QA
- **Description:** Acceptance testing: run all tests (unit, integration, E2E), verify all acceptance criteria from user-spec and tech-spec, check build succeeds, verify Lighthouse scores.
- **Skill:** pre-deploy-qa
- **Reviewers:** none

#### Task 16: Deploy
- **Description:** Push to main branch → CI/CD deploys to VPS. Verify PM2 restart, Nginx proxy, SSL. Run `npx prisma migrate deploy` on production.
- **Skill:** deploy-pipeline
- **Reviewers:** none

#### Task 17: Post-deploy verification
- **Description:** Live environment verification on d-pub.ru:
  - Homepage loads → `curl https://d-pub.ru` returns 200 with job cards
  - SEO tag page → `curl https://d-pub.ru/vacancies/tag/smm` returns 200 with unique meta
  - Articles page → `curl https://d-pub.ru/articles` returns 200
  - Sitemap → `curl https://d-pub.ru/sitemap.xml` returns valid XML
  - Mobile responsive → Playwright on 375px viewport, no horizontal scroll
  - Dark mode → toggle works, all elements readable
  Tools: curl, Playwright, bash
- **Skill:** post-deploy-qa
- **Reviewers:** none
