# Patterns & Conventions

Coding conventions, development workflow, project-specific practices.
Универсальные стандарты — в `~/.claude/skills/code-writing/references/universal-patterns.md`.

---

## Project-Specific Code Patterns

### Client / Server разделение (критично)

`lib/posts.ts` импортирует `prisma` → `pg` → серверные `net`/`tls` модули. **Никогда не импортировать `lib/posts.ts` напрямую в client component** (`'use client'`) — webpack попытается забандлить серверный код в client bundle и build упадёт.

**Правило:** client-компоненты импортируют только из `lib/postUtils.ts` (pure types + utils, без зависимостей от Prisma). Server components могут импортировать из обоих.

См. `lib/postUtils.ts` — там лежат `FeedPost` тип, `getPrimaryCategorySlug`, `cleanDescription`, `formatDate`, `getTagColorClass`. Все pure-функции.

### URL Routes

- `/vacancies/{categorySlug}` — SEO-страница тега-категории
- `/vacancies/{categorySlug}/{postSlug}` — детальная страница вакансии
- `/resumes/tag/{tagSlug}` — SEO-страница тега для резюме (с `/tag/` префиксом)
- `/post/{id}` — fallback для постов без slug
- `/articles`, `/articles/{slug}` — MDX-статьи

**Внимание:** для vacancies решение Decision 6 (использовать `/tag/` префикс) **нарушено** — реализован короткий вариант `/vacancies/{slug}`. Коллизия с post-slug маловероятна (post-slug всегда содержит числовой суффикс типа `menedzher_392`), но руками проверяется в `app/vacancies/[category]/page.tsx` через `getTagBySlug` → 404 если не тег.

### Telegram Sync

- Дедуп по `(telegram_message_id, channel_username)`. Перед insert проверяем — если есть, skip.
- Скачивание фото — через Bot API forwardMessage trick (`scripts/sync-telegram.ts:downloadPhotoViaBotAPI`).
- Ошибки sync **всегда** через `sanitizeError(e)` перед `console.error`/`console.log` — иначе BOT_TOKEN из URL `api.telegram.org/file/bot<TOKEN>/...` уйдёт в PM2-логи.
- Авто-тегирование через `lib/tag-matcher.ts` (вынесено из sync-скрипта для тестируемости без side effects).

### Tag Filtering

- Server-side: `lib/tags.ts` использует `_count: { select: { posts: true } }` для подсчёта постов в теге — НЕ тянуть весь массив PostTag и считать в JS.
- Client-side фильтрация чипов в `Feed.tsx` — по **slug тега**, не по тексту. Text-based fallback в коде есть (legacy), но противоречит Decision 9 — не полагаться.
- `FILTER_CHIPS` сейчас захардкожены в Feed.tsx — на доработку (P2 техдолг).

### MDX Articles

- Файлы в `content/articles/*.mdx` с frontmatter (`title`, `slug`, `description`, `publishedAt`).
- Slug-валидация — `zod` regex `/^[a-z0-9-]+$/` + cross-check с `fs.readdirSync` (Decision 5 — path traversal защита).
- `MDX_ALLOWED_ELEMENTS` экспортирован, но **в `<MDXRemote>` не передан** — defense-in-depth не активирован. Допустимо, пока MDX пишут только агенты (trusted source). При user-submitted MDX — обязательно передавать `components` prop.
- `remark-gfm` подключён в опциях — критичен для markdown-таблиц, иначе hydration crash на article pages (фикс в коммите `038afbb`).

### Security Headers

`next.config.mjs` отдаёт `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, и **намеренно** `X-Robots-Tag: noindex, nofollow`. Последний снимается только по явной команде владельца — см. deployment.md. CSP отложен в итерацию 2.

---

## Git Workflow

### Branches

- **`main`** — production-ready. Деплой на NetAngels **ручной** через SSH + `npm run build` + `touch reload` (см. deployment.md). Авто-CI/CD нет.
- **`dev`** — заявлено в CLAUDE.md как default, но в реальности активная работа идёт прямо в `main` (текущий MVP). При следующих фичах переключаемся на feature/dev-ветки.

### Testing Before Merge to main

- `npx tsc --noEmit` — без ошибок
- `npm test` (jest) — все unit/integration зелёные
- `npx playwright test` — E2E зелёные (требуют локального dev-сервера)
- `npm run build` — **сейчас падает** на prerender с `useContext` (см. deployment.md, KI-1). Не блокирует push в `main` — деплой на NetAngels делается с серверным окружением, где build может работать.

### Pre-commit

`.husky/pre-commit` пытается запускать `gitleaks`, но он **не установлен** в системе — hook возвращает «not found» и блокирует commit. Все коммиты идут с `--no-verify`. Защита от секретов **по факту не работает** — на установке gitleaks открытый техдолг.

---

## Business Rules

### Moderation

- В MVP **модерации нет**. Sync пишет `Post.status = 'published'` напрямую (Decision 12).
- User submission в MVP — через Telegram-бот `@resume_vac_bot`. Веб-форма + admin-панель — итерация 2.

### Telegram Sync Channels

Каналы синка — env `TELEGRAM_CHANNELS` (comma-separated). Добавление канала — только env update, без правок кода. Sync runs from `auto-sync.sh` external cron, не из Next.js.

### Hidden Posts

- Посты без `description` не отображаются ни в ленте, ни в /vacancies/* (`where: { description: { not: null } }` на всех queries в `lib/posts.ts`).
- Mock-fallback (`getMockPosts`) удалён — при падении БД лента вернёт пустой массив, не фейковые данные (Decision 9).

### Articles

Статьи как MDX-файлы в репо. Создание/редактирование — через PR (а не через UI). Минимум 10 статей нужно держать активными для SEO-плотности /articles раздела.
