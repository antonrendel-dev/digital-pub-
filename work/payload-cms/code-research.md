# Code Research: Payload CMS v3 Integration Planning

**Дата**: 25 мая 2026  
**Проект**: Digital Pub (d-pub.ru)  
**Версия Next.js**: 14.2.35  
**Версия React**: 18  
**БД**: PostgreSQL через Prisma ORM

---

## 1. Next.js конфигурация

### Файл: `/home/claude/projects/digital-pub-/next.config.mjs`

**Текущая конфигурация:**

- **distDir**: переменная окружения `NEXT_DIST_DIR` или `.next` (стандартное значение)
- **Image domains** (remotePatterns):
  - `https://cdn4.telesco.pe`
  - `https://*.telesco.pe` (wildcard)

**CSP headers** (Content-Security-Policy):

- `default-src 'self'`
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` + yandex.\*, arsenkin.ru
- `style-src 'self' 'unsafe-inline'` + fonts.googleapis.com
- `font-src 'self'` + fonts.gstatic.com
- `img-src 'self' data: blob:` + yandex._, _.telesco.pe
- `frame-ancestors 'none'`

**Риски конфликтов с Payload v3:**

- Payload v3 требует Next.js 15+ (текущий 14.2.35 — нужна миграция)
- CSP с `unsafe-inline` и `unsafe-eval` может быть проблемой для Payload админ-панели (обычно требует дополнительных скриптов)
- Payload может потребовать расширения `remotePatterns` для своих ассетов и медиа-сервера
- **Решение**: обновить Next.js до 15, расширить CSP для `/admin` маршрута

---

## 2. Prisma схема

### Файл: `/home/claude/projects/digital-pub-/prisma/schema.prisma`

**Текущие модели:**

#### **Post**

```prisma
model Post {
  id                  Int        @id @default(autoincrement())
  type                PostType   (vacancy | resume)
  title               String
  slug                String?    @unique
  description         String?
  company             String?
  salary              String?
  status              PostStatus (pending | published | rejected)
  source              PostSource (telegram | user)
  imageUrl            String?
  telegramMessageId   String?
  channelUsername     String?
  categoryId          Int?
  category            Category?  @relation(fields: [categoryId])
  tags                PostTag[]
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt

  @@unique([telegramMessageId, channelUsername])
}
```

#### **Tag**

```prisma
model Tag {
  id              Int       @id @default(autoincrement())
  name            String    @unique
  slug            String    @unique
  tagType         TagType   (format | level | specialization)
  seoTitle        String?
  seoDescription  String?
  seoText         String?
  posts           PostTag[]
}
```

#### **PostTag** (many-to-many)

```prisma
model PostTag {
  postId Int
  tagId  Int
  post   Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
}
```

#### **Category**

```prisma
model Category {
  id    Int    @id @default(autoincrement())
  name  String @unique
  slug  String @unique
  posts Post[]
}
```

#### **Article**

```prisma
model Article {
  id          Int       @id @default(autoincrement())
  title       String
  slug        String    @unique
  content     String
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

**Риски и стратегия миграции:**

1. **Payload будет использовать свою схему** (Database Strategy)
   - Рекомендуется параллельная БД для Payload (отдельный DATABASE_URL или схема PostgreSQL)
   - Текущие Post, Tag, PostTag, Category, Article можно оставить или мигрировать в Payload Collections
2. **Критические поля для миграции**:
   - `Post` → Payload Collection "Vacancy" и "Resume" (разделённые Collection или одна с полем type)
   - `Tag` → Payload Collection "Tag" с типизацией (tagType enum)
   - `Article` → Payload Collection "Article" (заменит MDX файлы)
   - `Category` → может остаться в Prisma или стать Payload Collection
3. **SEO-данные**:
   - `Tag` уже содержит `seoTitle`, `seoDescription`, `seoText` — готовы к миграции в Payload Global "SEO"
   - `Article.content` хранится как строка — в Payload это будет Rich Text Field

4. **Стратегия переходного периода**:
   - Фаза 1: Payload для Articles (мигрировать из MDX)
   - Фаза 2: Payload для Tags с SEO данными (Global Settings)
   - Фаза 3: Posts → Vacancies и Resumes Collections
   - Фаза 4: Запустить ISR invalidation при обновлении в Payload

---

## 3. App Router маршруты

### Текущая структура:

```
/                              (index/home) — force-dynamic
/vacancies                     (main listing) — force-dynamic
  /[category]                  (category listing) — revalidate: 300
    /[slug]                    (post detail) — revalidate: 300
/resumes                       (main listing) — force-dynamic
  /tag/[tagSlug]               (tag filter) — НЕ НАЙДЕН (только в коде)
/articles                      (listing) — статический
  /[slug]                      (article detail) — revalidate: 300
/post/[id]                     (legacy route?) — НЕ НАЙДЕН
/privacy                       (static page)
/terms                         (static page)
/sitemap.ts                    (force-dynamic)
```

### Файлы маршрутов:

1. **`/app/page.tsx`** — force-dynamic, получает Post, Stats, Tags, Articles
2. **`/app/vacancies/page.tsx`** — force-dynamic, пагинация, SearchParams
3. **`/app/vacancies/[category]/page.tsx`** — revalidate: 300
4. **`/app/vacancies/[category]/[slug]/page.tsx`** — revalidate: 300, generateMetadata
5. **`/app/resumes/page.tsx`** — force-dynamic, пагинация
6. **`/app/resumes/tag/[tagSlug]/page.tsx`** — НЕ найден в файловой системе
7. **`/app/articles/page.tsx`** — статический, getArticles()
8. **`/app/articles/[slug]/page.tsx`** — revalidate: 300, MDXRemote

**Важно для Payload:**

- **Нет `/admin` маршрута** — Payload добавит `/admin/*` для CMS UI
- **Нет API роутов** — Payload создаст `/api/payload/*` для REST/GraphQL
- **ISR revalidate пути** для Payload invalidation:
  - `/` (home)
  - `/vacancies` + `/vacancies?page=*`
  - `/vacancies/[category]` + `/vacancies/[category]?page=*`
  - `/vacancies/[category]/[slug]`
  - `/resumes` + `/resumes?page=*`
  - `/articles`
  - `/articles/[slug]`

---

## 4. Глобальные компоненты (Globals в Payload)

### **Navbar** (`/home/claude/projects/digital-pub-/components/Navbar.tsx`)

- **Client Component** ('use client')
- Состояние: поиск, мобильное меню, тема
- **Хардкод**:
  - Логотип `/logo.png`
  - Ссылки на соцсети (Telegram, Макс, ВК, ТГ бот)
  - Слоган "Место, где встречаются хорошие люди"
- **Для Payload**: можно вынести в Global "Navigation" с редактируемыми ссылками и слоганом

### **Footer** (`/home/claude/projects/digital-pub-/components/Footer.tsx`)

- **Server Component**
- Хардкод:
  - Соцсети (ссылки)
  - Контакты работодателей (Telegram бот)
  - Политика конфиденциальности и условия
  - Копирайт с текущим годом
- **Для Payload**: Global "Footer" с редактируемыми ссылками, соцсетями, текстом

### **LeftSidebar** (`/home/claude/projects/digital-pub-/components/LeftSidebar.tsx`)

- **Client Component**
- Получает `stats: { vacancyCount, resumeCount, companyCount, newToday }`
- Из `/lib/config.ts` получает `SOCIAL_CHANNELS` (подписчики, ссылки)
- **Для Payload**:
  - `SOCIAL_CHANNELS` → Global "SocialChannels" (обновляемо в CMS)
  - Stats динамически из Payload API (count вакансий/резюме)

### **RightSidebar** (`/home/claude/projects/digital-pub-/components/RightSidebar.tsx`)

- **Server Component**
- Получает `tags: TagData[]` и `articles: { title, slug, date }[]`
- **Для Payload**:
  - Tags из Payload Collection (через API в query)
  - Articles из Payload Collection (вместо MDX файлов)

### **TagsSidebar** (`/home/claude/projects/digital-pub-/components/TagsSidebar.tsx`)

- **Server Component**
- Получает массив `TagData[]` с фильтром по типам (specialization, format, level)
- Из конфига `TAG_TYPE_LABELS` (Payload Global может заменить)
- **Для Payload**: данные tags из Collection, лейблы в Global settings

### **MetrikaHit** (`/home/claude/projects/digital-pub-/components/MetrikaHit.tsx`)

- Простой component для Yandex Metrika
- ID из `NEXT_PUBLIC_YANDEX_METRIKA_ID` (env var)

---

## 5. Статьи (Articles)

### **Текущая система: MDX файлы**

**Папка**: `/home/claude/projects/digital-pub-/content/articles/`  
**Количество**: 10 статей `.mdx` файлов (328 KB всего)  
**Примеры**:

- `seo-specialist-2026-navyki-zarplata.mdx`
- `professiya-veb-analitik-2026.mdx`
- `hr-menedzher-digital-agentstvo-najm.mdx`
- и еще 7 статей

### **Структура Frontmatter:**

```yaml
title: 'SEO-специалист в 2026 году...'
slug: 'seo-specialist-2026-navyki-zarplata'
description: 'Полный обзор профессии SEO-специалиста...'
metaTitle: 'SEO-специалист в 2026 — навыки, зарплата, карьера'
metaDescription: 'Всё о профессии SEO-специалиста в 2026 году...'
publishedAt: '2026-05-08'
tags: ['SEO', 'карьера', 'зарплата', 'навыки', 'вакансии']
```

### **Реализация в коде** (`/lib/articles.ts`):

- `getArticles()` — читает все `.mdx` из папки, парсит frontmatter через `gray-matter`
- `getArticleBySlug(slug)` — читает одну статью с контентом
- `formatArticleDate()` — форматирует дату для дисплея
- Валидация через Zod schema
- **MDX рендеринг**: `next-mdx-remote` с `remarkGfm` для GFM синтаксиса
- **Безопасность**: только разрешённые HTML элементы (h1-h6, p, a, img, code, table и т.д.)
- Блокировка `<script>`, `<iframe>`, `<style>`, `<form>` через `mdxComponents`

### **Маршруты статей**:

- `/articles` — listing всех статей (статический, no revalidate)
- `/articles/[slug]` — detail page (revalidate: 300, ISR)

**Генерация метаданных**: вручную из frontmatter

### **Миграция в Payload:**

1. **Payload Collection "Article"** с полями:
   - `title` (Text)
   - `slug` (Slug, уникальный)
   - `description` (Textarea или RichText)
   - `metaTitle` (Text)
   - `metaDescription` (Textarea)
   - `publishedAt` (Date)
   - `tags` (Array или Relationship)
   - `content` (RichText Editor — вместо MDX)

2. **Миграция данных**:
   - Парсить 10 `.mdx` файлов
   - Извлечь frontmatter + content
   - Загрузить в Payload Collection через API или script

3. **Изменения в app:**
   - Удалить `gray-matter`, `next-mdx-remote`, `remark-gfm` из dependencies
   - Заменить `getArticles()` на запрос к Payload API
   - Заменить `getArticleBySlug()` на запрос к Payload API с filters
   - Изменить рендеринг с `<MDXRemote>` на Payload Rich Text Serializer

---

## 6. Deploy конфигурация

### **Файл**: `/home/claude/projects/digital-pub-/.github/workflows/deploy.yml`

**Процесс деплоя:**

```yaml
1. Checkout кода
2. Setup Node.js 22 (npm cache)
3. npm ci (install dependencies)
4. npx prisma generate — генерирует Prisma Client
5. npm run build — сборка Next.js
6. Генерирует SSH ключ для доступа на сервер
7. rsync -avz --delete .next/ → ~/d-pub.ru/app/.next/
8. rsync -avz generated/prisma/ → ~/d-pub.ru/app/generated/prisma/
9. rsync -avz lib/ → ~/d-pub.ru/app/lib/
10. rsync -avz public/ → ~/d-pub.ru/app/public/
11. ssh touch ~/d-pub.ru/reload — перезагрузка приложения
```

**Ключевые параметры:**

- `--delete` в rsync для .next/ — **очищает старые файлы**, безопасно для кода
- **БЕЗ `--delete`** для prisma/, lib/, public/ — сохраняет рукописные изменения
- **Timeout**: 15 минут
- **Env vars**:
  - `DATABASE_URL` (из secrets)
  - `NEXT_PUBLIC_YANDEX_METRIKA_ID` (из secrets)

**Риски с Payload:**

- Payload может создать `/public/uploads/` для медиа-файлов — **--delete уничтожит их!**
- **Решение 1**: Payload должна хранить медиа на отдельном S3 (AWS, DigitalOcean Spaces, Cloudinary)
- **Решение 2**: Если локально, исключить uploads из rsync через `--exclude`
- Payload может требовать дополнительных env vars (`PAYLOAD_SECRET`, `PAYLOAD_PUBLIC_URL`)

**Вывод**: Deploy скрипт нужно обновить:

1. Добавить env vars для Payload
2. Защитить `/public/uploads/` от удаления (если локальное хранилище)
3. Лучше: настроить S3 storage для Payload

---

## 7. ISR и Revalidation

### **Текущая реализация:**

| Маршрут                        | Dynamic       | revalidate   | Пояснение                        |
| ------------------------------ | ------------- | ------------ | -------------------------------- |
| `/`                            | force-dynamic | —            | Свежие vacancies, stats          |
| `/vacancies`                   | force-dynamic | —            | Меняется часто                   |
| `/vacancies/[category]`        | —             | 300s (5 мин) | ISR: обновление каждые 5 мин     |
| `/vacancies/[category]/[slug]` | —             | 300s         | ISR: fresh post detail           |
| `/resumes`                     | force-dynamic | —            | Меняется часто                   |
| `/resumes/tag/[tagSlug]`       | ?             | ?            | **Не найден маршрут**            |
| `/articles`                    | —             | —            | **Статический** (нет revalidate) |
| `/articles/[slug]`             | —             | 300s         | ISR                              |
| `/sitemap.ts`                  | force-dynamic | —            | Dynamic sitemap                  |

**Проблемы:**

1. `/articles/page.tsx` не имеет `revalidate` — статический, не обновляется
2. `/resumes/tag/[tagSlug]` — маршрут есть в коде, но не в файловой системе

### **Для Payload v3:**

Когда контент обновляется в админ-панели Payload, нужно вызвать `revalidatePath()`:

```typescript
// В Payload hook или API endpoint
import { revalidatePath } from 'next/cache'

// При обновлении Article
revalidatePath('/articles', 'layout') // все articles
revalidatePath('/articles/[slug]', 'layout') // динамические

// При обновлении Vacancy
revalidatePath('/vacancies', 'layout')
revalidatePath('/vacancies/[category]/[slug]', 'layout')

// При обновлении Tags (globals)
revalidatePath('/vacancies', 'layout')
revalidatePath('/resumes', 'layout')
revalidatePath('/', 'layout')
```

**Payload hooks** для automation:

```typescript
// payload.config.ts
export default buildConfig({
  collections: [
    {
      slug: 'articles',
      hooks: {
        afterChange: [
          async ({ doc }) => {
            // ISR trigger
            await fetch(process.env.NEXT_PUBLIC_URL + '/api/revalidate', {
              method: 'POST',
              headers: { 'x-revalidate-secret': process.env.REVALIDATE_SECRET },
              body: JSON.stringify({ paths: ['/articles', `/articles/${doc.slug}`] }),
            })
          },
        ],
      },
    },
  ],
})
```

---

## 8. Package.json и зависимости

### **Текущие версии:**

```json
{
  "next": "14.2.35", // ← ТРЕБУЕТСЯ ОБНОВЛЕНИЕ на 15.x
  "react": "^18", // ← Payload v3 требует React 19
  "@prisma/client": "^7.6.0",
  "prisma": "^7.6.0",
  "next-mdx-remote": "5.0.0", // ← УДАЛИТСЯ при миграции articles
  "gray-matter": "4.0.3", // ← УДАЛИТСЯ
  "remark-gfm": "^4.0.1", // ← УДАЛИТСЯ
  "pg": "^8.20.0",
  "zod": "^4.3.6",
  "typescript": "^5"
}
```

### **Конфликты с Payload v3:**

1. **Версия Next.js**:
   - Текущая: 14.2.35
   - Требуется: 15.x+ (для Payload v3)
   - **План**: миграция Next.js 14 → 15 (может потребовать обновление React)

2. **Версия React**:
   - Текущая: 18
   - Требуется для Payload v3: 19
   - **План**: обновить React 18 → 19

3. **MDX библиотеки**:
   - После миграции Articles в Payload CMS, можно удалить `next-mdx-remote`, `gray-matter`, `remark-gfm`
   - Используются только для articles, которые станут Payload Collection

4. **Payload зависимости**:
   - `payload` (main)
   - `@payloadcms/db-postgres` (для PostgreSQL)
   - `@payloadcms/richtext-lexical` (Rich Text Editor)
   - Возможно: `@payloadcms/plugin-seo`, `@payloadcms/plugin-redirects`

### **Обновлённый package.json:**

```json
{
  "next": "15.x", // UPDATED
  "react": "^19", // UPDATED
  "payload": "^3.x", // NEW
  "@payloadcms/db-postgres": "^1.x", // NEW
  "@payloadcms/richtext-lexical": "^1.x", // NEW
  "@prisma/client": "^7.6.0", // KEEP (если нужна, для legacy)
  "prisma": "^7.6.0", // KEEP
  "pg": "^8.20.0", // KEEP
  "zod": "^4.3.6", // KEEP
  "typescript": "^5" // KEEP
}
```

---

## 9. Переменные окружения

### **Текущие ENV vars** (из `.env.example`):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/digital_pub

# NextAuth (есть в .env.example, но не используется в коде!)
NEXTAUTH_SECRET=your-random-secret-here
NEXTAUTH_URL=https://d-pub.ru

# Admin credentials (в .env.example, но не используется)
ADMIN_EMAIL=admin@d-pub.ru
ADMIN_PASSWORD_HASH=bcrypt-hash-of-your-password

# Telegram sync (упоминается, но не найдено в коде)
TELEGRAM_CHANNELS=web_vacancy,digital_pub
SYNC_INTERVAL_MINUTES=10
```

### **Используемые в коде:**

- `process.env.DATABASE_URL` или `DB_CONNECTION_STRING` (Prisma)
- `process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID`
- `process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `process.env.NEXT_PUBLIC_YANDEX_VERIFICATION`
- `process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION`
- `process.env.NODE_ENV`

### **Для Payload v3:**

Нужно добавить:

```env
# Payload CMS
PAYLOAD_SECRET=<random-256-bit-secret>                    # Для JWT
PAYLOAD_PUBLIC_URL=https://d-pub.ru                       # Domain для админ-панели
PAYLOAD_DATABASE_URI=postgresql://...                     # Может быть отличной от Next.js
DATABASE_URL=postgresql://...                             # Для Payload postgres adapter

# Optional: Storage
# PAYLOAD_AWS_S3_BUCKET=...
# PAYLOAD_AWS_S3_REGION=...
# PAYLOAD_AWS_ACCESS_KEY_ID=...
# PAYLOAD_AWS_SECRET_ACCESS_KEY=...

# API Key для revalidation
REVALIDATE_SECRET=<random-string>                          # Для /api/revalidate endpoint

# Payload admin user
PAYLOAD_ADMIN_EMAIL=admin@d-pub.ru
PAYLOAD_ADMIN_PASSWORD=<secure-password>                   # При первом запуске seed
```

### **Рекомендация:**

- Использовать **ONE DATABASE_URL** для Payload и Prisma (одна схема PostgreSQL)
- Или **TWO DATABASE** если планируется параллельная миграция
- Хранить secrets в GitHub Actions secrets (deploy.yml)

---

## 10. Root Layout и HTML структура

### **Файл**: `/home/claude/projects/digital-pub-/app/layout.tsx`

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <head>
        <script type="application/ld+json" ... />
      </head>
      <body>
        {children}
        {/* Yandex.Metrika Script */}
        {/* Google Analytics Script */}
      </body>
    </html>
  )
}
```

**Ключевые атрибуты:**

- `lang="ru"` — язык
- `className={inter.variable}` — Tailwind font variable
- Schema.org WebSite JSON-LD в `<head>`
- Аналитика в `<body>` (Suspense для Metrika)

**Возможные конфликты с Payload:**

1. **Payload админ-панель** (`/admin/*`) будет иметь собственный Layout
   - Может быть отдельная папка `/app/admin/layout.tsx`
   - Или Payload управляет своей HTML структурой

2. **Middleware для auth**:
   - Payload требует middleware для защиты `/admin` роутов
   - Нужно добавить `middleware.ts` в root проекта

3. **CSS конфликты**:
   - Payload может иметь собственный CSS (обычно scoped или BEM)
   - Tailwind может конфликтовать (решается Tailwind config)

**Решение**:

- Создать отдельный `/app/admin/layout.tsx` для Payload
- Или оставить Payload layout как есть (Payload handles it)
- Добавить `/middleware.ts` для redirects и auth checks

---

## 11. Сводка критических путей и компонентов

### **Роуты для ISR invalidation:**

```
/                                    HOME (force-dynamic) → revalidate при: vacancies, stats, articles updates
/vacancies                           LISTING (force-dynamic) → revalidate при: post changes
/vacancies/[category]                CATEGORY (revalidate: 300)
/vacancies/[category]/[slug]         POST DETAIL (revalidate: 300)
/resumes                             LISTING (force-dynamic)
/resumes/tag/[tagSlug]              TAG FILTER — НЕ НАЙДЕН
/articles                            LISTING (static) → ДОЛЖНА БЫТЬ revalidate!
/articles/[slug]                     DETAIL (revalidate: 300)
/privacy                             STATIC
/terms                               STATIC
```

### **Prisma модели для миграции:**

- `Post` → Payload Collections: "Vacancy" и "Resume"
- `Tag` → Payload Collection: "Tag"
- `Category` → Payload Collection: "Category" ИЛИ оставить в Prisma
- `Article` → Payload Collection: "Article" (заменит MDX)

### **Globals для Payload:**

- Navigation (Navbar links, CTAs)
- Footer (links, socials, contact info)
- SocialChannels (subscribers, URLs)
- SEO Settings (Tag meta, site-wide SEO)
- Analytics (Yandex Metrika ID, GA ID, verification codes)

### **Components с жёсткой привязкой к данным:**

- `Navbar` — соцсети, бот ссылка (→ Global)
- `Footer` — соцсети, работодатели (→ Global)
- `LeftSidebar` — stats, social channels (→ API query + Global)
- `RightSidebar` — tags, articles (→ API query)
- `TagsSidebar` — tag labels, colors (→ Global или config)
- `MetrikaHit` — ID (→ env var, ok)

---

## 12. Риски и миграционные проблемы

### **Критические риски:**

1. **Next.js версия (14.2 → 15)** ⚠️ HIGH
   - Может быть breaking changes в API
   - React 18 → 19 обновление обязательно
   - Нужно тестировать все маршруты

2. **ISR invalidation** ⚠️ HIGH
   - Payload должен уметь вызывать `revalidatePath()`
   - Нужны API endpoints или webhook hooks
   - При ошибке — страницы будут кешироваться неправильно

3. **Deploy скрипт** ⚠️ MEDIUM
   - `--delete` в rsync может удалить Payload uploads
   - Нужно исключить `/public/uploads/` или использовать S3

4. **Параллельная БД** ⚠️ MEDIUM
   - Если Payload использует отдельный DATABASE_URL
   - Нужно синхронизировать схемы при миграции

5. **Admin auth middleware** ⚠️ MEDIUM
   - Payload требует middleware для защиты `/admin`
   - Нужно добавить `/middleware.ts`

6. **Статьи уже есть в MDX** ⚠️ LOW-MEDIUM
   - 10 статей нужно мигрировать
   - Нужен миграционный script для парсинга + upload в Payload

### **Оптимальная стратегия миграции:**

**Фаза 0** (Подготовка):

- [ ] Обновить Next.js 14 → 15
- [ ] Обновить React 18 → 19
- [ ] Установить Payload v3 + зависимости
- [ ] Создать базовую Payload конфигурацию с postgres adapter
- [ ] Создать `/middleware.ts` для admin auth

**Фаза 1** (Articles Collection):

- [ ] Создать Payload Collection "Article"
- [ ] Написать миграционный script для MDX → Payload
- [ ] Заменить `getArticles()` на Payload API queries
- [ ] Заменить `<MDXRemote>` на Payload Rich Text Serializer
- [ ] Удалить `next-mdx-remote`, `gray-matter`, `remark-gfm`
- [ ] Протестировать `/articles` и `/articles/[slug]`

**Фаза 2** (Tags Global + Collection):

- [ ] Создать Payload Collection "Tag"
- [ ] Создать Global "SEO" для tag meta (seoTitle, seoDescription, seoText)
- [ ] Мигрировать данные из Prisma Tag table
- [ ] Обновить `getTagsWithCounts()` для использования Payload API
- [ ] Тестирование фильтров по тегам

**Фаза 3** (Posts Collections):

- [ ] Создать Collections "Vacancy" и "Resume" (или один "Post" с field type)
- [ ] Создать Collection "Category"
- [ ] Написать миграционный script для Prisma Post → Payload
- [ ] Обновить `getPostsByTypePaginated()`, `getPostBySlug()` для Payload API
- [ ] Тестировать все post маршруты (listing, detail, pagination)

**Фаза 4** (Globals + UI):

- [ ] Создать Global "Navigation" (navbar links)
- [ ] Создать Global "Footer" (footer content)
- [ ] Создать Global "SocialChannels" (socials, subscribers)
- [ ] Создать Global "Analytics" (Metrika ID, GA ID, verification)
- [ ] Обновить компоненты для использования Globals через API

**Фаза 5** (Deploy + ISR):

- [ ] Добавить Payload hooks для `revalidatePath()` при обновлениях
- [ ] Создать `/api/revalidate` endpoint (если нужно)
- [ ] Обновить `.github/workflows/deploy.yml`:
  - Добавить `PAYLOAD_SECRET` и другие env vars
  - Защитить uploads от `--delete`
  - Или настроить S3 storage для Payload
- [ ] Тестировать ISR: изменить контент в админ-панели, проверить обновление на сайте
- [ ] Запустить на production

---

## 13. Список файлов для изменения

### **Обязательные изменения:**

1. `/home/claude/projects/digital-pub-/package.json`
   - Обновить Next.js, React, добавить Payload

2. `/home/claude/projects/digital-pub-/tsconfig.json`
   - Может потребоваться обновление для Payload типов

3. `/home/claude/projects/digital-pub-/next.config.mjs`
   - Расширить CSP для Payload админ-панели
   - Добавить remotePatterns для Payload media (если используется)

4. `/home/claude/projects/digital-pub-/.github/workflows/deploy.yml`
   - Добавить env vars (PAYLOAD_SECRET, DATABASE_URL и т.д.)
   - Обновить rsync для исключения uploads

5. `/home/claude/projects/digital-pub-/.env.example`
   - Добавить PAYLOAD_SECRET, PAYLOAD_PUBLIC_URL, REVALIDATE_SECRET

6. **СОЗДАТЬ**: `/home/claude/projects/digital-pub-/payload.config.ts`
   - Основная конфигурация Payload CMS v3

7. **СОЗДАТЬ**: `/home/claude/projects/digital-pub-/middleware.ts`
   - Защита маршрутов `/admin`

8. **СОЗДАТЬ**: `/home/claude/projects/digital-pub-/app/api/revalidate/route.ts`
   - Endpoint для ISR invalidation (опционально)

### **Обновляемые файлы:**

9. `/home/claude/projects/digital-pub-/lib/articles.ts`
   - Заменить чтение MDX на Payload API queries

10. `/home/claude/projects/digital-pub-/lib/posts.ts`
    - Обновить queries для использования Payload Collections

11. `/home/claude/projects/digital-pub-/lib/tags.ts`
    - Обновить queries для Payload Collections

12. `/home/claude/projects/digital-pub-/app/articles/page.tsx`
    - Добавить `revalidate` или `revalidatePath` hook
    - Обновить `getArticles()` call

13. `/home/claude/projects/digital-pub-/app/articles/[slug]/page.tsx`
    - Обновить MDX rendering на Payload Rich Text

14. `/home/claude/projects/digital-pub-/components/RightSidebar.tsx`
    - Обновить articles fetching на Payload API

15. `/home/claude/projects/digital-pub-/components/LeftSidebar.tsx`
    - Обновить stats на Payload API (если нужна sync)

### **可удалять:**

- `/home/claude/projects/digital-pub-/content/articles/` (после миграции в Payload)
- Зависимости: `next-mdx-remote`, `gray-matter`, `remark-gfm` (из package.json)

---

## 14. Заключение и рекомендации

### **Ключевые выводы:**

1. **Текущая архитектура хорошо структурирована** для интеграции Payload CMS v3
   - Есть четкие разделения между данными (Prisma) и UI (React components)
   - ISR уже используется для динамических страниц
   - Prisma schema простая и готова к миграции

2. **Основные точки соприкосновения:**
   - Articles (MDX → Payload Collection)
   - Posts/Vacancies/Resumes (Prisma → Payload Collections)
   - Tags и Categories (Prisma → Payload Collections или Globals)
   - Navigation, Footer, Settings (hardcode → Payload Globals)

3. **Критические обновления:**
   - Next.js 14 → 15 (Breaking change)
   - React 18 → 19 (Требование Payload v3)
   - Deploy script (защита uploads)
   - ISR hooks в Payload для автоматического revalidate

4. **Временная оценка:**
   - Подготовка (Next.js, React, Payload setup): 2-3 дня
   - Articles Collection: 2-3 дня
   - Tags + Globals: 1-2 дня
   - Posts Collections: 3-4 дня
   - Deploy + Testing: 2-3 дня
   - **Итого: 10-15 дней** (с учетом тестирования и оптимизации)

5. **Рекомендуемый подход:**
   - Параллельная разработка на отдельной ветке
   - Использовать S3 (или аналог) для Payload media (не локальный filesystem)
   - Создать миграционные scripts для импорта данных
   - Тестировать ISR и cache invalidation тщательно
   - Оставить Prisma для читаемых операций (гибридный подход) или полностью мигрировать на Payload API

---

**Автор**: Claude  
**Дата анализа**: 2026-05-25  
**Версия отчета**: v1.0
