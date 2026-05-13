---
type: test-audit
created: 2026-05-13
feature: digital-pub-mvp
status: complete
---

# Test Audit — digital-pub-mvp

## 1. Test Inventory

Конфигурация:
- `jest.config.ts` — `testMatch: ['**/tests/**/*.test.ts']` (co-located тесты вне `tests/` НЕ запускаются)
- `playwright.config.ts` — `testDir: './tests/e2e'`, проекты chromium + iPhone 13, baseURL `localhost:3001`

| Файл | Категория | Кол-во тестов (it/test) | Источник логики |
|------|-----------|-------------------------|-----------------|
| `tests/unit/smoke.test.ts` | Unit / smoke | 2 | self / fs |
| `tests/unit/data.test.ts` | Unit | 6 | `@/lib/data` (статичный мок JOBS) |
| `tests/unit/slug-validation.test.ts` | Unit | 5 | **локальная копия** схемы (не импортирует код) |
| `tests/unit/tag-matching.test.ts` | Unit | 15 | **локальная копия** функции `matchTags` (не импортирует `sync-telegram.ts`) |
| `tests/unit/articles.test.ts` | Unit | 7 | `@/lib/articles` (реальный код) |
| `tests/integration/sitemap.test.ts` | Integration | 7 | `@/app/sitemap` (но вызывает синхронно — см. P0) |
| `tests/e2e/critical-path.spec.ts` | E2E | 3 | Playwright |
| `tests/e2e/responsive.spec.ts` | E2E | 3 | Playwright |
| `tests/e2e/articles.spec.ts` | E2E | 3 | Playwright |

**Итого:** 39 unit/integration + 9 E2E = **48 тестов**.

Пирамида:
```
Unit: 35   (но из них 20 — тесты копий-двойников, см. P0)
Integration: 7
E2E: 9
```
Формально пропорция близка к пирамиде, но качество unit-слоя обманчиво — тесты не покрывают production-код.

Дубликаты вне дерева (НЕ запускаются, archived): `_files/v1/tests/unit/data.test.ts`, `_files/v1/tests/unit/smoke.test.ts`.

---

## 2. Coverage Gaps (vs Tech-Spec "Testing Strategy")

### Unit (tech-spec §)
| Требование | Статус | Комментарий |
|-----------|--------|-------------|
| Tag keyword matching (word boundary, multi-tag, Cyrillic, no false positives) | PARTIAL | Все кейсы покрыты сценарно, **но тест прогоняется на копии функции, а не на коде из `scripts/sync-telegram.ts`**. Изменения в проде не будут пойманы. |
| Article frontmatter parsing (valid/invalid MDX, missing title, invalid date, empty body) | PARTIAL | Покрыт только happy-path парсинг `sample`. **Нет** тестов на missing title, invalid date, empty body, malformed YAML. |
| Slug validation (valid pass, path traversal, too-long) | PARTIAL | `slug-validation.test.ts` тестирует **локальную** копию regex (`/^[a-z0-9-_]{1,80}$/`), а `lib/articles.ts` использует **другую** схему (`/^[a-z0-9-]+$/` без `_` и без лимита 80). Подделка двух схем — несоответствие. `articles.test.ts` частично проверяет реальную через `getArticleBySlug`, но не разделяет «формат невалиден» vs «файла нет». |
| Post description cleaning regex | MISSING | Регрессивная логика очистки `@mentions`, disclaimers — без тестов. |
| Statistics queries (COUNT by type) | MISSING | Нет ни одного теста на функции из `lib/stats.ts` / lib/posts. |
| Posts without description filtered out | MISSING | Decision 9: `description: { not: null }` — нет unit/integration теста, проверяющего фильтр. |

### Integration (tech-spec §)
| Требование | Статус | Комментарий |
|-----------|--------|-------------|
| Telegram sync + tag assignment (E2E sync → DB → PostTag) | MISSING | Файл `tests/integration/sync-tags.test.ts` **отсутствует**, хотя заявлен в Task 9. |
| Article listing parsed correctly | PARTIAL | Покрыт через unit `getArticles()`, отдельного integration нет. |
| Tag page data (`/vacancies/tag/smm` returns only SMM posts) | MISSING | Ни одного теста на `app/vacancies/tag/[tagSlug]/page.tsx` или DB-запрос с фильтром по тегу. |
| Sitemap valid / contains expected URLs | BROKEN | См. P0-1 — тест существует, но не выполняется как заявлено и расходится с реальным кодом. |

### E2E (tech-spec §)
| Требование | Статус | Комментарий |
|-----------|--------|-------------|
| Critical path: home → filter → detail → "Откликнуться" с `t.me/` href | PARTIAL | Есть проверка h1 и CTA-видимости, но `href` начинается на `https://t.me/` **НЕ ассертится** (только локатор по тексту). |
| Responsive 375px (burger visible, no horizontal scroll, sidebar hidden) | OK | Полное покрытие. |
| SEO tag page (`/vacancies/tag/smm` уникальный h1, meta, посты, SEO-текст) | PARTIAL | Покрыт h1 + title. **Не** проверяется наличие списка постов и SEO-текстового блока. |
| Theme toggle (transition ≥200ms, текст читаем) | PARTIAL | Тогл и `data-theme` ассертятся. **Не** проверяется длительность transition ≥200ms и читаемость. |
| Articles flow (`/articles` listing → click → MDX content) | PARTIAL | Идёт **напрямую** на `/articles/sample` без клика из листинга. Ассертит видимость текста, но не «MDX content rendered correctly». |
| **Регресс на hydration crash (commit 038afbb, MDX-таблицы)** | MISSING | Ни один тест не проверяет, что страница со статьёй, **содержащей markdown-таблицу**, открывается без console error / hydration mismatch. |

---

## 3. Quality Findings

### P0 — Блокеры

**P0-1. `tests/integration/sitemap.test.ts` фундаментально сломан.**
Реальный `app/sitemap.ts` — это `async function`, возвращающая `Promise<MetadataRoute.Sitemap>` и обращающаяся к Prisma. В тесте:
```ts
const entries = sitemap()              // Это Promise, не массив
expect(Array.isArray(entries)).toBe(true)  // false
entries.map((e) => e.url)              // TypeError на Promise
```
Все 7 тестов будут падать на runtime. Дополнительно ожидаемые URL не соответствуют коду:
- Тест ждёт `/vacancies/tag/smm`, код генерирует `/vacancies/smm` (без `/tag/`)
- Тест ждёт `/resumes/tag/smm` — код это даёт (ОК)
- Тест ждёт `/articles/sample` — `sample.mdx` отсутствует в `content/articles/` (10 реальных статей с другими slug)

**Действие:** переписать с `await sitemap()`, выровнять ожидаемые URL с реальной схемой, заменить `sample` на существующий slug. Без этого CI/`npm test` зелёным не станет.

**P0-2. `tests/e2e/articles.spec.ts` ссылается на несуществующую статью.**
Тест ходит на `/articles/sample` и ожидает заголовок «Как найти работу». В `content/articles/` нет `sample.mdx`. Тест упадёт на 404 / `notFound()`.

**Действие:** заменить на реальный slug (например, `kak-nayti-rabotu-smm-menedzheru-2026`) либо создать `sample.mdx` для тестовой среды.

**P0-3. `tests/unit/articles.test.ts` ожидает несуществующий sample.mdx.**
```ts
const sample = articles.find((a) => a.slug === 'sample')
expect(sample).toBeDefined()
expect(sample!.title).toBe('Как найти работу в digital в 2026 году')
```
Те же причины, что в P0-2. Также `getArticleBySlug('sample')` вернёт null.

**P0-4. Регресс на hydration crash (commit 038afbb) НЕ покрыт.**
Фикс добавил `remark-gfm` для парсинга markdown-таблиц во избежание клиентского `hydration mismatch`. Если кто-то случайно уберёт `remarkPlugins: [remarkGfm]` или таблицу из MDX, тесты этого не поймают. Нужен E2E-тест:
```ts
page.on('pageerror', ...) и page.on('console', ...) — fail если есть hydration error
goto на статью с таблицей (например, любая из 5 статей с pipe-syntax)
ассерт <table> присутствует в DOM
```

### P1 — Высокий приоритет

**P1-1. Tag-matching unit-тесты используют локальный двойник.**
`tests/unit/tag-matching.test.ts` объявляет `TAG_KEYWORDS` и `matchTags` локально. Импорта из `scripts/sync-telegram.ts` нет. Это нарушает принцип test-master "Tests must verify real behavior". Если в проде поменяется keywords-map или регексп границ слова, тесты останутся зелёными.

**Действие:** экспортировать `matchTags` и `TAG_KEYWORDS` из `scripts/sync-telegram.ts` (или вынести в `lib/tag-matcher.ts`) и импортировать в тест.

**P1-2. Slug-validation unit-тесты используют локальный двойник + расхождение схем.**
`slug-validation.test.ts` объявляет `z.string().regex(/^[a-z0-9-_]{1,80}$/)`. Это совпадает с Decision 10 (zod на dynamic route slugs), но `lib/articles.ts` использует **другую**: `/^[a-z0-9-]+$/` (без `_`, без лимита 80). Получается, тест проходит для несуществующей в коде схемы и не ловит реальные баги.

**Действие:** импортировать реальные schema-объекты, протестировать обе раздельно (one for routes, one for articles), либо унифицировать схемы.

**P1-3. `tests/unit/smoke.test.ts`: `expect(true).toBe(true)` + устаревший env-чек.**
Антипаттерн «test that tests nothing». Дополнительно проверяется `NEXTAUTH_SECRET`, но согласно Decision tech-spec пакет `next-auth` удалён.

**Действие:** удалить `expect(true).toBe(true)`, обновить список env-vars (`DATABASE_URL`, `TELEGRAM_*`).

**P1-4. E2E «Откликнуться» не проверяет `t.me/` href.**
Tech-spec явно требует: `cta has href starting with 'https://t.me/'`. В `critical-path.spec.ts` проверяется только видимость текста, но не атрибут href. Регресс «кнопка указывает на старый /login» не будет пойман.

**Действие:** `await expect(cta).toHaveAttribute('href', /^https:\/\/t\.me\//)`.

**P1-5. Отсутствует integration-тест на sync + tag assignment.**
Task 9 явно требует `tests/integration/sync-tags.test.ts`. Файла нет. Главный value-add фичи (теги назначаются автоматически) не имеет регрессионной защиты.

### P2 — Средний приоритет

**P2-1. Edge cases по статьям отсутствуют.**
- MDX с невалидной датой `publishedAt`
- MDX без `title` или `description`
- MDX с пустым `content`
- MDX с `tags: []`
- Frontmatter с extra-полями (zod должен пропустить)

Сейчас `getArticles()` молча скипает невалидные файлы (`continue` в catch) — нет теста, что одна сломанная статья не валит листинг.

**P2-2. Edge cases по постам без description / пустому tag.**
- `getPosts()` при пустой таблице
- Tag без постов (counter = 0)
- Несуществующий tagSlug на `/vacancies/tag/foo` → 404

**P2-3. Theme toggle: transition duration не проверяется.**
Tech-spec требует ≥200ms. Можно через `getComputedStyle().transitionDuration` ассертить минимум.

**P2-4. E2E `responsive.spec.ts`: hardcoded селектор `nav button.lg\\:hidden`.**
Хрупкий CSS-селектор. Если класс переименуется на `xl:hidden` или появится новая `lg:hidden`-кнопка — упадёт. Лучше использовать `aria-label="Меню"` или `data-testid`.

**P2-5. E2E `critical-path.spec.ts`: `if (await firstLink.isVisible())` без else.**
Если линка нет (пустая БД), тест silently проходит. Должна быть явная `expect(...).toBeVisible()` или skip с указанием причины.

**P2-6. Дубликаты в `_files/v1/tests/`.**
Старые копии в архивной директории создают шум при grep и могут запутать новых разработчиков. Лучше переместить в `work/completed/` или удалить.

### P3 — Низкий приоритет

**P3-1. `data.test.ts` тестирует `@/lib/data` со статичным мок-массивом `JOBS`.**
Файл выглядит как остатки прототипа — возможно, не используется в production-коде. Если так — тест не зарабатывает место.

**P3-2. Нет проверки security headers через integration-тест.**
Можно дешёвый тест на `next.config.mjs.headers()` (вызвать функцию, проверить набор).

**P3-3. Нет проверки MDX component allowlist в действии.**
`MDX_ALLOWED_ELEMENTS` экспортируется, но не проверяется, что MDX с `<script>` или кастомным компонентом действительно не отрендерит его. Сейчас `MDXRemote` вызван без `components` prop — фактически разрешает все стандартные HTML, что соответствует allowlist. Тест на «вредоносный MDX → нет script-выполнения» был бы дешёвой страховкой.

**P3-4. Flakiness: `await page.waitForFunction(() => document.querySelector('h1'))` с timeout 15s.**
Длинный timeout маскирует медленные деплои/SSR — флаки на CI. Лучше `await expect(page.locator('h1')).toBeVisible()` с дефолтным timeout.

**P3-5. Playwright config: `reuseExistingServer: true` без отдельного `cwd`.**
Может цепляться к dev-серверу разработчика. ОК для локала, но в CI лучше явно стартовать prod build.

---

## 4. Verdict

**Готовы ли тесты к /done? — НЕТ.**

Причины-блокеры (P0):
1. `tests/integration/sitemap.test.ts` — синхронный вызов async-функции, URL-mismatch → весь файл красный.
2. E2E и unit ссылаются на `sample.mdx`, которой нет → 3 теста гарантированно красные.
3. Регресс недавнего hydration-фикса не покрыт ни одним тестом — на следующий же случайный rebase/refactor можно повторить тот же баг.
4. Заявленный в tech-spec integration-тест `sync-tags.test.ts` отсутствует.

Дополнительно, основной unit-слой (tag-matching, slug-validation) — это псевдо-тесты, проверяющие копии функций, а не production-код. По методологии test-master это «redundant testing» с нулевой защитной ценностью при изменениях кода.

**Минимум для /done:**
- Починить P0-1..P0-4 (4 блокера).
- Привести `npm test` и `npx playwright test` к зелёному состоянию.
- Создать недостающий `sync-tags.test.ts` (даже с минимальным smoke — sync → ≥1 PostTag).

**Желательно до /done (P1):**
- Импортировать реальные `matchTags` и `slugSchema` в тесты.
- Удалить `expect(true).toBe(true)`.
- Добавить ассерт `href ~ /^https:\/\/t\.me/` в critical-path.

После закрытия P0 и P1 фича готова к деплою.
