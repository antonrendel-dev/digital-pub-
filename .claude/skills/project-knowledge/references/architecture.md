# Architecture

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR for SEO + React frontend in one, ideal for a public content site |
| Language | TypeScript | Type safety, better DX with Prisma and Next.js |
| Database | PostgreSQL | Relational data model fits vacancies/resumes/tags/articles well |
| ORM | Prisma | Simple migrations, auto-generated types, works great with Next.js |
| Auth (admin) | NextAuth.js | Easy admin login setup, no need for a separate auth service |
| Web server | Nginx | Reverse proxy in front of Next.js on VPS, handles SSL |
| Process manager | PM2 | Keeps Next.js running on VPS, auto-restart on crash |
| Telegram sync | Custom Node.js cron script | Parses t.me/s/{channel} HTML, saves to DB — fully independent from Вакансы bot |

---

## Project Structure

```
/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Main feed (homepage)
│   ├── vacancies/              # Vacancies section
│   ├── resumes/                # Resumes section
│   ├── articles/               # Articles section (SEO)
│   ├── admin/                  # Admin panel (protected routes)
│   └── api/                    # API routes (Next.js)
│       ├── sync/               # Telegram sync endpoint
│       └── submit/             # User submission handler
├── components/                 # Shared UI components
│   ├── feed/                   # Job/resume card, feed list
│   ├── filters/                # Tag chips, category sidebar
│   └── admin/                  # Admin panel components
├── lib/                        # Core logic
│   ├── db.ts                   # Prisma client singleton
│   ├── sync.ts                 # Telegram t.me/s/ parser
│   └── auth.ts                 # NextAuth config
├── prisma/
│   ├── schema.prisma           # Data model
│   └── migrations/             # DB migrations
├── public/                     # Static assets
├── .env.example                # Required env vars (no values)
└── .claude/                    # AI agent context
```

---

## Key Dependencies

- `next` — framework, SSR, routing, API routes
- `@prisma/client` + `prisma` — database ORM and migrations
- `next-auth` — admin authentication
- `node-cron` — scheduled Telegram sync (runs as a separate process or Next.js route)
- `zod` — input validation for submission form and API routes

---

## External Integrations

**Telegram (t.me/s/ public web)**
- Purpose: Scraping public channel posts for vacancies and resumes
- Auth method: None — public HTTP endpoint, no API key required
- Pattern: GET `https://t.me/s/{channel_username}` → parse HTML → extract post ID, text, date

---

## Data Flow

**Sync flow:** Cron job fetches `https://t.me/s/{channel}` → parses HTML for posts → deduplicates by Telegram message ID → saves new posts as `pending` vacancies/resumes to PostgreSQL → they appear in admin moderation queue.

**User submission flow:** User fills form on site → POST to `/api/submit` → saved as `pending` with `source=user` → admin reviews in panel → approve sets `status=published` → item appears in public feed.

**Read flow:** Next.js SSR fetches published vacancies/resumes from PostgreSQL → renders page with full HTML for SEO → client-side filtering by tags runs against already-loaded data.

---

## Data Model

**Database:** PostgreSQL (hosted on VPS)

### Posts (vacancies and resumes in one table)

**Post**
- Purpose: Stores both vacancies and resumes
- Key fields: `id`, `type` (vacancy|resume), `title`, `description`, `status` (pending|published|rejected), `source` (telegram|user), `telegram_message_id`, `channel_username`, `created_at`
- Relationships: `Post → PostTag (many-to-many)`

**Tag**
- Purpose: Reusable tags (Удалённо, Senior, IT, etc.)
- Key fields: `id`, `name`, `tag_type` (format|level|specialization)

**Category**
- Purpose: Main sections (Разработка, Маркетинг, etc.)
- Key fields: `id`, `name`, `slug`

**Article**
- Purpose: SEO articles managed via admin
- Key fields: `id`, `title`, `slug`, `content`, `published_at`

### Key Constraints

- **Unique:** `(telegram_message_id, channel_username)` on Post — prevents duplicate sync
- **Required:** `Post.type`, `Post.title`, `Post.status` are NOT NULL
- **Default:** `Post.status = 'pending'`, `Post.source = 'telegram'`

### Migration Strategy

**Tool:** Prisma Migrate

**Process:** Run `npx prisma migrate deploy` before each deploy if schema changed. Migrations live in `prisma/migrations/`. Never edit existing migration files.
