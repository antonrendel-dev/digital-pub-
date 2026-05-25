# Payload CMS v3 Integration Planning

Полное исследование архитектуры проекта Digital Pub для планирования интеграции Payload CMS v3.

## Документы исследования

### 1. **SUMMARY.md** — Краткое резюме (START HERE)

- Основные выводы по версиям
- Критические точки интеграции
- Маршруты для ISR invalidation
- Риски и рекомендации
- **Время чтения**: 5-10 минут

### 2. **code-research.md** — Полный анализ (REFERENCE)

- 14 разделов с подробным анализом
- Описание каждого компонента проекта
- Prisma схема и миграционная стратегия
- Next.js конфигурация и deploy процесс
- ISR реализация и переменные окружения
- Выводы и временная оценка
- **Время чтения**: 30-45 минут

### 3. **FILES_IMPACT.md** — Матрица воздействия

- Таблица всех затронутых файлов
- Приоритеты и сложность изменений
- Процесс миграции по блокам
- Файловая структура после интеграции
- **Время чтения**: 15-20 минут

## Быстрый старт

### Для менеджера/архитектора:

1. Прочитать **SUMMARY.md** (5 мин)
2. Оценить риски и временные рамки
3. Планировать спринты по 5 фазам

### Для разработчика:

1. Прочитать **SUMMARY.md** (5 мин)
2. Изучить **FILES_IMPACT.md** для понимания scope (15 мин)
3. Углубляться в **code-research.md** для каждой фазы

### Для DevOps:

1. Раздел "4. Deploy конфигурация" в **code-research.md**
2. Раздел "Deploy & ISR" в **FILES_IMPACT.md**
3. Рекомендация: настроить S3 для Payload media

## Ключевые числа

- **Текущая версия Next.js**: 14.2.35 → требуется 15.x
- **Текущая версия React**: 18 → требуется 19
- **Статей для миграции**: 10 MDX файлов
- **Prisma моделей**: 5 (Post, Tag, PostTag, Category, Article)
- **Маршрутов приложения**: 12 (6 основных + 6 с параметрами)
- **Компонентов для обновления**: ~12
- **Рекомендуемая продолжительность**: 10-15 дней

## Фазы миграции

```
Фаза 0: Подготовка                    (2-3 дня)
├─ Обновить Next.js 14 → 15
├─ Обновить React 18 → 19
├─ Установить Payload v3
└─ Создать payload.config.ts + middleware.ts

Фаза 1: Articles Collection           (2-3 дня)
├─ Создать Collection "Article"
├─ Миграционный script для 10 MDX
└─ Заменить MDX rendering на RichText

Фаза 2: Tags + Globals               (1-2 дня)
├─ Создать Collections и Globals
└─ Обновить компоненты

Фаза 3: Posts Collections            (3-4 дня)
├─ Создать Collections для Vacancy/Resume
└─ Миграция данных

Фаза 4: Deploy + ISR                 (2-3 дня)
├─ Настроить S3 для media
├─ Добавить ISR hooks
└─ Полное тестирование

ИТОГО: 10-15 дней
```

## Основные риски

| Риск                           | Вероятность | Решение                      |
| ------------------------------ | ----------- | ---------------------------- |
| Breaking changes Next.js 14→15 | HIGH        | Тестировать все маршруты     |
| ISR cache invalidation         | MEDIUM      | Payload hooks + API endpoint |
| Deploy удалит media files      | MEDIUM      | Использовать S3              |
| Миграция данных                | LOW         | Автоматизированные scripts   |

## Рекомендации

1. **Начать с Articles** (самые независимые данные)
2. **Использовать S3** для Payload media (не localhost)
3. **Тестировать ISR** тщательно
4. **Гибридный подход**: Payload для CMS + Prisma для читаемых операций
5. **Отдельная ветка**: `feature/payload-cms-v3`

## Критические файлы для обновления

**ОБЯЗАТЕЛЬНЫЕ**:

- `package.json` — версии и пакеты
- `payload.config.ts` — создать
- `middleware.ts` — создать
- `.github/workflows/deploy.yml` — env vars, rsync filters

**ВЫСОКИЙ ПРИОРИТЕТ**:

- `lib/articles.ts`, `lib/posts.ts`, `lib/tags.ts` — переписать на API
- `app/articles/[slug]/page.tsx` — MDX → RichText
- Все `app/*/page.tsx` маршруты — обновить queries

**СРЕДНИЙ ПРИОРИТЕТ**:

- `components/RightSidebar.tsx`, `TagsSidebar.tsx` — обновить fetching
- `app/articles/page.tsx` — добавить `revalidate`
- `next.config.mjs` — расширить CSP

## Список всех файлов проекта (для справки)

### Основные файлы

- `/home/claude/projects/digital-pub-/package.json` — версии
- `/home/claude/projects/digital-pub-/next.config.mjs` — конфигурация Next.js
- `/home/claude/projects/digital-pub-/tsconfig.json` — TypeScript
- `/home/claude/projects/digital-pub-/prisma/schema.prisma` — БД схема

### App маршруты

- `/app/layout.tsx` — root layout
- `/app/page.tsx` — home
- `/app/vacancies/page.tsx`, `[category]/page.tsx`, `[category]/[slug]/page.tsx`
- `/app/resumes/page.tsx`, `tag/[tagSlug]/page.tsx`
- `/app/articles/page.tsx`, `[slug]/page.tsx`
- `/app/privacy/page.tsx`, `/app/terms/page.tsx`

### Компоненты

- `components/Navbar.tsx`, `Footer.tsx`, `LeftSidebar.tsx`, `RightSidebar.tsx`
- `components/TagsSidebar.tsx`, `PostDetail.tsx`, `HomePage.tsx`, `ListingPage.tsx`
- `components/RelatedArticles.tsx`, `MetrikaHit.tsx`, `JsonLd.tsx`

### Lib функции

- `lib/articles.ts`, `lib/posts.ts`, `lib/tags.ts`, `lib/prisma.ts`
- `lib/config.ts`, `lib/postUtils.ts`, `lib/tag-matcher.ts`

### Deploy и конфигурация

- `.github/workflows/deploy.yml` — GitHub Actions
- `.env.example` — переменные окружения
- `.husky/`, `.eslintrc.json`, `.prettierrc` — линтинг

### Контент

- `/content/articles/` — 10 MDX файлов (будут мигрированы)
- `/public/` — assets, logo, images

## Контакты

**Автор анализа**: Claude  
**Дата**: 25.05.2026  
**Версия**: v1.0

---

**Для вопросов см. SUMMARY.md или code-research.md**
