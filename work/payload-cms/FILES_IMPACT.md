# Матрица воздействия интеграции Payload CMS v3

## Файлы проекта, затронутые интеграцией

### 1. КОНФИГУРАЦИОННЫЕ ФАЙЛЫ (Critical Priority)

| Файл                           | Тип действия | Описание                                                       | Сложность | Статус   |
| ------------------------------ | ------------ | -------------------------------------------------------------- | --------- | -------- |
| `package.json`                 | ОБНОВИТЬ     | Next.js 14→15, React 18→19, добавить Payload пакеты            | 🟡 MEDIUM | Blocking |
| `next.config.mjs`              | ОБНОВИТЬ     | Расширить CSP для /admin, image domains для Payload            | 🟢 LOW    | Blocking |
| `tsconfig.json`                | ПРОВЕРИТЬ    | Может потребоваться обновление для Payload типов               | 🟢 LOW    | Optional |
| `.env.example`                 | ОБНОВИТЬ     | Добавить PAYLOAD_SECRET, PAYLOAD_PUBLIC_URL, REVALIDATE_SECRET | 🟢 LOW    | Blocking |
| `.github/workflows/deploy.yml` | ОБНОВИТЬ     | Добавить env vars, защитить /public/uploads от --delete        | 🟡 MEDIUM | Blocking |

### 2. НОВЫЕ ФАЙЛЫ (Must Create)

| Файл                          | Описание                                    | Приоритет   | Зависит от          |
| ----------------------------- | ------------------------------------------- | ----------- | ------------------- |
| `payload.config.ts`           | Основная конфигурация Payload CMS           | 🔴 CRITICAL | package.json update |
| `middleware.ts`               | Middleware для auth /admin маршрутов        | 🔴 CRITICAL | payload.config.ts   |
| `app/admin/layout.tsx`        | Layout для админ-панели (опционально)       | 🟡 MEDIUM   | middleware.ts       |
| `app/api/revalidate/route.ts` | API endpoint для ISR invalidation           | 🟡 MEDIUM   | app/layout.tsx      |
| `lib/payload-utils.ts`        | Helper functions для Payload queries        | 🟡 MEDIUM   | payload.config.ts   |
| `scripts/migrate-articles.ts` | Script миграции 10 MDX → Payload            | 🟡 MEDIUM   | payload.config.ts   |
| `scripts/migrate-posts.ts`    | Script миграции Posts → Payload Collections | 🔴 CRITICAL | payload.config.ts   |

### 3. LIB ФУНКЦИИ (Data Layer)

| Файл                 | Функции                                                                                                    | Изменения                                                     | Сложность |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------- |
| `lib/articles.ts`    | `getArticles()`, `getArticleBySlug()`, `formatArticleDate()`                                               | ❌ УДАЛИТЬ. Заменить на Payload API queries                   | 🔴 HIGH   |
| `lib/posts.ts`       | `getPublishedPosts()`, `getPostsByType()`, `getPostById()`, `getPostsByTypePaginated()`, `getPostBySlug()` | ❌ ПЕРЕПИСАТЬ. Использовать Payload Collections API           | 🔴 HIGH   |
| `lib/tags.ts`        | `getTagsWithCounts()`, `getTagBySlug()`, `getPostsByTag()`, `getStats()`                                   | ⚠️ ЧАСТИЧНО. Запросы к Payload, но структура может измениться | 🟡 MEDIUM |
| `lib/prisma.ts`      | `prisma` клиент                                                                                            | ✅ ОСТАВИТЬ или использовать для legacy read operations       | 🟢 LOW    |
| `lib/config.ts`      | `SOCIAL_CHANNELS`, `FILTER_CHIPS`                                                                          | ⚠️ ВОЗМОЖНО переместить в Payload Global                      | 🟡 MEDIUM |
| `lib/postUtils.ts`   | `toFeedPost()`, `getPrimaryCategorySlug()`                                                                 | ⚠️ ОБНОВИТЬ если изменится структура Post                     | 🟡 MEDIUM |
| `lib/tag-matcher.ts` | Логика матчинга тегов                                                                                      | ✅ ОСТАВИТЬ (утилита)                                         | 🟢 LOW    |
| `lib/data.ts`        | (если существует)                                                                                          | Проверить                                                     | ?         |

### 4. APP МАРШРУТЫ (Route Handlers)

| Маршрут                        | Компонент        | Изменения                                                           | Сложность | ISR           |
| ------------------------------ | ---------------- | ------------------------------------------------------------------- | --------- | ------------- |
| `/`                            | `page.tsx`       | ⚠️ Обновить getPublishedPosts() на Payload API                      | 🟡 MEDIUM | force-dynamic |
| `/vacancies`                   | `page.tsx`       | ⚠️ Обновить getPostsByTypePaginated() на Payload API                | 🟡 MEDIUM | force-dynamic |
| `/vacancies/[category]`        | `page.tsx`       | ⚠️ Обновить queries на Payload API                                  | 🟡 MEDIUM | 300s          |
| `/vacancies/[category]/[slug]` | `page.tsx`       | ⚠️ Обновить getPostBySlug() на Payload API                          | 🟡 MEDIUM | 300s          |
| `/resumes`                     | `page.tsx`       | ⚠️ Обновить getPostsByTypePaginated('resume') на Payload API        | 🟡 MEDIUM | force-dynamic |
| `/resumes/tag/[tagSlug]`       | **НЕ НАЙДЕН** 🚨 | ⚠️ Может существовать или быть legacy                               | ?         | ?             |
| `/articles`                    | `page.tsx`       | ⚠️ Обновить getArticles() на Payload API + ✅ добавить `revalidate` | 🟡 MEDIUM | STATIC → 300s |
| `/articles/[slug]`             | `page.tsx`       | ⚠️ Обновить getArticleBySlug() + MDX → RichText                     | 🔴 HIGH   | 300s          |
| `/privacy`                     | `page.tsx`       | ✅ ОСТАВИТЬ (статический)                                           | 🟢 LOW    | static        |
| `/terms`                       | `page.tsx`       | ✅ ОСТАВИТЬ (статический)                                           | 🟢 LOW    | static        |
| `/sitemap.ts`                  | `sitemap.ts`     | ⚠️ Могут потребоваться обновления для Payload Collections           | 🟡 MEDIUM | force-dynamic |
| **/admin**                     | **НОВЫЙ**        | 🔴 Payload будет создавать свои маршруты                            | 🔴 HIGH   | N/A           |
| **/api/payload**               | **НОВЫЙ**        | 🔴 Payload REST/GraphQL API                                         | 🔴 HIGH   | N/A           |
| **/api/revalidate**            | **НОВЫЙ**        | 🟡 API endpoint для ISR triggers                                    | 🟡 MEDIUM | N/A           |

### 5. КОМПОНЕНТЫ (React Components)

| Компонент         | Файл                             | Изменения                                           | Сложность |
| ----------------- | -------------------------------- | --------------------------------------------------- | --------- |
| `Navbar`          | `components/Navbar.tsx`          | ⚠️ ВОЗМОЖНО: Загружать links из Payload Global      | 🟡 MEDIUM |
| `Footer`          | `components/Footer.tsx`          | ⚠️ ВОЗМОЖНО: Загружать content из Payload Global    | 🟡 MEDIUM |
| `LeftSidebar`     | `components/LeftSidebar.tsx`     | ⚠️ ВОЗМОЖНО: Stats и social channels из Payload API | 🟡 MEDIUM |
| `RightSidebar`    | `components/RightSidebar.tsx`    | ⚠️ ОБНОВИТЬ: articles fetching на Payload API       | 🟡 MEDIUM |
| `TagsSidebar`     | `components/TagsSidebar.tsx`     | ⚠️ ОБНОВИТЬ: tags source на Payload API             | 🟡 MEDIUM |
| `HomePage`        | `components/HomePage.tsx`        | ⚠️ Обновить props структуру если изменятся типы     | 🟡 MEDIUM |
| `ListingPage`     | `components/ListingPage.tsx`     | ⚠️ Обновить props структуру                         | 🟡 MEDIUM |
| `PostDetail`      | `components/PostDetail.tsx`      | ⚠️ Обновить props структуру                         | 🟡 MEDIUM |
| `RelatedArticles` | `components/RelatedArticles.tsx` | ⚠️ Обновить для Payload articles                    | 🟡 MEDIUM |
| `MetrikaHit`      | `components/MetrikaHit.tsx`      | ✅ ОСТАВИТЬ (util component)                        | 🟢 LOW    |
| `JsonLd`          | `components/JsonLd.tsx`          | ✅ ОСТАВИТЬ (util component)                        | 🟢 LOW    |
| `PageShell`       | `components/PageShell.tsx`       | ✅ ОСТАВИТЬ (layout wrapper)                        | 🟢 LOW    |

### 6. КОНТЕНТ И ДАННЫЕ

| Директория             | Содержимое              | Действие                                    | Статус           |
| ---------------------- | ----------------------- | ------------------------------------------- | ---------------- |
| `/content/articles/`   | 10 .mdx файлов (328 KB) | 🔴 МИГРИРОВАТЬ в Payload Collection         | Blocking Phase 1 |
| `/public/`             | assets, logo, images    | ✅ ОСТАВИТЬ (но исключить из Payload media) | Optional         |
| `prisma/schema.prisma` | DB schema               | ⚠️ ПРОВЕРИТЬ / РАСШИРИТЬ для Payload        | Optional         |

### 7. ТЕСТОВЫЕ И КОНФИГ ФАЙЛЫ

| Файл                   | Тип         | Действие                                                |
| ---------------------- | ----------- | ------------------------------------------------------- |
| `jest.config.ts`       | Test config | ⚠️ Проверить совместимость с React 19                   |
| `playwright.config.ts` | E2E config  | ⚠️ Проверить, добавить тесты для /admin                 |
| `.eslintrc.json`       | Lint config | ✅ Возможно, обновить для Payload                       |
| `tsconfig.json`        | TS config   | ⚠️ Проверить paths для /admin                           |
| `tailwind.config.ts`   | CSS config  | ⚠️ Может конфликтовать с Payload CSS (скорее всего нет) |
| `postcss.config.mjs`   | PostCSS     | ✅ Обычно OK                                            |

---

## Процесс миграции по очередности

### Блок 1: Setup (День 1-2)

```
1. package.json — обновить Next.js, React, добавить Payload
2. next.config.mjs — расширить CSP
3. .env.example — добавить Payload secrets
4. payload.config.ts — создать базовую конфигурацию
5. middleware.ts — создать auth middleware
```

### Блок 2: Articles Collection (День 2-4)

```
6. scripts/migrate-articles.ts — создать миграционный script
7. lib/articles.ts — переписать на Payload API
8. app/articles/page.tsx — добавить revalidate
9. app/articles/[slug]/page.tsx — заменить MDX на RichText
10. components/RightSidebar.tsx — обновить articles fetching
```

### Блок 3: Tags & Globals (День 4-5)

```
11. Payload Collections/Globals для Tags, Navigation, Footer, SocialChannels
12. lib/tags.ts — обновить queries
13. components/TagsSidebar.tsx — обновить
14. lib/config.ts — возможно переместить в Global
```

### Блок 4: Posts Collections (День 5-8)

```
15. scripts/migrate-posts.ts — создать миграционный script
16. lib/posts.ts — переписать на Payload API
17. app/vacancies/* — обновить все маршруты
18. app/resumes/* — обновить все маршруты
19. components/ListingPage.tsx, PostDetail.tsx — обновить
```

### Блок 5: Deploy & ISR (День 8-10)

```
20. app/api/revalidate/route.ts — создать ISR endpoint
21. payload.config.ts — добавить hooks для revalidate
22. .github/workflows/deploy.yml — обновить с Payload env vars
23. Настроить S3 для Payload media
24. Полное тестирование ISR
```

---

## Файловая структура после интеграции

```
digital-pub/
├── app/
│   ├── admin/              ← NEW (Payload routes)
│   ├── api/
│   │   ├── payload/        ← NEW (Payload REST/GraphQL)
│   │   └── revalidate/     ← NEW (ISR endpoint)
│   ├── articles/           ← UPDATED (Payload API)
│   ├── vacancies/          ← UPDATED (Payload API)
│   ├── resumes/            ← UPDATED (Payload API)
│   ├── layout.tsx          ← UNCHANGED
│   └── page.tsx            ← UPDATED
├── components/             ← PARTIAL (sidebar/navbar updates)
├── content/                ← DEPRECATED (articles moved to Payload)
│   └── articles/           ← Can be deleted after migration
├── lib/
│   ├── articles.ts         ← REWRITTEN (Payload API)
│   ├── posts.ts            ← REWRITTEN (Payload API)
│   ├── tags.ts             ← UPDATED (Payload API)
│   ├── payload-utils.ts    ← NEW
│   └── prisma.ts           ← UNCHANGED or minimal
├── public/                 ← UNCHANGED
├── prisma/
│   └── schema.prisma       ← UNCHANGED (legacy or Payload-only)
├── scripts/
│   ├── migrate-articles.ts ← NEW
│   ├── migrate-posts.ts    ← NEW
│   └── ...existing scripts
├── middleware.ts           ← NEW (Payload auth)
├── payload.config.ts       ← NEW (Payload config)
├── next.config.mjs         ← UPDATED
├── package.json            ← UPDATED
└── .env.example            ← UPDATED
```

---

**Матрица завершена**: 25.05.2026  
**Приоритет**: High  
**Блокирующие факторы**: Next.js & React update, Payload config, Articles migration
EOF
cat /home/claude/projects/digital-pub-/work/payload-cms/FILES_IMPACT.md
