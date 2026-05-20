# Codex Handoff — Диджитал Паб (d-pub.ru)

> Дата: 2026-05-20. Состояние: после закрытия MVP, продакшн работает, build сломан.

---

## Цель проекта

Job board для digital-специалистов (IT, дизайн, маркетинг, аналитика, HR, финансы, продажи).  
Агрегирует вакансии и резюме из публичных Telegram-каналов. Контент структурирован по тегам (формат/уровень/специализация), индексируется поисковиками. Создание своих постов — через бота `@resume_vac_bot`.  
Статьи (MDX) — SEO-наполнение.

---

## Статус

| Что | Статус |
|---|---|
| Сайт https://d-pub.ru | **Работает** (прод стабилен) |
| `npm run build` | **Сломан** — P0, блокирует деплой новых изменений |
| Telegram sync (авто-парсинг каналов) | **Работает** (внешний cron + `auto-sync.sh`) |
| CI/CD | **Нет** — деплой только вручную по SSH |
| Git на prod-сервере | **Нет** — код на сервере вне git |
| Индексация поисковиками | **Намеренно закрыта** (`X-Robots-Tag: noindex`) — снимать только по команде |

---

## Что сделано (MVP закрыт 2026-05-13)

- Главная лента (вакансии + резюме, ISR revalidate=300)
- Разделы: `/vacancies`, `/resumes`, `/articles`
- Фильтрация по тегам (чипы, client-side по slug)
- SEO-страницы тегов с уникальными h1/meta/seoText
- Авто-синк из Telegram (`t.me/s/` HTML-парсинг + Bot API для фото)
- Авто-тегирование по keyword-map (`lib/tag-matcher.ts`)
- 10+ MDX-статей в `content/articles/`
- Поиск по title/description/company (client-side)
- Sitemap.xml dynamic, Schema.org, OG-теги
- Responsive + темная тема (через CSS vars, НЕ через `dark:` классы Tailwind)
- 17 тегов с SEO-контентом (`prisma/seed.ts`)

**Не в MVP (итерация 2):** веб-форма для постинга, admin-панель, модерация, CSP, user accounts.

---

## Стек

- **Next.js 14.2** (App Router, TypeScript)
- **PostgreSQL + Prisma** (ORM, миграции)
- **Tailwind CSS 3.4** + CSS переменные (темизация)
- **MDX** (`next-mdx-remote/rsc` + `remark-gfm`) — статьи как файлы в репо
- **zod** — slug-валидация на dynamic routes
- **Хостинг:** NetAngels shared, Node.js, порт 3001
- **Фронт-прокси:** `root@144.31.204.181` (SSL termination → NetAngels)

---

## Важные файлы

```
app/layout.tsx                 # Root layout, robots meta, JsonLd
app/page.tsx                   # Главная лента (ISR)
app/vacancies/[category]/      # SEO-страница тега + детальная вакансия
app/resumes/tag/[tagSlug]/     # SEO-страница тега для резюме
app/articles/[slug]/           # MDX рендер
app/sitemap.ts                 # Dynamic sitemap.xml

lib/posts.ts                   # Post-queries (server-only! не импортировать в client)
lib/postUtils.ts               # Pure types/utils (client-safe: FeedPost, getPrimaryCategorySlug, etc.)
lib/tags.ts                    # Tag-queries (с _count для перфа)
lib/tag-matcher.ts             # Авто-тегирование, без side effects

scripts/sync-telegram.ts       # Telegram sync (cron-скрипт)
prisma/schema.prisma           # Схема БД
prisma/seed.ts                 # 17 тегов с SEO-полями
content/articles/*.mdx         # Статьи (frontmatter: title, slug, description, publishedAt)
next.config.mjs                # Security headers + X-Robots-Tag (noindex — не менять!)
```

---

## Критические правила кода

1. **Никогда** не импортировать `lib/posts.ts` или `lib/prisma.ts` в `'use client'`-компоненты — webpack упадёт. Только `lib/postUtils.ts`.
2. Фильтрация тегов — по **slug**, не по тексту.
3. Ошибки Telegram sync — только через `sanitizeError(e)` перед логом (иначе BOT_TOKEN в логах).
4. `X-Robots-Tag: noindex` в `next.config.mjs` — **не снимать** без явной команды.
5. MDX slug-валидация через zod + `fs.readdirSync` allowlist (защита от path traversal).

---

## P0 — Сломанный build (главная задача)

### Симптом
```
TypeError: Cannot read properties of null (reading 'useContext')
  at usePathname() → auto-generated ErrorBoundary при prerender
```
Воспроизводится на dev-машине и на сервере. Все статические страницы падают.

### Что уже проверено и отвергнуто
- Node v20 vs v22 — не причина
- Откат к pre-refactor коммиту — не помогает
- `export const dynamic = 'force-dynamic'` на страницах — не помогает
- `global-error.tsx`, `pages/404.tsx`, `pages/500.tsx`, `_document.tsx` — не помогают
- Prisma: v7 → v6 downgrade, custom output, `serverComponentsExternalPackages` — не помогает
- Clean `node_modules` — не помогает

### Что известно точно
Clean-room Next 14.2.35 + React 18 + минимальный layout + page-стабы → build **проходит**. Значит виновник — **что-то в наших pages или layout**.

### План fix (бинарный поиск)

1. Установить baseline:
   - `prisma/schema.prisma` — убрать `output = "../generated/prisma"`, использовать `@prisma/client`
   - `lib/prisma.ts` — упростить до базового singleton без adapter/Pool
   - `npx prisma generate`
   - Все 9 pages заменить на `<div>name</div>` stub
   - `app/layout.tsx` — минимальный `<html><body>{children}</body></html>`
   - `npm run build` → должен пройти
2. Вернуть половину pages (/, /vacancies, /resumes, /articles) → build → определить половину с триггером
3. Сужать до одной страницы
4. Внутри страницы — закомментировать импорты по одному
5. Fix: `next/dynamic` с `ssr:false`, или `'use client'`, или `<Suspense>`

### После фикса — деплой
```bash
# Dev-машина (после NODE_ENV=development npm run build → exit 0):
rsync -avz --delete .next-dev/ c48127@91.201.52.231:~/d-pub.ru/app/.next/
# На сервере:
ssh c48127@91.201.52.231
cd ~/d-pub.ru/ && touch reload
# Smoke:
curl -sI https://d-pub.ru/ | head -3  # ожидаем 200 OK
```

**Важно:** `npm run build` на сервере **не запускать** — перезапишет рабочую `.next/` сломанной.

---

## Остальные открытые проблемы

| Приоритет | Проблема |
|---|---|
| P1 | Telegram → сайт sync сломан после переезда хостинга. Цепочка: бот шлёт → API принимает? → БД пишется? → фронт читает? Нужна диагностика. |
| P2 | Git отсутствует на prod-сервере (`~/d-pub.ru/app/.git` нет). Deploy pipeline не настроен — rsync установлен, но не автоматизирован. |
| P2 | `gitleaks` не установлен — pre-commit hook не работает, все коммиты идут с `--no-verify`. |
| P2 | Битые ссылки после смены хостинга — нужен аудит. |
| P3 | `FILTER_CHIPS` захардкожены в `Feed.tsx` — на рефакторинг. |
| P3 | `MDX_ALLOWED_ELEMENTS` не передан в `<MDXRemote components>` — defense-in-depth не активирован. |

---

## Доступы

| Ресурс | Адрес |
|---|---|
| App-сервер | `ssh c48127@91.201.52.231` → `~/d-pub.ru/` |
| Фронт-прокси | `ssh root@144.31.204.181` |
| БД | env `DB_CONNECTION_STRING` на app-сервере (не `DATABASE_URL`) |
| Сайт | https://d-pub.ru |

---

## Итерация 2 (после фикса build)

1. Admin-панель + очередь модерации
2. Веб-форма для постинга (вакансии/резюме)
3. Настройка нормального deploy pipeline (git на сервере или rsync-хук)
4. CSP заголовки
5. Снятие noindex (после готовности к публичному онлайну)
