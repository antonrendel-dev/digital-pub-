---
type: code-audit
created: 2026-05-13
feature: digital-pub-mvp
status: complete
---

# Code Audit — digital-pub-mvp

[REVIEW] Финальный код-аудит фичи перед закрытием через /done. Прогнан по 11 dimensions code-reviewing skill, фокус на cross-component и архитектурные проблемы (не cosmetic).

---

## 1. Summary

**Verdict: Pass with concerns.**

Фича в проде, работает, но в коде накопились существенные расхождения с tech-spec и архитектурный долг, который усложнит дальнейшее развитие. Критичных блокеров деплоя (P0) нет — сайт работает. Однако обнаружено **2 P0 для безопасности/корректности данных**, **8 P1** (cross-component дубли, расхождения с tech-spec, противоречия в конфигурации) и стопка P2. Главные категории проблем:

- **Расхождение с tech-spec по маршрутам** (`/vacancies/tag/{slug}` обещано в Decision 6 — фактически реализовано `/vacancies/{slug}`, что создаёт ровно ту коллизию, которую Decision 6 должен был предотвратить).
- **Дубликаты бизнес-логики** между `JobCard`, `TileCard`, `PostDetail`, `sitemap.ts`, `lib/posts.ts` (выбор categorySlug, `cleanDescription`, `formatDate`, маппинги категорий).
- **Незавершённая Tailwind-миграция**: globals.css ~120 строк (норм), но в нём остались custom-классы (`tile-card`, `mobile-menu`, `descriptor-bar`, `chip-active`, `tag-blue/green/orange`, `s-lbl`, `logo-brand`), плюс inline-стили в Navbar и Footer. Tech-spec требовал «no custom CSS class selectors in JSX».
- **Конфликт: noindex в next.config + robots.index:true в layout** — оба активны, противоречат друг другу.
- **`darkMode` в Tailwind config не работает как ожидается**: глобально в коде нет ни одного `dark:` класса. Транзакция темы реализована старым способом через CSS-переменные.

---

## 2. Findings

### P0 — критично (блокирует следующий деплой/итерацию)

#### P0-1. Противоречие robots: `next.config.mjs` шлёт `X-Robots-Tag: noindex, nofollow`, а `app/layout.tsx` объявляет `robots: { index: true, follow: true }` и canonical
- **Файлы:** `/home/claude/projects/digital-pub-/next.config.mjs:24`, `/home/claude/projects/digital-pub-/app/layout.tsx:33-36`
- **Проблема:** заголовок HTTP `X-Robots-Tag: noindex, nofollow` ставится для **всех** маршрутов, включая sitemap.xml, robots.txt и страницы. Параллельно в `<head>` через next/metadata уходит `<meta name="robots" content="index, follow">` и canonical на `https://d-pub.ru`. Google по правилам приоритезирует **более жёсткую** директиву → noindex побеждает. Sitemap, OG, Schema.org, ISR и весь SEO-overhaul (коммит `bd2cd07`) на проде **не работают**, потому что весь сайт под noindex на уровне HTTP-заголовка.
- **Рекомендация:** определиться: или закрываем сайт полностью (тогда уберите robots.index/canonical/sitemap/og-image из layout и удалите sitemap.ts), или открываем (тогда уберите `X-Robots-Tag` из next.config или сделайте его env-gated). Учитывая, что коммит `bd2cd07` явно делает SEO-overhaul — `X-Robots-Tag` должен уйти, а закрытие индексации (если оно ещё нужно перед запуском) переехать в `robots.txt` или в `layout.tsx`.

#### P0-2. Sitemap отдаёт URL вакансий, которые либо ведут на категорию (а не на пост), либо 404
- **Файл:** `/home/claude/projects/digital-pub-/app/sitemap.ts:64-78`
- **Проблема:** для вакансий выдаётся `${BASE_URL}/vacancies/${categorySlug}/${p.slug}` (двухсегментный URL `/vacancies/{cat}/{slug}`). Но в `app/vacancies/` есть только динамический сегмент `[category]/page.tsx`, **никакого `[category]/[slug]/page.tsx` в выложенных файлах нет**. То есть пути из sitemap указывают на маршрут, который Next роутер не разрешит → 404. Аналогично резюме — `${BASE_URL}/post/${p.slug}` (тоже не виден маршрут `app/post/[slug]`).
- Дополнительно: `JobCard.tsx:48`, `TileCard.tsx:54`, `PostDetail.tsx:170` все генерят те же 404-ссылки. То есть на проде каждый клик по карточке вакансии или по «похожей» — это 404. Это ломает основной user flow из user-spec («Открывает карточку вакансии — видит полное описание»).
- **Рекомендация:** либо реализуйте маршрут `app/vacancies/[category]/[slug]/page.tsx` (и `app/post/[slug]/page.tsx`), либо измените генерацию ссылок на существующий маршрут. Поскольку коммит `038afbb` именно про hydration crash на article pages, есть подозрение что страницы постов как-то существуют, но их нет среди файлов из task-листа — проверить руками в файловой системе обязательно.

---

### P1 — серьёзно (должно быть исправлено в ближайшую итерацию)

#### P1-1. Расхождение с tech-spec Decision 6: SEO-страницы тегов на `/vacancies/{slug}`, а не на `/vacancies/tag/{slug}`
- **Файлы:** `/home/claude/projects/digital-pub-/app/vacancies/[category]/page.tsx`, `/home/claude/projects/digital-pub-/components/TagsSidebar.tsx:59`, `/home/claude/projects/digital-pub-/components/RelatedArticles.tsx:130`, `/home/claude/projects/digital-pub-/app/sitemap.ts:30`
- **Проблема:** decisions.md был пуст, в tech-spec (Decision 6) явно зафиксировано: «Use `/vacancies/tag/{tagSlug}` for SEO tag pages. Keep `/vacancies/{postSlug}` for individual vacancy pages. Both tag slugs and post slugs share `/vacancies/` namespace. Using `/tag/` prefix avoids collision.» В коде маршрут реализован как `app/vacancies/[category]/page.tsx` — без префикса `/tag/`. Это значит ровно та коллизия, которую обещали избежать, **существует**: пост `/vacancies/dizajner-figma-12345` и категория `/vacancies/dizajn` живут в одном namespace, и при появлении поста с slug = `smm` (а slug генерируется автоматически в sync-telegram.ts из транслита заголовка) он перекроет SEO-страницу `/vacancies/smm`.
- Также user-spec оригинально хотел `/vacancies/{tag-slug}` — значит код ближе к user-spec, но tech-spec этот пункт пересмотрел и `decisions.md` зафиксировал ровно `/tag/` prefix. То есть либо tech-spec врёт, либо реализация ушла в сторону.
- **Рекомендация:** документировать deviation в `decisions.md` (он пустой!), и добавить защиту: в `app/vacancies/[category]/page.tsx` перед `getTagBySlug` проверять, что slug действительно тег, иначе подставлять обработку post-slug; либо вернуться к `/vacancies/tag/{slug}` per spec.

#### P1-2. `decisions.md` пустой — нарушение процесса done/feature-execution
- **Файл:** `/home/claude/projects/digital-pub-/work/digital-pub-mvp/decisions.md`
- **Проблема:** в файле только template-комментарий. По tech-spec реализовано 9 задач, минимум 4 коммита (включая `bd2cd07` с SEO-overhaul, `2a458a9` с Wordstat-keywords, `038afbb` с hydration fix, `a5d5df3` с SEO-текстами для тегов). Ни одна задача и ни одно отклонение не задокументированы. Это блокирует осмысленный /done — нечего архивировать.
- **Рекомендация:** хотя бы коротко (3-5 строк на задачу) описать что было сделано и зафиксировать deviations (см. P1-1, P1-5, P1-6).

#### P1-3. Дублирование бизнес-логики: `cleanDescription`, `formatDate`, `getTagColorClass`, выбор categorySlug
- **Файлы:**
  - `cleanDescription` — определён 1-в-1 в `components/feed/JobCard.tsx:26-33` и `components/feed/TileCard.tsx:21-28`. Похожая логика в `components/PostDetail.tsx:45-48`.
  - `formatDate` — определён 1-в-1 в `JobCard.tsx:10-20` и `TileCard.tsx:5-15`.
  - `getTagColorClass` + `FORMAT_TAGS` + `LEVEL_TAGS` — 1-в-1 в `JobCard.tsx:35-42` и `TileCard.tsx:30-37`.
  - Выбор categorySlug — повторён в `JobCard.tsx:47`, `TileCard.tsx:53`, `PostDetail.tsx:36-37`, `sitemap.ts:67`, и есть утилита `getPrimaryCategorySlug` в `lib/posts.ts:59-63`, которой никто не пользуется.
- **Проблема:** копи-паст из 4-5 мест → любая правка (например, исправить P0-2 на правильный URL) требует синхронных правок в 4 файлах. `getPrimaryCategorySlug` написан, но не используется.
- **Рекомендация:** вынести в `lib/postFormat.ts` (или `lib/postUtils.ts`): `cleanDescription`, `formatDate`, `formatDateShort`, `getTagColorClass`, `getCategorySlug` (использовать существующий `getPrimaryCategorySlug` из `lib/posts.ts`). Импортировать из всех 5 мест.

#### P1-4. Tailwind `dark:` modifier настроен, но не используется — Decision 1 не выполнен
- **Файлы:** `/home/claude/projects/digital-pub-/tailwind.config.ts:4`, все компоненты.
- **Проблема:** в `tailwind.config.ts` стоит `darkMode: ['selector', '[data-theme="dark"]']`. По Decision 1 ожидается использование `dark:` модификатора. Реально в коде **нет ни одного класса `dark:*`** — тема переключается старым способом через CSS-переменные (`bg-bg-card` подцепляет нужный цвет из `:root` или `[data-theme='dark']`). darkMode-конфиг — мёртвый. Не критично функционально (тема работает), но Decision 1 не выполнен и Test acceptance criteria «Dark mode: all text readable» не проверен по факту через `dark:` модификатор.
- **Рекомендация:** либо удалить `darkMode` из tailwind.config (раз не используем — не вводим в заблуждение), либо мигрировать те места где CSS-переменных не хватает (например, `bg-purple-100 text-purple-700` в JobCard:101, `bg-green-100`, `bg-amber-100`, `bg-amber-50` в PostDetail — они hardcoded, на dark не адаптированы).

#### P1-5. `globals.css` всё ещё содержит custom-классы — Tailwind migration не завершена
- **Файл:** `/home/claude/projects/digital-pub-/app/globals.css:60-121`
- **Проблема:** acceptance criterion из tech-spec: «globals.css reduced to <100 lines (CSS variables + minimal base styles only)» и «All components use Tailwind classes — no custom CSS class selectors in JSX». Сейчас:
  - 121 строка (превышение, но небольшое — P2).
  - Остаются custom-классы: `.s-lbl`, `.s-lbl::before`, `.tile-card`, `.tile-card:hover`, `.tag-blue`, `.tag-green`, `.tag-orange`, `[data-theme='dark'] .tag-*`, `.logo-brand em`, `.descriptor-bar`, `.mobile-menu`, `.card-hover`, `.chip-active` — все используются в JSX (Navbar:38, 146, 166; LeftSidebar:74, 88; TagsSidebar:46; RightSidebar:18; PostDetail; Footer:13; TileCard:60; JobCard:91; TagsSidebar:64).
  - `.theme-switching` — глобальный CSS-хак (override `transition: !important` для всех потомков), который не выражается через Tailwind. Это OK, но должно быть в комментарии.
- **Рекомендация:** либо мигрировать остальные классы (предпочтительно `.tag-*` и `.s-lbl` → Tailwind компоненты), либо признать deviation от tech-spec и зафиксировать в `decisions.md`.

#### P1-6. Sample.mdx упомянут в tech-spec, в `app/sitemap.ts` список тегов hardcoded — не sync с БД
- **Файл:** `/home/claude/projects/digital-pub-/app/sitemap.ts:7-12`
- **Проблема:** `TAG_SLUGS` зашит как массив. Если seed-скрипт добавит/удалит тег — sitemap не обновится, придётся править руками. При этом ниже в файле уже стоит запрос к Prisma для постов — можно было одним запросом вытянуть теги. Tech-spec Decision 4 + seed.ts именно для этого расширили Tag модель.
- **Рекомендация:** заменить hardcoded массив на `await prisma.tag.findMany({ select: { slug: true } })`. Заодно `getTagsWithCounts` уже умеет это делать.

#### P1-7. N+1 запрос в `getTagsWithCounts` + дорогой groupBy в `getStats`, оба вызываются на каждом запросе
- **Файлы:** `/home/claude/projects/digital-pub-/lib/tags.ts:23-40`, `/home/claude/projects/digital-pub-/lib/tags.ts:91-104`
- **Проблема:**
  - `getTagsWithCounts` тянет все теги с **полным списком связей PostTag** (`include: { posts: { select: { postId: true } } }`), затем считает length в JS. При тысячах постов это десятки тысяч строк в результате. Лучше — `prisma.tag.findMany({ include: { _count: { select: { posts: true } } } })` — Prisma сделает COUNT в БД.
  - `getStats` делает `groupBy({ by: ['company'] })` по всем published-постам — без LIMIT, на каждом запросе главной/листингов. ISR `revalidate = 300` спасает от частого вызова, но на cold cache всё равно дорого.
  - На страницах `app/page.tsx:21-26`, `app/vacancies/page.tsx:26-30`, `app/vacancies/[category]/page.tsx:48-51`, `app/articles/[slug]/page.tsx:46-50` все эти запросы (`getStats`, `getTagsWithCounts`, `getArticles`, `getPublishedPosts`) выполняются параллельно, но на каждый rebuild ISR. На category-page вообще нет `revalidate` — она будет SSG один раз и навсегда (пока не задеплоят), либо при первом запросе пересчитается **каждый раз** в dev. Ставится в зависимость от Next defaults.
- **Рекомендация:** `_count` для tags, и зафиксировать `export const revalidate = 300` на всех ISR-страницах (сейчас есть только на `/`, `/vacancies`, `app/sitemap.ts`).

#### P1-8. `MDX_ALLOWED_ELEMENTS` экспортирован, но не используется — Decision 5 (allowlist) не enforced
- **Файлы:** `/home/claude/projects/digital-pub-/lib/articles.ts:119-127`, `/home/claude/projects/digital-pub-/app/articles/[slug]/page.tsx:133-136`
- **Проблема:** Decision 5 явно требует «explicit component allowlist (only safe HTML elements: h1-h6, p, ul, ol, li, a, img, code, pre, blockquote, table)». В коде есть экспорт `MDX_ALLOWED_ELEMENTS`, но при вызове `<MDXRemote source={article.content} options={...} />` параметр `components` **не передаётся**. Сейчас MDX рендерит всё подряд, включая `<script>`, `<iframe>` и кастомные JSX-компоненты, если они появятся в MDX. Comment на строке 129-132 в `[slug]/page.tsx` оправдывает это словами «MDX files are from our repo, not user-submitted» — что справедливо для security (см. отчёт security-auditor), но **противоречит** утверждённому решению Decision 5.
- Это пограничный случай: фактически уязвимости нет, пока MDX-файлы пишут только агенты. Но Decision 5 был именно про защиту в глубине (defense-in-depth).
- **Рекомендация:** либо реально передать `components={Object.fromEntries(MDX_ALLOWED_ELEMENTS.map(t => [t, t]))}` в MDXRemote (потребует более тонкой настройки, чтобы стили класса prose продолжили работать) — либо официально пометить Decision 5 как deviated с обоснованием (MDX-source доверенный) в `decisions.md`.

---

### P2 — улучшения (желательно сделать)

#### P2-1. `theme-switching` использует `setTimeout(450ms)` + `requestAnimationFrame×2` — race с переключателями в трёх местах
- **Файлы:** `HomePage.tsx:32-43`, `ListingPage.tsx:42-53`, `PageShell.tsx:19-30` — три точные копии `toggleDark`.
- **Проблема:** копи-паст логики темы; одинаковый bug одинаково везде. Если пользователь быстро ткнёт два раза по кнопке темы — таймаут 450мс не успевает сняться, класс `theme-switching` слетит раньше. Также эффект инициализации (`useEffect` с `localStorage.getItem('theme')`) одинаковый в 3 файлах.
- **Рекомендация:** вынести в кастомный хук `useTheme()` в `lib/useTheme.ts`. Один useEffect, один toggle, один useState.

#### P2-2. `Feed.tsx` — `FILTER_CHIPS` hardcoded, не sync с БД тегами
- **Файл:** `/home/claude/projects/digital-pub-/components/feed/Feed.tsx:7-15`
- **Проблема:** 7 chip-фильтров жёстко зашиты строками. Если добавить тег в seed — chip не появится автоматически. Также сравнение `tag.name.toLowerCase() === f.toLowerCase()` (строка 88) — fragile, лучше matching по slug.
- **Рекомендация:** принимать `chips: TagData[]` пропсом из server-component (например, из getTagsWithCounts с фильтром по типу specialization+format). И сравнивать по slug, не по name.

#### P2-3. `Feed.tsx` — fallback на text-based фильтрацию противоречит Decision 9
- **Файл:** `/home/claude/projects/digital-pub-/components/feed/Feed.tsx:91-97`
- **Проблема:** в коде есть fallback: если у поста нет тегов — делать текстовый поиск по title/description. По user-spec и Decision 9 теги назначаются автоматически при sync, плюс backfillTags на каждом запуске. Если пост не получил тегов — это либо баг матчера, либо реально не подходящий пост. Текстовый fallback маскирует проблему и возвращает в ленту посты, которые не должны попасть под фильтр.
- **Рекомендация:** убрать text-based fallback. Если хочется лояльности — добавить логирование postId без тегов в sync.

#### P2-4. `assignTags` в sync-telegram.ts: первый `createMany` после backfill добавит дубликаты PostTag для уже отмеченных постов
- **Файл:** `/home/claude/projects/digital-pub-/scripts/sync-telegram.ts:336-339, 386-398`
- **Проблема:** в `backfillTags` отбираются посты с `tags: { none: {} }`, но между `savePost` (который тоже вызывает `assignTags`) и `backfillTags` нет защиты от двойного запуска. Использование `skipDuplicates: true` спасает на уровне `createMany`, но это деталь Postgres ORM, не явный контракт. Также `matchTags` использует `indexOf` и `break`, что найдёт только первое вхождение keyword, и если у тега несколько keyword'ов — будет добавлен только один раз (ок, это правильно), но если у keyword разделители странные (например, `ui/ux` с слэшем) — regex `/[\s\.,;:!?\-—–()\/\[\]{}«»"'#@\n\r]/` обработает корректно, но текст вида `ui/ux дизайнер` — `ui/ux` начинается с `ui` (буква), а перед `dizajn` keyword не найдётся → ok, протестировано? Тест-кейсов про Cyrillic word-boundary не видно.
- **Рекомендация:** проверить unit-тесты matchTags, особенно edge cases типа `frontend-разработчик` (дефис как граница), `seotext` (НЕ должен матчиться), `SMM-щик` (должен).

#### P2-5. `RightSidebar.tsx` принимает `articles` prop, но в `HomePage` передаются только из `getArticles().map(...)` — клиентский компонент receives `Date`-ов нет
- **Файлы:** `RightSidebar.tsx`, `HomePage.tsx:27-32`
- Не дефект, но указывает на дублирование `formatArticleDate`: вызывается на server и data улетает в client. Один из аргументов в пользу того, чтобы держать article-list-related-block server-rendered (что и сделано в ArticlesPage и в `[slug]/page.tsx`).
- **Рекомендация:** норм, наблюдение.

#### P2-6. `JsonLd` использует `dangerouslySetInnerHTML` без экранирования `</script>` внутри JSON
- **Файл:** `/home/claude/projects/digital-pub-/components/JsonLd.tsx:6-12`
- **Проблема:** если в схеме появится строка с `</script>` (теоретически — заголовок статьи или описание) — будет XSS-уязвимость. Сейчас агенты пишут MDX из доверенного source, но описания статей попадают в Article schema через `article.description`, а описания — из MDX-фронтматтера.
- **Рекомендация:** в `JsonLd` сделать `.replace(/</g, '\\u003c')` для контента JSON. Это стандартная практика.

#### P2-7. `lib/posts.ts` — все `catch` молча возвращают пустой массив, единственный лог это `console.warn` без контекста
- **Файлы:** `lib/posts.ts:79-82, 100-103, 116-119, 144-146, 163-166`
- **Проблема:** при падении БД сайт превращается в пустой каталог без предупреждения пользователю. Логи не содержат stack trace, postId или query — отладить невозможно. Decision 9 явно зафиксировал «return empty array instead» вместо mock-fallback — ОК. Но логирование надо улучшить.
- **Рекомендация:** `console.error('[posts.fn]', e instanceof Error ? e.message : e)` с указанием функции.

#### P2-8. `getStats().groupBy(['company'])` — пустые компании отфильтрованы, но не учитывается case-insensitivity и пробелы
- **Файл:** `/home/claude/projects/digital-pub-/lib/tags.ts:94-97`
- «Яндекс» и «яндекс» посчитаются дважды. На прод-данных где company приходит из telegram-текста через парсинг (которого, кстати, в sync-telegram.ts **нет** — `company` всегда null!) — может оказаться, что counter «Компаний» всегда = 0 или 1 (включая null если бы не фильтр).
- **Рекомендация:** проверить на проде — в БД action item: посмотреть `SELECT DISTINCT company FROM "Post" WHERE company IS NOT NULL`. Возможно поле не используется и счётчик «Компаний» в LeftSidebar всегда показывает 0. Если так — убрать его из UI или начать парсить company из telegram-текста.

#### P2-9. CSP в next.config не настроен (Decision 11 это и не требует, но `X-Frame-Options: SAMEORIGIN` + JSON-LD inline стили не помешают CSP позже)
- Decision 11 явно отложил CSP в итерацию 2. Замечание для напоминания.

#### P2-10. Hardcoded subscriber counts в LeftSidebar: «14 200», «6 800», «9 300»
- **Файл:** `/home/claude/projects/digital-pub-/components/LeftSidebar.tsx:76-82`
- **Проблема:** user-spec acceptance: «Счётчики вакансий/резюме в сайдбаре — реальные из БД (не захардкожены)». Счётчики платформы — реальные (P1-7 ОК). Но **счётчики подписчиков соцсетей** захардкожены. Формально user-spec говорит про «вакансии/резюме», поэтому не нарушение. Но обманывает пользователя.
- **Рекомендация:** убрать конкретные цифры или подгружать из TG/VK API в фоне.

---

### P3 — нитпики

- **P3-1.** Inline-стиль `style={{ width: searchOpen ? 220 : 0, opacity: searchOpen ? 1 : 0 }}` в `Navbar.tsx:59` — мог быть `w-0/w-[220px] opacity-0/opacity-100` через Tailwind с `transition-all`.
- **P3-2.** `Navbar.tsx:168` — inline-стиль для descriptor-bar text. Можно через Tailwind tracking/text-xs.
- **P3-3.** `JobCard.tsx:101-103` — аватар цвета захардкожен (`bg-purple-100`); `TileCard.tsx:39-46` тот же узор раскрашен через `AVATAR_COLORS`. Inconsistency между двумя карточками — лучше унифицировать.
- **P3-4.** `prisma/seed.ts:5-9` — connection string fallback дублирует то же что в `lib/prisma.ts:5-6`. Извлечь в одно место.
- **P3-5.** В `app/page.tsx:33-75` 40 строк SEO-HTML inlined прямо в page.tsx — лучше вынести в `content/seo/home.ts` или MDX.
- **P3-6.** `lib/articles.ts:64` — `try { ... } catch {}` без логирования. Если MDX-файл сломан, тихо пропустится и никто не узнает. По checklist code-reviewing: «No empty catch blocks». P1, но в данном контексте файлы доверенные и сборка падает на TypeScript-ошибках — оставляю P3.
- **P3-7.** В `Feed.tsx:43` `// eslint-disable-next-line react-hooks/exhaustive-deps` — стандартный smell, видимо нужный из-за `onExternalTagConsumed` в closure. Не критично.
- **P3-8.** `sitemap.ts:5` BASE_URL хардкод — лучше env `process.env.NEXT_PUBLIC_SITE_URL`. Так же дублируется в `app/layout.tsx:13`, `app/page.tsx:10`, всех meta-блоках.
- **P3-9.** `next.config.mjs` не задана `experimental.serverComponentsExternalPackages: ['@prisma/client', 'pg']` — для production builds с adapter-pg это может вызвать варнинги/больший bundle. Проверить `npm run build` на warnings.
- **P3-10.** `JobCard.tsx:108-113` — кнопка «Сохранить» использует `useState`, **не персистентна**. user-spec roadmap iteration 3 говорит «Избранное с персистенцией» — ок, но сейчас кнопка ничего не делает после reload. Лучше убрать в MVP.

---

## 3. Strengths

- **Безопасный slug validation** через zod в `getTagBySlug`, `getPostBySlug`, `getArticleBySlug` + cross-check с filesystem allowlist для articles — Decision 10 выполнен корректно.
- **`lib/prisma.ts` singleton-pattern** с globalThis правильно реализован — Resource Mgmt OK.
- **Sanitize errors** в `sync-telegram.ts:484-487` — bot token не утечёт в логи.
- **ISR-разметка** на `/` и `/vacancies` правильно расставлена через `export const revalidate = 300`.
- **Bot API forwardMessage trick** в `downloadPhotoViaBotAPI` — нетривиальное и аккуратно сделанное решение с cleanup в `finally`. Это хорошая инженерия.
- **Schema.org разметка** (BreadcrumbList, Article, WebSite) в `JsonLd` — серьёзный SEO-плюс.
- **`PostType` enum** правильно типизирован, `tagType` поле используется консистентно для сортировки и группировки тегов в sidebar.
- **Параллельные Promise.all** на всех page.tsx — никаких waterfall-запросов в server-components.
- **`suppressHydrationWarning`** на date-fields в JobCard — корректное решение SSR/CSR mismatch (видимо, как раз fix из коммита `038afbb`).

---

## 4. Verdict

**Можно ли закрыть фичу через /done? — Условно ДА, но с deviation-фиксацией.**

Сайт работает в проде, основной user flow проходит (с оговоркой P0-2 — нужна проверка вручную, что страница вакансии открывается на проде; если она открывается — значит маршрут существует, но я его не вижу среди файлов task-list'а, что само по себе странно).

**Обязательны до /done:**

1. **P1-2: заполнить `decisions.md`** хотя бы кратко по 9 задачам с указанием deviations:
   - P1-1: deviation от Decision 6 (URL prefix `/tag/` не использован).
   - P1-4: deviation от Decision 1 (`dark:` модификатор не задействован).
   - P1-5: deviation от tech-spec AC (custom CSS classes остались).
   - P1-8: deviation от Decision 5 (allowlist не enforced, обоснование — trusted source).
2. **P0-1: разрешить противоречие robots-noindex и openGraph/canonical.** Если сайт реально под noindex — снять SEO-overhaul (или хотя бы commit-message не делать «comprehensive SEO overhaul»). Если открыт — убрать X-Robots-Tag.
3. **P0-2: проверить вручную на проде** что `/vacancies/{cat}/{slug}` отдаёт страницу вакансии, а не 404. Если 404 — это блокер /done, фича не выполняет AC «Открывает карточку вакансии — видит полное описание».

**Желательно до /done (P1):**

4. P1-3: вынести duplicate-utilities в `lib/postUtils.ts`. Это ~30 минут работы и снимает риск рассинхрона.
5. P1-6: hardcoded TAG_SLUGS в sitemap → запрос к БД.
6. P1-7: `_count` в getTagsWithCounts.

**Можно после /done в follow-up tickets:** все P2 и P3.

---

## Pipeline

- Если хочешь — передавать на dev для исправления P0-1, P0-2 и P1-2. Иначе фиксировать deviations в decisions.md и закрывать.
