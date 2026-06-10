# Architecture

## Tech Stack

| Layer         | Technology                                                 | Why                                                                                                               |
| ------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Framework     | Next.js 15 (App Router) + React 19                         | SSR for SEO + React frontend in one, ideal for a public content site                                              |
| Language      | TypeScript                                                 | Type safety, better DX with Prisma and Next.js                                                                    |
| Styling       | Tailwind CSS 3.4 + CSS variables                           | Utility-first для DRY, CSS vars централизуют light/dark theme palette                                             |
| Database      | PostgreSQL                                                 | Relational data model fits vacancies/resumes/tags/articles well                                                   |
| ORM           | Prisma                                                     | Simple migrations, auto-generated types, works great with Next.js                                                 |
| Articles      | MDX (`next-mdx-remote/rsc` + `remark-gfm` + `gray-matter`) | Файловые статьи в репозитории вместо БД — проще батч-деплой, версионирование через git                            |
| Validation    | zod                                                        | URL slug validation на всех dynamic routes (`/^[a-z0-9-_]{1,80}$/`)                                               |
| Hosting       | NetAngels shared (Passenger-like runner)                   | Перенос с Nuxt.cloud. См. deployment.md                                                                           |
| Telegram sync | `scripts/sync-telegram.ts` + `lib/tag-matcher.ts`          | Парсит `t.me/s/{channel}` HTML + Bot API для скачивания фото (forwardMessage trick). Авто-теггинг по keyword map. |

---

## Project Structure

```
/
├── app/                              # Next.js App Router pages
│   ├── page.tsx                      # Main feed (homepage, ISR revalidate=300)
│   ├── layout.tsx                    # Root layout, robots metadata, JsonLd schema
│   ├── sitemap.ts                    # Dynamic sitemap.xml (теги из БД)
│   ├── vacancies/
│   │   ├── page.tsx                  # Vacancies listing
│   │   └── [category]/page.tsx       # SEO category page + detail [slug] глубже
│   ├── resumes/
│   │   ├── page.tsx
│   │   └── tag/[tagSlug]/page.tsx    # SEO tag page для резюме
│   ├── articles/
│   │   ├── page.tsx                  # Article listing
│   │   └── [slug]/page.tsx           # MDX article rendering
│   ├── privacy/, terms/              # Legal static pages
│   └── api/                          # API routes (минимальные)
├── components/                       # UI (Tailwind classes)
│   ├── feed/                         # JobCard, TileCard, Feed
│   ├── PostDetail.tsx, JsonLd.tsx
│   ├── Navbar, Footer, *Sidebar      # Layout chrome
├── content/articles/                 # MDX files (10+ статей writer-агента)
├── lib/                              # Core logic
│   ├── prisma.ts                     # Prisma singleton
│   ├── posts.ts                      # Post queries (re-exports type & util)
│   ├── postUtils.ts                  # Pure types/utils (client-safe)
│   ├── tags.ts                       # Tag queries (_count для перфа)
│   ├── tag-matcher.ts                # matchTags + TAG_KEYWORDS (без side effects)
│   └── articles.ts                   # MDX reader + slug allowlist (path traversal protection)
├── scripts/sync-telegram.ts          # Telegram sync (cron via auto-sync.sh)
├── prisma/
│   ├── schema.prisma                 # Data model (Tag расширен SEO-полями)
│   ├── seed.ts                       # 17 тегов с SEO-контентом
│   └── migrations/
├── public/images/posts/              # Downloaded vacancy images
└── _files/                           # Sandbox/backups (gitignored)
```

---

## Key Dependencies

- `next@14.2.x` — framework, SSR, App Router, ISR
- `@prisma/client` + `prisma` — ORM and migrations
- `tailwindcss@3.4` — utility CSS (darkMode selector настроен, но `dark:*` классы не используются — тема через CSS vars; см. decisions log в `work/completed/digital-pub-mvp/`)
- `next-mdx-remote@5.0.0` + `gray-matter` + `remark-gfm` — MDX articles (remark-gfm критичен для markdown-таблиц, фикс hydration crash commit `038afbb`)
- `zod` — slug validation на всех dynamic routes
- `pg` — PostgreSQL driver (server-only; никогда не импортировать в client components — см. patterns.md)
- **Удалены из MVP:** `next-auth` (admin не в MVP), `node-cron` (cron внешний через auto-sync.sh)

---

## External Integrations

**Telegram (t.me/s/ public web)**

- Purpose: Scraping public channel posts for vacancies and resumes
- Auth method: None — public HTTP endpoint, no API key required
- Pattern: GET `https://t.me/s/{channel_username}` → parse HTML → extract post ID, text, date

---

## Data Flow

**Sync flow:** Внешний cron (`auto-sync.sh`) запускает `scripts/sync-telegram.ts` → парсит `t.me/s/{channel}` HTML → дедуп по `(telegram_message_id, channel_username)` → сохраняет посты сразу со статусом `published` (Decision 12: MVP без модерации) → `matchTags()` назначает теги по keyword map с word-boundary regex → backfill догоняет посты без тегов на каждом запуске.

**User submission flow:** MVP направляет на Telegram бота `@resume_vac_bot` (через кнопки «+ Разместить», ссылки в Footer). Веб-форма и admin-модерация — итерация 2.

**Read flow:** Server components тянут published posts из Postgres → ISR `revalidate=300` для главных страниц + tag/article страниц → client-side фильтрация чипов работает **по slug тега** (не по тексту, Decision 9) → пагинация «Показать ещё» по 10 штук.

---

## Backups

Бэкапы выполняются автоматически на стороне хостинга **NetAngels**, 3 раза в день.

- Покрывают: файлы сайта + PostgreSQL БД полностью
- Хранение и восстановление — через панель управления NetAngels
- Дополнительных настроек на уровне приложения не требуется

Git-история коммитов является дополнительным бэкапом кода (но не данных БД).

---

## Data Model

**Database:** PostgreSQL (hosted on VPS)

### Posts (vacancies and resumes in one table)

**Post**

- Purpose: Stores both vacancies and resumes
- Key fields: `id`, `type` (vacancy|resume), `title`, `slug` (auto от транслита title + числовой суффикс), `description`, `status` (pending|published|rejected), `source` (telegram|user), `telegram_message_id`, `channel_username`, `company` (всегда NULL в MVP, не парсится), `imageUrl`, `created_at`
- Relationships: `Post → PostTag (many-to-many)`

**Tag** (расширена SEO-полями)

- Purpose: Reusable tags (Удалённо, Senior, IT, etc.) + SEO-страницы
- Key fields: `id`, `name`, `slug` (unique), `tagType` (format|level|specialization), `seoTitle?`, `seoDescription?`, `seoText?`
- Initial set: 17 тегов через `prisma/seed.ts` (Удалёнка/Офис/Гибрид + 11 спец-тегов + Junior/Middle/Senior)

**Article** (НЕ в БД — оставлена пустой таблицей, не используется)

- В MVP статьи живут как MDX-файлы в `content/articles/` (Decision 5 — security via component allowlist + filename allowlist для path traversal)

### Key Constraints

- **Unique:** `(telegram_message_id, channel_username)` on Post — предотвращает дубли при sync
- **Required:** `Post.type`, `Post.title`, `Post.status` NOT NULL
- **Default:** `Post.source = 'telegram'`. `Post.status = 'published'` для sync-постов (Decision 12, MVP без модерации)
- **Filter:** `description: { not: null }` на всех читающих query (Decision 9: посты без описания не отображаются)

### Migration Strategy

**Tool:** Prisma Migrate

**Process:** Run `npx prisma migrate deploy` before each deploy if schema changed. Migrations live in `prisma/migrations/`. Never edit existing migration files.
