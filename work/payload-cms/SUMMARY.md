# Краткое резюме: Payload CMS v3 Integration

## Статус исследования

✅ Полное сканирование кодовой базы завершено (25.05.2026)

## Основные выводы

### 1. Совместимость версий

| Компонент  | Текущая | Требуется | Статус             |
| ---------- | ------- | --------- | ------------------ |
| Next.js    | 14.2.35 | 15.x      | ⚠️ BREAKING CHANGE |
| React      | 18      | 19        | ⚠️ ОБНОВИТЬ        |
| Prisma     | 7.6.0   | 7.6.0+    | ✅ OK              |
| PostgreSQL | -       | -         | ✅ OK              |

### 2. Критические точки интеграции

#### Articles (10 MDX файлов)

- **Текущая реализация**: файлы в `/content/articles/`, чтение через `gray-matter`
- **Миграция**: Payload Collection с RichText Editor
- **Усилия**: Средние (есть 10 статей для миграции)

#### Posts (Vacancies/Resumes)

- **Текущая модель Prisma**: Post с типом (vacancy/resume), Category, Tags
- **Миграция**: 2 Payload Collections или 1 с discriminator field
- **Усилия**: Высокие (данные из API, нужно переписать queries)

#### Tags и Categories

- **Текущая реализация**: Prisma модели с SEO данными
- **Миграция**: Payload Collections или Globals
- **Усилия**: Средние

#### Globals (реюзабельные данные)

- Navigation links (navbar) — hardcoded
- Footer links — hardcoded
- Social channels — hardcoded в config
- Analytics IDs — env vars

### 3. Маршруты для ISR invalidation

```
/                    — force-dynamic (нужно revalidate при changes)
/vacancies           — force-dynamic
/vacancies/[cat]     — revalidate: 300
/vacancies/[cat]/[slug] — revalidate: 300
/resumes             — force-dynamic
/articles            — ⚠️ STATIC (нужно добавить revalidate!)
/articles/[slug]     — revalidate: 300
```

### 4. Deploy конфигурация

**Текущий процесс**: rsync с `--delete` для .next/

- ⚠️ Риск: удалит `/public/uploads/` если Payload хранит медиа локально
- **Решение**: настроить S3 для Payload media ИЛИ исключить uploads из rsync

### 5. Файлы для изменения

**ОБЯЗАТЕЛЬНЫЕ**:

- package.json (Next.js 15, React 19, Payload)
- next.config.mjs (CSP для /admin)
- .github/workflows/deploy.yml (env vars, rsync filters)
- .env.example (Payload secrets)

**СОЗДАТЬ**:

- payload.config.ts (Payload конфигурация)
- middleware.ts (auth для /admin)
- app/api/revalidate/route.ts (ISR endpoint)

**ОБНОВИТЬ**:

- lib/articles.ts (API queries вместо MDX)
- lib/posts.ts (API queries вместо Prisma)
- lib/tags.ts (API queries)
- app/articles/page.tsx (добавить revalidate)
- components/RightSidebar.tsx (articles fetching)

## Миграционный план (5 фаз)

```
Фаза 0: Подготовка (2-3 дня)
├─ Обновить Next.js 14 → 15
├─ Обновить React 18 → 19
├─ Установить Payload v3
└─ Создать payload.config.ts + middleware.ts

Фаза 1: Articles (2-3 дня)
├─ Создать Collection "Article"
├─ Миграционный script для 10 MDX файлов
└─ Заменить MDX rendering на Payload Rich Text

Фаза 2: Tags + Globals (1-2 дня)
├─ Создать Collection "Tag"
├─ Создать Globals (Navigation, Footer, SocialChannels, Analytics)
└─ Обновить компоненты для Globals

Фаза 3: Posts Collections (3-4 дня)
├─ Создать Collections "Vacancy" и "Resume"
├─ Миграция данных из Prisma
└─ Обновить все post-related queries

Фаза 4: Deploy + ISR (2-3 дня)
├─ Добавить Payload hooks для revalidatePath()
├─ Обновить deploy скрипт
├─ Настроить S3 для media
└─ Полное тестирование

ИТОГО: 10-15 дней
```

## Ключевые риски

| Риск                           | Вероятность | Воздействие | Решение                      |
| ------------------------------ | ----------- | ----------- | ---------------------------- |
| Breaking changes Next.js 14→15 | HIGH        | MEDIUM      | Тестировать все маршруты     |
| ISR cache invalidation         | MEDIUM      | HIGH        | Payload hooks + API endpoint |
| Deploy удалит uploads          | MEDIUM      | MEDIUM      | S3 storage или rsync filter  |
| Миграция данных                | LOW         | MEDIUM      | Автоматизированные scripts   |
| CSP конфликты                  | LOW         | LOW         | Расширить CSP для /admin     |

## Рекомендации

1. **Начать с Articles** (самые независимые данные)
2. **Использовать S3** для Payload media (не localhost)
3. **Тестировать ISR** с помощью watch script (измерять кэш-время)
4. **Гибридный подход**: оставить Prisma для read operations (если нужна синхронизация)
5. **Отдельная ветка** для разработки (feature/payload-cms-v3)

## Файлы отчета

- **code-research.md** — полный анализ с 14 разделами (798 строк)
- **SUMMARY.md** — этот краткий справочник

---

Для начала: запустить `git checkout -b feature/payload-cms-v3` и начать с Фазы 0 (подготовка).
