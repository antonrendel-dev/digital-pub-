/**
 * Content Factory — Writer v2 (MDX Edition)
 * Pipeline: Wordstat Research → SEO Analysis → Plan → Draft → Review → Image → Deploy
 */

import { execSync, spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { sendMessage } from './lib/telegram.js'
import { fetchWordstatKeywords } from './lib/yandex.js'

const DATA_DIR = path.join(import.meta.dirname, 'data')
const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..')
const ARTICLES_DIR = path.join(PROJECT_ROOT, 'content', 'articles')
const IMAGES_DIR = path.join(PROJECT_ROOT, 'public', 'images', 'posts')
const SITE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://d-pub.ru'

const CODEX_BIN = path.join(os.homedir(), '.npm-global', 'bin', 'codex')
const CODEX_HOME = path.join(os.homedir(), '.codex')
const REFERENCE_IMAGE = path.join(import.meta.dirname, 'reference.webp')

const PERSPECTIVES = [
  'face-on front view, character faces the viewer directly',
  '3/4 front-left angle, character turned slightly away to the left',
  'side profile from the right, character looks forward',
  'over-the-shoulder view from mid-height, character seen from waist up',
  'close-up head-and-shoulders portrait, character fills the frame',
]

const SETTINGS = [
  'corner table in a cozy coffee shop, warm wooden interior, other blurred customers in the background',
  'rooftop terrace at dusk with city lights below, outdoor bistro table with a phone and drink',
  'park bench under a tree, dappled sunlight, green surroundings with a path behind',
  'home kitchen table with morning light through window, kettle and plants on the sill',
  'library nook between tall bookshelves, soft reading lamp, a few books stacked nearby',
  'small meeting room corner with a whiteboard covered in diagrams and sticky notes',
  'coworking open space, rows of desks visible in background, industrial lamps above',
  'train window seat, landscape moving outside, small fold-out tray table',
  'balcony with railing, evening sky, city view or garden behind the character',
  'university campus outdoor seating area, other students in the distance',
]

const TRANSLIT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .split('')
    .map((c) => TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

interface Topic {
  id: number
  title: string
  keyword: string
  audience: string
  type: string
  trafficEst: string
  approved?: boolean
  published?: boolean
  competitive?: boolean
  singleAgent?: boolean
}

interface ArticleResult {
  markdown: string
  metaTitle: string
  metaDesc: string
  slug: string
  tags: string[]
  imagePrompt: string
  wordstatKeywords: string[]
}

// ─── H2-шаблоны по типу контента (programmatic-seo) ─────────────────────────

const OUTLINE_HINTS: Record<string, string> = {
  Гайд: 'Пошаговая структура: definition block → зачем нужно → как сделать (шаги 1-3) → типичные ошибки → итог + CTA',
  Сравнение:
    'Структура: definition block → критерии оценки → таблица сравнения вариантов → кому что подходит → вывод + CTA',
  Чеклист:
    'Структура: definition block → зачем этот чеклист → блок 1 → блок 2 → блок 3 → как применить → CTA',
  Кейс: 'Структура: definition block → контекст задачи → решение → реализация → результаты с цифрами → выводы + CTA',
  Конспект:
    'Структура: definition block → источник и контекст → ключевые идеи (3-4) → практика → адаптация для рунета + CTA',
}

// ─── Claude helper ───────────────────────────────────────────────────────────

function askClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', prompt], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d: Buffer) => (out += d.toString()))
    child.stderr.on('data', (d: Buffer) => (err += d.toString()))
    child.on('close', (code) => {
      if (code === 0) resolve(out.trim())
      else reject(new Error(err || `claude завершился с кодом ${code}`))
    })
    child.on('error', reject)
  })
}

// ─── Codex image generation ──────────────────────────────────────────────────

function snapshotGeneratedImages(): Set<string> {
  const generatedDir = path.join(CODEX_HOME, 'generated_images')
  const images = new Set<string>()
  if (!fs.existsSync(generatedDir)) return images
  for (const session of fs.readdirSync(generatedDir)) {
    const sessionDir = path.join(generatedDir, session)
    try {
      for (const file of fs.readdirSync(sessionDir)) {
        if (file.endsWith('.png') || file.endsWith('.webp') || file.endsWith('.jpg')) {
          images.add(path.join(sessionDir, file))
        }
      }
    } catch {}
  }
  return images
}

function findNewImage(before: Set<string>): string | null {
  const after = snapshotGeneratedImages()
  for (const img of after) {
    if (!before.has(img)) return img
  }
  return null
}

function convertToWebP(srcPng: string, destWebp: string): void {
  const script = `
    import('${path.join(PROJECT_ROOT, 'node_modules', 'sharp', 'lib', 'index.js')}')
      .then(m => m.default('${srcPng}').resize(900, 450, {fit:'cover'}).webp({quality:85}).toFile('${destWebp}'))
      .then(() => process.exit(0))
      .catch(e => { console.error(e.message); process.exit(1); })
  `
  execSync(`node --input-type=module`, {
    input: script,
    cwd: PROJECT_ROOT,
    timeout: 30000,
    stdio: ['pipe', 'inherit', 'inherit'],
  })
}

async function generateImageWithCodex(
  imagePrompt: string,
  slug: string,
  topicId: number
): Promise<string | null> {
  if (!fs.existsSync(CODEX_BIN)) {
    console.log('[writer] Codex CLI не найден, пропускаю генерацию картинки')
    return null
  }

  const before = snapshotGeneratedImages()
  const perspIdx = topicId % PERSPECTIVES.length
  const perspective = PERSPECTIVES[perspIdx]
  const fullPrompt =
    `Match the pixel art style of the attached reference image exactly: ` +
    `ultra-fine dense pixel grain (NOT blocky large pixels), bright warm cozy atmosphere (NOT dark, NOT muddy, NOT desaturated), ` +
    `rich amber, golden and soft cream tones throughout — warm inviting palette, ` +
    `single clear light source creating volumetric depth: bright highlights on lit surfaces and well-defined soft shadows for 3D volume, ` +
    `rich surface textures, smooth gradients via fine dithering, ` +
    `high pixel density giving a near-painterly look, calm lofi RPG mood, no watermark, no photorealism. ` +
    `MANDATORY: include exactly 1 human person (male or female based on topic) prominently in the foreground. ` +
    `CHARACTER ANGLE: ${perspective}. ` +
    `BACKGROUND: rich with many objects and environmental details filling the scene — NO text or letters anywhere. ` +
    `SCENE: ${imagePrompt}. ` +
    `Generate this pixel art image now.`

  const refArg = fs.existsSync(REFERENCE_IMAGE) ? ['-i', REFERENCE_IMAGE] : []

  const runCodex = () =>
    new Promise<void>((resolve) => {
      const child = spawn(
        CODEX_BIN,
        [
          'exec',
          '--dangerously-bypass-approvals-and-sandbox',
          '--model',
          'gpt-5.5',
          fullPrompt,
          ...refArg,
        ],
        {
          env: { ...process.env, CODEX_HOME },
          stdio: 'ignore',
          timeout: 240000,
        }
      )
      child.on('close', () => resolve())
      child.on('error', () => resolve())
    })

  console.log('[writer] Запускаю Codex для генерации картинки...')
  await runCodex()
  let newImage = findNewImage(before)

  if (!newImage) {
    console.log('[writer] Codex не создал изображение, повторная попытка...')
    await runCodex()
    newImage = findNewImage(before)
  }

  if (!newImage) {
    console.log('[writer] Codex не создал новое изображение (2 попытки)')
    return null
  }

  console.log(`[writer] Новое изображение: ${newImage}`)
  fs.mkdirSync(IMAGES_DIR, { recursive: true })
  const destWebp = path.join(IMAGES_DIR, `${slug}.webp`)

  try {
    convertToWebP(newImage, destWebp)
    console.log(`[writer] WebP сохранён: ${destWebp}`)
    return `/images/posts/${slug}.webp`
  } catch (e) {
    console.warn('[writer] Конвертация в WebP не удалась, копирую PNG:', (e as Error).message)
    const destPng = path.join(IMAGES_DIR, `${slug}.png`)
    fs.copyFileSync(newImage, destPng)
    return `/images/posts/${slug}.png`
  }
}

// ─── Article generation pipeline ─────────────────────────────────────────────

async function generateMdxArticle(topic: Topic): Promise<ArticleResult> {
  // ШАГ 1: Wordstat keyword research
  console.log('[writer] Шаг 1: Wordstat keyword research...')
  const wordstatRaw = await fetchWordstatKeywords(topic.keyword)
  const wordstatTop = wordstatRaw.filter((k) => k.count > 0).slice(0, 15)
  const wordstatKeywords = wordstatTop.map((k) => k.phrase)

  const wordstatBlock =
    wordstatTop.length > 0
      ? `\nРЕАЛЬНЫЕ ДАННЫЕ ИЗ WORDSTAT (используй эти ключи органично в тексте):\n` +
        wordstatTop
          .map((k) => `  - "${k.phrase}" — ${k.count.toLocaleString()} запросов/мес`)
          .join('\n')
      : ''

  if (wordstatTop.length > 0) {
    console.log(
      `[writer] Wordstat: ${wordstatTop.length} ключей, топ: "${wordstatTop[0].phrase}" (${wordstatTop[0].count}/мес)`
    )
  }

  // ШАГ 1б: SEO-рисерч
  const settingIdx = (topic.id + 3) % SETTINGS.length
  const forcedSetting = SETTINGS[settingIdx]
  console.log('[writer] Шаг 1б: SEO-рисерч...')
  const research = await askClaude(`Ты SEO-аналитик для русскоязычного рынка digital-вакансий.

Проведи рисерч для статьи по теме: "${topic.title}"
Ключевое слово: "${topic.keyword}"
Аудитория: ${topic.audience}
${wordstatBlock}

Выдай JSON строго в таком формате (без лишнего текста):
{
  "intent": "информационный|коммерческий|навигационный",
  "lsi": ["слово1", "слово2", "слово3", "слово4", "слово5", "слово6", "слово7", "слово8"],
  "painPoints": ["боль читателя 1", "боль читателя 2", "боль читателя 3"],
  "competitorH2s": ["типичный H2 конкурента 1", "типичный H2 конкурента 2", "типичный H2 конкурента 3"],
  "uniqueAngle": "чем наша статья будет отличаться и лучше конкурентов",
  "dataGaps": ["каких конкретных данных не хватает для фактурного текста 1", "2"],
  "successCriteria": ["featured snippet на запрос X", "минимум 3 источника с данными", "CTA на /vacancies/..."],
  "tags": ["тег1", "тег2"],
  "imagePrompt": "English scene description for pixel-art hero image. REQUIRED: 1 human character (choose male or female based on article topic) is the main subject. MANDATORY SETTING — use exactly this location: ${forcedSetting}. Describe what the character is doing, their clothing (casual or professional), and 2-3 specific objects related to the article topic placed in this setting. 2-3 sentences max. Do NOT specify camera angle. No text visible anywhere in the image."
}`)

  const researchMatch = research.match(/\{[\s\S]*\}/)
  if (!researchMatch) throw new Error('SEO-рисерч не вернул JSON')
  const seoData = JSON.parse(researchMatch[0]) as {
    intent: string
    lsi: string[]
    painPoints: string[]
    competitorH2s: string[]
    uniqueAngle: string
    dataGaps: string[]
    successCriteria: string[]
    tags: string[]
    imagePrompt: string
  }

  // ШАГ 2: Планирование
  console.log('[writer] Шаг 2: Планирование структуры...')
  const outlineHint = OUTLINE_HINTS[topic.type] ?? ''

  const outline = await askClaude(`Ты контент-стратег. Составь детальный план статьи.

ТЕМА: ${topic.title}
КЛЮЧ: ${topic.keyword}
ТИП: ${topic.type}
${outlineHint ? `ОБЯЗАТЕЛЬНЫЙ ШАБЛОН ДЛЯ ЭТОГО ТИПА: ${outlineHint}` : ''}
ИНТЕНТ: ${seoData.intent}
LSI-слова: ${seoData.lsi.join(', ')}
Боли аудитории: ${seoData.painPoints.join('; ')}
Уникальный угол: ${seoData.uniqueAngle}
Чего не хватает для фактурного текста: ${(seoData.dataGaps || []).join('; ')}

Требования к плану:
- 5-7 блоков H2
- ПЕРВЫЙ H2 — definition block: чёткое определение темы, что это такое (для AI-SEO и featured snippets)
- Каждый H2 раскрывает конкретную боль или вопрос аудитории
- ПРЕДПОСЛЕДНИЙ H2 — призыв смотреть вакансии на d-pub.ru
- ПОСЛЕДНИЙ H2 — FAQ: 4-8 частых вопросов по теме (для featured snippets и AI-цитирования)
- Не дублируй структуру конкурентов: ${seoData.competitorH2s.join('; ')}

ПРАВИЛА СТРУКТУРЫ H2 (обязательно):
- FAN-OUT: каждый H2 раскрывает РАЗНЫЙ аспект — не повторяй один угол в двух блоках. Один H2 = один интент (Query Decomposition)
- ENTITY ATTRIBUTE COVERAGE (3.12): для статей о профессии план ОБЯЗАН покрыть ≥9 из 11 атрибутов:
  1. Покрытие (чем занимается специалист)
  2. Условия (когда нужен такой специалист)
  3. Стоимость (зарплата, стоимость обучения)
  4. Числовые параметры (конкретные диапазоны зарплат с источником)
  5. Сроки (время на обучение, карьерный горизонт)
  6. Форматы работы (офис/удалёнка, регионы)
  7. Каналы поиска работы (d-pub.ru, hh.ru)
  8. Исключения (кому не подходит — сценарии отказа)
  9. Алгоритм входа (шаги: учёба → портфолио → работа)
  10. Пошаговое руководство (конкретные действия)
  11. Отличия от альтернатив (сравнение со смежными профессиями)
- H2 КАК ПОД-ВОПРОС (9.3a): формулируй каждый H2 как точный суб-вопрос читателя — не noun phrase, а вопрос («Сколько зарабатывает X?», «Какие навыки нужны?»)
- PLURAL SYMMETRY (1.4k): чередуй ед. и мн. число в заголовках — если H2 в ед.ч. («аналитик»), следующий должен быть в мн.ч. («аналитики»). Критично для русскоязычного SEO
- DECISION SUPPORT (5.1h): если тема — профессия или карьера, добавь два обязательных H2 перед FAQ:
  а) «Кому эта профессия не подойдёт» — маркированный список 3-5 конкретных сценариев с цифрами
  б) «Таблица сценариев: кому какой путь выбрать» — таблица 5-7 строк: Ситуация | Рекомендация | Причина
- ANSWER TYPE COVERAGE (9.1d): план должен покрывать ≥5 разных типов H2 из 12: definition (что такое), numerical_fact (зарплата/числа), process_step_modal (как войти/сделать), comparison (vs другая профессия), list_set_membership (навыки/инструменты). Для каждого H2 в поле keyPoints укажи тип: «[definition]», «[numerical_fact]» и т.д.
- 8 ФУНКЦИЙ H2 (9.8): обеспечь покрытие ≥6 из 8 функций: DEFINITION / MECHANICS (как стать) / CONSTRAINTS (требования) / SEGMENTATION (для кого) / COMPARISON (vs альтернатива) / ACTUALITY (данные за текущий год) / DIAGNOSTICS (что делать если) / PLURAL BRIDGE
- TITLE (4.1e): metaTitle — ключ в первых 20-30 символах (буквально), длина 55-65 симв., конкретная выгода или цифра рядом с ключом. Title ≠ H1 дословно.
- FAQ ИЗ ПОИСКА (1.4j): последний H2 FAQ должен содержать вопросы из реальных запросов («как», «почему», «можно ли», «сколько»), не придуманные. Закрой обязательные кластеры: «можно ли без образования», «сколько учиться», «удалёнка», «переход из другой профессии».

Выдай JSON (без лишнего текста):
{
  "h2s": [
    {
      "title": "Заголовок H2",
      "keyPoints": ["тезис 1", "тезис 2"],
      "factualAnchors": ["конкретный факт или цифра который обязан попасть в этот блок", "2"]
    }
  ],
  "metaTitle": "SEO заголовок строго до 60 символов с ключевым словом",
  "metaDesc": "SEO описание строго 130-155 символов, раскрывает пользу статьи",
  "slug": "url-slug-latinicej-bez-russkikh-bukv"
}`)

  const outlineMatch = outline.match(/\{[\s\S]*\}/)
  if (!outlineMatch) throw new Error('Планировщик не вернул JSON')
  const plan = JSON.parse(outlineMatch[0]) as {
    h2s: { title: string; keyPoints: string[]; factualAnchors?: string[] }[]
    metaTitle: string
    metaDesc: string
    slug: string
  }

  // ШАГ 3: Черновик
  console.log('[writer] Шаг 3: Пишу черновик...')
  const planText = plan.h2s
    .map((h, i) => {
      const anchors = (h.factualAnchors || []).length
        ? `\n   Фактурные якоря (обязательно включи): ${h.factualAnchors!.join('; ')}`
        : ''
      return `${i + 1}. ${h.title}\n   Тезисы: ${h.keyPoints.join('; ')}${anchors}`
    })
    .join('\n')

  const dataGapsBlock = (seoData.dataGaps || []).length
    ? `\nЧЕГО НЕ ХВАТАЕТ ДЛЯ ФАКТУРНОГО ТЕКСТА: ${seoData.dataGaps.join('; ')}\n— Не придумывай эти данные. Пиши диапазон или ссылайся на открытые источники.`
    : ''
  const successBlock = (seoData.successCriteria || []).length
    ? `\nКРИТЕРИИ УСПЕХА ЭТОЙ СТАТЬИ: ${seoData.successCriteria.join('; ')}`
    : ''

  const baseWriterPrompt = `Ты опытный SEO-копирайтер для российского рынка digital-вакансий.

Напиши статью для d-pub.ru — job board для digital-специалистов.

ТЕМА: ${topic.title}
КЛЮЧЕВОЕ СЛОВО: "${topic.keyword}" — используй в первом абзаце и максимум 6 раз по тексту
LSI-слова из поиска (вплети органично): ${seoData.lsi.join(', ')}
АУДИТОРИЯ: ${topic.audience}
${dataGapsBlock}${successBlock}

ПЛАН (строго следуй этой структуре):
${planText}

ПРАВИЛА НАПИСАНИЯ (обязательно, мастер-промпт v6.6):

LEAD FORMULA (9.8a): первые 3 предложения статьи строго по формуле — это BERT-поле №3 Яндекса и главный кандидат на featured snippet:
  — Предложение 1: ≤12 слов, называет главную сущность и ключевой квалификатор. Без вводных слов. Ключ буквально.
  — Предложение 2: ≤18 слов, конкретная цифра + источник с датой (hh.ru, SuperJob, Росстат). ОБЯЗАТЕЛЬНО.
  — Предложение 3: ≤15 слов, главная выгода или вывод для читателя.
  Пример для профессии: «Аналитик данных — одна из самых быстрорастущих IT-профессий в России. По данным hh.ru за 2025 год, медианная зарплата составляет 160 000 руб. в месяц. Войти в профессию без профильного образования реально — достаточно портфолио.»

T_PLURAL_CONTEXT (9.9b): в LEAD обязательно добавь мост между ед. и мн. числом главной сущности:
  Шаблон: «[Профессия ЕД] — один из видов [профессий МН], которых [число/факт с источником].»
  Пример: «Аналитик данных — один из видов digital-специалистов, которых hh.ru насчитывает более 8 000 активных вакансий в России.»
  Это создаёт plural bridge в Knowledge Graph — страница покрывает запросы в обеих формах числа.

ATOMIC ANSWER (2.2): первое предложение каждого H2 = прямой ответ на вопрос блока, самодостаточный без контекста. Читатель понимает суть без чтения предыдущих блоков. Объём первого абзаца H2: 2-4 предложения, 300-400 символов.

BERT-ЯНДЕКС (4.1b): ключевое слово "${topic.keyword}" буквально (не перефразируя, не синонимами) — в первых 60 словах статьи. Это BERT-поле №3 Яндекса с непропорциональным весом.

BM25TP-ЯКОРЬ (2.2b): рядом с первым вхождением ключа в тексте (в первых 60 словах и в каждом основном H2) должны стоять ≥3 тематических слов из реальных поисковых запросов. Яндекс оценивает семантическое окружение ±10 слов от ключа. Тематические слова берутся из LSI-слов и Wordstat.

АНТИФЕЙК TRUST (2.6c): в тексте добавь 1-3 антифейк-маркера — явно опровергни распространённые мифы о профессии со ссылкой на источник. Пример: «Диплом профильного ВУЗа не является обязательным требованием — по данным hh.ru, 67% вакансий аналитика данных не требуют высшего образования по специальности.» Антифейк-маркеры дают уникальный AIO-сигнал.

BANNED (2.8b + 2.8c + переходы-роботы): запрещены без исключений:
  — Вводные слова: однако, таким образом, следует отметить, стоит сказать, необходимо учитывать
  — Газетный стиль: в ходе исследования, по имеющимся данным, как стало известно
  — Канцелярит: осуществляется, является, в рамках, в целях, на сегодняшний день
  — Номинализации: осуществление → делать, принятие решения → решить, проведение анализа → анализировать
  — МЕТАЗАЧИНЫ (5-я категория): «По запросу X пользователи ищут...», «Многие задаются вопросом...», «Запрос набирают N раз...»
  — Broad claims без доказательств: «самый востребованный», «огромный спрос», «лучшие перспективы»
  — Переходы-роботы: «подводя итог», «в заключение», «резюмируя», «перейдём к», «рассмотрим», «обратимся к», «как уже было отмечено», «как уже упоминалось», «в данном разделе», «в этой части», «не менее важно отметить», «стоит также упомянуть»

ЖИВОЙ ГОЛОС (анти-роботные паттерны):
  — РИТМ: после длинного предложения (15+ слов) — короткое (5-8 слов). В каждом H2-блоке минимум одно такое. Пример: «…более 8 000 вакансий в России. Рынок перегрет. Войти можно.»
  — ПОЗИЦИЯ: 1-2 раза в тексте занимай однозначную позицию — «это миф», «на самом деле», «никто об этом не говорит, но». Без «некоторые считают, другие думают».
  — КОНКРЕТИКА: после слова «например» — только конкретное имя, число или ситуация. Никогда «например, крупные компании» или «например, IT-сфера».
  — АСИММЕТРИЯ: 1-2 раза напиши абзац из одного предложения как ритмический удар. Это должен быть неожиданный факт или вывод, не вводная мысль.
  — ГОЛОС РЕДАКЦИИ: один раз добавь фразу от лица d-pub.ru: «Мы разбираем тысячи вакансий каждую неделю и замечаем: [конкретное наблюдение по теме статьи].» Вставь органично в блок о рынке или требованиях.

ТАБЛИЦЫ (2.4): минимум 1 таблица на каждые 1500 слов. Для профессий обязательна зарплатная таблица (уровень × регион × медиана) и/или таблица навыков. Таблица должна быть самодостаточной — понятной без чтения текста вокруг.

БИГРАММЫ GSC (1.4i): из Wordstat-ключей выше используй топ-биграммы органично в тексте H2-блоков — в абзацах, подзаголовках H3, FAQ-вопросах. Биграмма в первом предложении H2 = максимальный сигнал для Яндекса.

НЕ СПАМИТЬ (2.7b): главное ключевое слово — строго ≤6 вхождений по всему тексту. Расставь его в 6 стратегических местах: Title, H1, lead, первый H2 основной секции, один FAQ-ответ, meta description. Дальше ключ только естественным образом.

CONFIDENCE (9.6e) — три типа утверждений, не смешивать:
  ① Верифицированный факт — обязательно источник с датой: «по данным hh.ru за 2025 год»
  ② Отраслевая норма — «по данным крупных job-платформ»
  ③ Рекомендация — «рекомендуется», «оптимально»
  ЗАПРЕЩЕНЫ broad claims без доказательств: «самый востребованный», «огромный спрос», «лучшие перспективы».

ЖИВОСТЬ (9.7b): внутри каждого абзаца 1-3 раза заменяй главный ключ синонимом или местоимением. Не повторяй главный ключ в каждом предложении — это размывает BERT-вектор Яндекса. Запрещено: заменять ключ синонимом в Title, H1 и первом предложении каждого H2.

Требования к структуре (AI-SEO + featured snippets):
- DEFINITION BLOCK: первый абзац статьи — 2-3 предложения, чётко отвечают на "что такое ${topic.keyword}". Самодостаточный — AI может процитировать отдельно.
- Каждый ключевой тезис — отдельный абзац 40-60 слов (оптимально для AI-цитирования)
- Включай конкретные цифры и данные (hh.ru, SuperJob, Яндекс.Работа) хотя бы в 3 местах
- FAQ секция в конце: формат "### Вопрос?" → ответ 2-3 предложения, самодостаточный, не более 8 вопросов. Каждый вопрос закрывает кластер, НЕ покрытый основным телом.
- Упомяни d-pub.ru как источник вакансий 1-2 раза органично со ссылкой [/vacancies](/vacancies)
- FRESHNESS: в первом абзаце явно укажи дату («на [текущий месяц и год]», «по данным за 2025 год»). Отсутствие даты — DateUnreliability сигнал для Google.
- OUTLINKS (oslScore): в теле статьи сделай 3-5 ссылок на авторитетные источники (hh.ru, SuperJob, Росстат, профессиональные ресурсы).

ANSWER TYPE (9.1d): каждый H2-блок пиши в соответствующем формате — первое предложение определяется типом блока:
  — definition → чёткое определение в первом предложении
  — numerical_fact → число/диапазон в первом предложении
  — process_step_modal → «чтобы X, нужно...» или нумерованные шаги
  — comparison → ключевое различие между A и B в первом предложении
  — list_set_membership → «существует N видов/типов...»
  Минимум 5 разных типов на статью. Нельзя писать H2 без реальных данных (unsupported).

8 ФУНКЦИЙ (9.8): текст должен покрывать ≥6 из 8 функций: DEFINITION (что такое) / MECHANICS (как стать/работает) / CONSTRAINTS (что нужно, требования) / SEGMENTATION (для кого) / COMPARISON (vs альтернативы) / ACTUALITY (данные за 2025 год) / DIAGNOSTICS (что делать если) / PLURAL BRIDGE (мост ед./мн. числа).

РИСК ФАКТА (9.6b): зарплатные и числовые данные — только с источником и датой. Если данных одного источника нет или они устарели — пиши диапазон «по данным крупных job-платформ — от N до M». Никогда не пиши одну конкретную цифру зарплаты без атрибуции «по данным hh.ru за [год]».

Объём: 1200-1600 слов.
ТОЛЬКО ПОДТВЕРЖДЁННЫЕ ФАКТЫ: не придумывай конкретные суммы зарплат, численность специалистов, количество вакансий. Если точных данных нет — пиши диапазон: «по данным крупных job-платформ — от N до M».
Markdown: ## для H2, ### для H3, **жирный**, таблицы, маркированные списки.`

  let markdown = ''

  if (!topic.singleAgent) {
    console.log('[writer] Режим: конкурентная генерация (3 агента)...')

    const directions = [
      {
        name: 'Прямой заход',
        desc: `НАПРАВЛЕНИЕ: Прямой заход
Как выглядит: главная идея — в первом предложении. Без крючков, без интриги. Сразу факт или вывод. Структура линейная: тезис → доказательства → следствие. Читатель с первой фразы знает зачем читает.
Как НЕ выглядит: "В этой статье мы разберём...", риторические вопросы в начале, долгое введение перед сутью.`,
      },
      {
        name: 'Тезис-инсайт',
        desc: `НАПРАВЛЕНИЕ: Тезис-инсайт
Как выглядит: начинается с острого утверждения или парадокса. Дальше — доказательство через неочевидную зависимость. Концовка — разворот или вывод, который читатель не предугадал.
Как НЕ выглядит: банальный вывод в конце, пересказ очевидного, нейтральный тон без позиции.`,
      },
      {
        name: 'Аналитика',
        desc: `НАПРАВЛЕНИЕ: Аналитика
Как выглядит: несколько пластов разбора одного вопроса. Каждый H2 добавляет новый угол, а не просто следующий пункт. Вывод открытый — читатель сам применяет к своей ситуации.
Как НЕ выглядит: один угол зрения, прямолинейный пересказ, однозначный вывод в финале.`,
      },
    ]

    const drafts = await Promise.all(
      directions.map((dir) =>
        askClaude(
          `${baseWriterPrompt}\n\n${dir.desc}\n\nВерни ТОЛЬКО Markdown статьи — без JSON, без пояснений.`
        ).then((raw) => {
          const mdStart = raw.indexOf('## ')
          return mdStart !== -1 ? raw.slice(mdStart).trim() : raw.trim()
        })
      )
    )

    console.log('[writer] Шаг 3б: Редактор компилирует...')
    const compiled =
      await askClaude(`Ты главный редактор. Получаешь три черновика одной статьи, написанных с разных жанровых углов.

ТЕМА: ${topic.title}
КЛЮЧЕВОЕ СЛОВО: "${topic.keyword}"
КРИТЕРИИ УСПЕХА: ${(seoData.successCriteria || []).join('; ')}

ЧЕРНОВИК 1 (Прямой заход):
${drafts[0]}

ЧЕРНОВИК 2 (Тезис-инсайт):
${drafts[1]}

ЧЕРНОВИК 3 (Аналитика):
${drafts[2]}

ЗАДАЧА:
1. Оцени каждый черновик по шести критериям: крючок, угол, голос, воздействие на читателя, верность теме, фактичность
2. Вырежи сильнейшие куски из каждого
3. Сшей в один связный текст, сохранив структуру H2 из аутлайна
4. Отредактируй по Ильяхову:
   — активный залог (было сделано → сделали)
   — без канцелярита (осуществлять → делать, является → есть, в рамках → в)
   — без оценочных слов без доказательств (лучший, эффективный, уникальный)
   — каждый абзац — одна конкретная мысль
   — режь воду, добавляй фактуру взамен
5. T_PLURAL: добавь переходы между ед. и мн. числом — если в тексте «аналитик», добавь контекст где говорится «аналитики» (и наоборот), чтобы статья покрывала оба запроса.
6. РИТМ: проверь каждый H2-блок — есть ли короткое предложение (5-8 слов) после длинного? Если все предложения примерно одинаковой длины — добавь ритмический удар.
7. ПОЗИЦИЯ: есть ли в тексте 1-2 момента где текст говорит «это миф» или «на самом деле»? Если нет — добавь в один из блоков.
8. КОНКРЕТИКА: найди все «например, [общее слово]» и замени на конкретное имя компании, число или ситуацию. «Например, IT-компании» → «например, Яндекс или небольшой продуктовый стартап».
9. АСИММЕТРИЯ: добавь 1 абзац из одного предложения как ритмический акцент — неожиданный факт или вывод.
10. РОБОТНЫЕ ПЕРЕХОДЫ: найди и удали «подводя итог», «перейдём к», «как уже было отмечено», «в данном разделе», «рассмотрим», «не менее важно». Начни абзац сразу с содержательного факта.
11. Объём финального текста: 1200-1600 слов

Верни ТОЛЬКО финальный Markdown — без пояснений и комментариев.`)

    const mdStart = compiled.indexOf('## ')
    markdown = (mdStart !== -1 ? compiled.slice(mdStart) : compiled).trim()
  } else {
    const article = await askClaude(
      `${baseWriterPrompt}\n\nСТИЛЬ — пиши именно как главред Максим Ильяхов («Пиши, сокращай»): активный залог, без вводных слов и канцелярита (осуществлять → делать, является → есть), без оценочных слов без доказательств («лучший», «уникальный», «эффективный»), каждый абзац — одна конкретная мысль.\n\nОтветь строго в формате JSON (без лишнего текста):\n{"markdown": "## Заголовок\\n\\nТекст статьи..."}`
    )
    const articleMatch = article.match(/\{[\s\S]*\}/)
    if (!articleMatch) throw new Error('Writer не вернул JSON')
    try {
      const parsed = JSON.parse(articleMatch[0]) as { markdown: string }
      markdown = parsed.markdown
    } catch {
      const mdStart = article.indexOf('## ')
      if (mdStart !== -1) {
        markdown = article.slice(mdStart)
      } else {
        throw new Error('Writer не вернул правильный JSON и не нашлось Markdown')
      }
    }
    markdown = markdown.trim()
  }

  // ШАГ 3в: Nudge-ревизия
  console.log('[writer] Шаг 3в: Nudge-ревизия...')
  const nudgeBiasIds = new Set([44, 34, 166, 202, 210, 208, 108, 40, 32, 100, 96, 36, 206, 172, 78])
  type NudgeBias = { id: number; title: string; description: string; usage: string }
  const allBiases = (
    JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'nudge-biases.json'), 'utf-8')) as {
      biases: NudgeBias[]
    }
  ).biases
  const nudgeCatalog = allBiases
    .filter((b) => nudgeBiasIds.has(b.id))
    .map((b) => `• ${b.title}: ${b.description.slice(0, 130)} → ${b.usage.slice(0, 130)}`)
    .join('\n')

  const nudged = await askClaude(`Ты копирайтер с экспертизой в поведенческой психологии.

АУДИТОРИЯ: ${topic.audience}
ТЕМА: ${topic.title}

БИБЛИОТЕКА ТЕХНИК (15 приёмов поведенческой психологии):
${nudgeCatalog}

ЗАДАЧА:
1. Прочитай статью и выбери 2-3 техники из библиотеки, наиболее органичных для этой темы и аудитории
2. Точечно примени их — измени или дополни 2-3 конкретных места в тексте
3. НЕ переписывай статью целиком, НЕ добавляй явно манипулятивных крючков
4. Текст остаётся информационным — техники усиливают подачу, не давят на читателя
5. Сохраняй объём 1200-1600 слов

СТАТЬЯ:
${markdown}

Верни ТОЛЬКО финальный Markdown — без пояснений и комментариев.`)

  const nudgedStart = nudged.indexOf('## ')
  markdown = (nudgedStart !== -1 ? nudged.slice(nudgedStart) : nudged).trim() || markdown

  // ШАГ 4: Ревью (только SEO — стиль уже выправлен)
  console.log('[writer] Шаг 4: Ревью и улучшение...')
  const titleLen = plan.metaTitle.length
  const descLen = plan.metaDesc.length

  const dataGapsReview = (seoData.dataGaps || []).length
    ? `ЧЕГО НЕ ХВАТАЛО ДЛЯ ФАКТУРНОГО ТЕКСТА: ${seoData.dataGaps.join('; ')}\n`
    : ''
  const successReview = (seoData.successCriteria || []).length
    ? `КРИТЕРИИ УСПЕХА: ${seoData.successCriteria.join('; ')}\n`
    : ''

  const reviewed =
    await askClaude(`Ты строгий SEO-редактор. Проверь статью по SEO-требованиям — стиль уже выправлен.

КЛЮЧЕВОЕ СЛОВО: "${topic.keyword}"
META TITLE (${titleLen} симв${titleLen > 60 ? ', СЛИШКОМ ДЛИННЫЙ — укороти до 60' : ', ок'}): "${plan.metaTitle}"
META DESC (${descLen} симв${descLen < 130 ? ', СЛИШКОМ КОРОТКИЙ — расширь до 130-155' : descLen > 155 ? ', СЛИШКОМ ДЛИННЫЙ — сократи до 155' : ', ок'}): "${plan.metaDesc}"
${dataGapsReview}${successReview}
СТАТЬЯ:
${markdown}

ЗАДАЧИ:
1. Definition block — первый абзац чётко отвечает на "что такое ${topic.keyword}"? Если нет — добавь.
2. FAQ — есть 4-8 вопросов в формате ### Вопрос? + самодостаточный ответ? Если нет — добавь.
3. Плотность ключевого слова "${topic.keyword}": не более 6 вхождений всего в тексте. Удали лишние.
4. Факты: нет выдуманных конкретных цифр? Замени диапазоном «по данным крупных job-платформ — от N до M».
5. Достигнуты ли критерии успеха? Если нет — исправь.
6. Meta title и desc — укороти/расширь до нужного размера если помечено выше.
7. SPAM FLOOR: уникальных тематических терминов в тексте должно быть 8-20 (проверь — если меньше 8, текст бедный; больше 20 — признак спама).
8. FRESHNESS: есть ли явная дата в тексте («на [текущий месяц и год]»)? Если нет — добавь в первый абзац.
9. SCROLL SCORE: каждый H2 начинается с самодостаточного ответа? Если первое предложение после H2 непонятно без предыдущего контекста — перепиши его.
10. ANSWER TYPE РАЗНООБРАЗИЕ (9.1d): в тексте ≥5 разных типов H2? Проверь: есть ли definition (что такое), numerical_fact (числа/зарплата), process_step_modal (шаги), comparison (vs альтернатива)? Если типы однообразны — перепиши 1-2 блока.
11. TITLE (4.1e): ключ "${topic.keyword}" стоит в первых 20-30 символах metaTitle буквально? Длина 55-65 символов? Есть конкретная цифра или выгода? Если нет — исправь.
12. РОБОТНОСТЬ: найди и замени все переходы-роботы («подводя итог», «перейдём к», «как уже отмечалось», «в данном разделе», «рассмотрим подробнее») — начни абзац сразу с факта. Проверь: есть ли хотя бы одно короткое предложение (до 8 слов) в каждом блоке?

Верни ТОЛЬКО финальный Markdown текст статьи — без пояснений, без JSON, без комментариев.`)

  const finalMarkdown = reviewed.trim().startsWith('##')
    ? reviewed.trim()
    : reviewed.indexOf('## ') !== -1
      ? reviewed.slice(reviewed.indexOf('## ')).trim()
      : markdown

  return {
    markdown: finalMarkdown,
    metaTitle: plan.metaTitle,
    metaDesc: plan.metaDesc,
    slug: toSlug(plan.slug || topic.title),
    tags: Array.isArray(seoData.tags) ? seoData.tags : [],
    imagePrompt: seoData.imagePrompt || '',
    wordstatKeywords,
  }
}

// ─── Schema JSON-LD (schema-markup skill) ────────────────────────────────────

function buildArticleSchema(
  topic: Topic,
  result: ArticleResult,
  publishedAt: string,
  articleUrl: string
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: result.metaTitle,
    description: result.metaDesc,
    datePublished: publishedAt,
    dateModified: publishedAt,
    author: {
      '@type': 'Organization',
      name: 'Диджитал Паб',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Диджитал Паб',
      url: SITE_URL,
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    keywords: [topic.keyword, ...result.tags, ...result.wordstatKeywords.slice(0, 5)].join(', '),
  }
  return JSON.stringify(schema)
}

// ─── MDX frontmatter builder ─────────────────────────────────────────────────

function buildMdxFrontmatter(
  topic: Topic,
  result: ArticleResult,
  publishedAt: string,
  imageUrl: string | null
): string {
  const tags = result.tags.length ? JSON.stringify(result.tags) : '[]'
  const imageLine = imageUrl ? `\nimageUrl: "${imageUrl}"` : ''
  const articleUrl = `${SITE_URL}/articles/${result.slug}`
  const schemaLine = `\nschemaJsonLd: '${buildArticleSchema(topic, result, publishedAt, articleUrl)}'`

  return `---
title: "${topic.title.replace(/"/g, '\\"')}"
slug: "${result.slug}"
description: "${result.metaDesc.replace(/"/g, '\\"')}"
metaTitle: "${result.metaTitle.replace(/"/g, '\\"')}"
metaDescription: "${result.metaDesc.replace(/"/g, '\\"')}"
publishedAt: "${publishedAt}"
tags: ${tags}${imageLine}${schemaLine}
---
`
}

// ─── Git ─────────────────────────────────────────────────────────────────────

function getLatestTopicsFile(): string {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('topics_') && f.endsWith('.json'))
    .sort()
    .reverse()
  if (!files.length) throw new Error('Нет файлов с темами. Сначала запусти analyst.js')
  return path.join(DATA_DIR, files[0])
}

function markTopicPublished(topicsFile: string, topicId: number): void {
  const raw = JSON.parse(fs.readFileSync(topicsFile, 'utf-8')) as {
    date: string
    topics: Topic[]
  }
  const topic = raw.topics.find((t) => t.id === topicId)
  if (topic) topic.published = true
  fs.writeFileSync(topicsFile, JSON.stringify(raw, null, 2))
}

function gitCommitAndPush(slug: string, title: string, hasImage: boolean): void {
  const mdxPath = path.join('content', 'articles', `${slug}.mdx`)
  execSync(`git add "${mdxPath}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' })
  if (hasImage) {
    execSync(`git add "public/images/posts/${slug}.*" 2>/dev/null || true`, {
      cwd: PROJECT_ROOT,
      shell: '/bin/bash',
    })
  }
  const message = `feat: add article "${title}"`
  execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: PROJECT_ROOT, stdio: 'inherit' })
  execSync('git push', { cwd: PROJECT_ROOT, stdio: 'inherit' })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const topicNum = parseInt(process.argv[2])
  if (isNaN(topicNum)) {
    console.error('Использование: node writer.compiled.js <topicNum>')
    process.exit(1)
  }

  const topicsFile = getLatestTopicsFile()
  const { topics } = JSON.parse(fs.readFileSync(topicsFile, 'utf8')) as { topics: Topic[] }
  const topic = topics.find((t) => t.id === topicNum)
  if (!topic) throw new Error(`Тема #${topicNum} не найдена в ${topicsFile}`)

  console.log(`[writer] Пишу статью: "${topic.title}"`)
  await sendMessage(
    `✍️ Генерирую статью #${topicNum}:\n<b>${topic.title}</b>\n\n` +
      `🔍 Wordstat → SEO-рисерч → 📋 план → ✏️ черновик → 🔎 ревью → 🎨 картинка\n\n` +
      `Это займёт ~5 минут...`
  )

  // Шаги 1-4: генерация статьи
  const result = await generateMdxArticle(topic)
  console.log(`[writer] Статья готова, slug: ${result.slug}`)

  // Проверяем что slug не занят
  const mdxPath = path.join(ARTICLES_DIR, `${result.slug}.mdx`)
  if (fs.existsSync(mdxPath)) {
    result.slug = `${result.slug}-${Date.now().toString(36)}`
    console.log(`[writer] Slug скорректирован: ${result.slug}`)
  }

  // Шаг 5а: картинка через Codex
  console.log('[writer] Шаг 5: Генерирую картинку...')
  const imageUrl = result.imagePrompt
    ? await generateImageWithCodex(result.imagePrompt, result.slug, topic.id)
    : null

  if (imageUrl) {
    console.log(`[writer] Картинка готова: ${imageUrl}`)
  } else {
    console.log('[writer] Картинка не сгенерирована, публикуем без неё')
  }

  // Шаг 5б: записываем MDX и деплоим
  const publishedAt = new Date().toISOString().split('T')[0]
  const frontmatter = buildMdxFrontmatter(topic, result, publishedAt, imageUrl)
  const mdxContent = frontmatter + '\n' + result.markdown

  fs.mkdirSync(ARTICLES_DIR, { recursive: true })
  fs.writeFileSync(path.join(ARTICLES_DIR, `${result.slug}.mdx`), mdxContent)
  console.log(`[writer] Файл создан: content/articles/${result.slug}.mdx`)

  try {
    gitCommitAndPush(result.slug, topic.title, imageUrl !== null)
    console.log('[writer] Git push выполнен ✓')
  } catch (e) {
    console.error('[writer] Git push не удался:', e)
    await sendMessage(`⚠️ Статья написана, но git push не удался:\n${(e as Error).message}`)
    process.exit(1)
  }

  markTopicPublished(topicsFile, topicNum)

  const articleUrl = `${SITE_URL}/articles/${result.slug}`
  const wordstatInfo =
    result.wordstatKeywords.length > 0
      ? `\n🔑 Wordstat ключей использовано: ${result.wordstatKeywords.length}`
      : '\n🔑 Wordstat: fallback на Claude LSI'
  const imageStatus = imageUrl
    ? `🎨 Картинка: ✅ автоматически`
    : `🎨 Картинка: ❌ не сгенерирована`

  await sendMessage(
    `✅ <b>Статья опубликована!</b>\n\n` +
      `📌 ${topic.title}\n` +
      `${wordstatInfo}\n` +
      `${imageStatus}\n\n` +
      `🔗 <a href="${articleUrl}">${articleUrl}</a>\n\n` +
      `⏳ Деплой займёт ~3 минуты`
  )

  console.log(`[writer] Готово: ${articleUrl}`)
}

main().catch((e) => {
  console.error('[writer] Ошибка:', e)
  sendMessage(`❌ Ошибка при генерации статьи:\n${e.message}`).catch(() => {})
  process.exit(1)
})
