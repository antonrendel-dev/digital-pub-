// ТЗ на статью — единый документ, который аналитик и SEO согласуют до написания,
// а после написания по нему же принимают статью.
//
// До 20.08.2026 завод шёл от темы к тексту без промежуточного документа: SEO-рисёрч
// отдавал разрозненные поля прямо в промпт писателя, и проверить статью было не по
// чему — приёмка сводилась к «выглядит нормально». ТЗ делает требования счётными:
// у каждого пункта есть проверяемая цифра или список.
//
// Два источника данных, у каждого своя роль:
//   Вордстат   — что и как часто спрашивают (частотность, уточняющие смыслы);
//   Топвизор   — где мы уже стоим и какая страница за ключ отвечает.
// Второй источник нужен ровно ради STOP-листа: если ключ уже закреплён за чужой
// страницей, новая статья по нему конкурирует с собственным сайтом.

import { boldKeyOccurrences, countPhraseForms, keyDefinitionOpener } from './keyword-match.js'
import fs from 'fs'
import path from 'path'
import { type LsiSelection, MAX_MAIN_KEY_USES, modifierWords, stems } from './lsi.js'

export interface TopvisorKeyword {
  keyword: string
  position: number | null
  relevantUrl: string
  volume?: number | null
}

export interface OwnedKeyword extends TopvisorKeyword {
  relevantUrl: string
}

export interface TopvisorContext {
  // Ключи темы, по которым мы стоим в 31-100: дожимать их должна страница-владелец,
  // а новая статья — сослаться на неё.
  pushUp: OwnedKeyword[]
  // Ключи темы, закреплённые за другими страницами на любых позициях.
  stopList: OwnedKeyword[]
  snapshotDate: string
}

export interface TechSpec {
  topicId: number
  title: string
  mainKeyword: string
  mainVolume: number | null
  audience: string
  intent: string
  metaTitle: string
  metaDesc: string
  maxMainKeyUses: number
  // Обязательные фразы: сколько раз каждая обязана встретиться — в любой
  // грамматической форме и порядке слов (с 04.09.2026; до того дословно).
  // Имя поля осталось: оно часть JSON-контракта с агентами analyst/seo.
  exactPhrases: { phrase: string; uses: number }[]
  // Разбавленные вхождения: смысл раскрывается, дословность не требуется.
  dilutedPhrases: string[]
  stopPhrases: { phrase: string; ownerUrl: string }[]
  interlinks: string[]
  h2Requirements: string[]
  wordCountMin: number
  wordCountMax: number
  faqMinWords: number
  factualAnchors: string[]
  antifakeMarkers: string[]
  agreedBy: string[]
}

// Путь к банку резолвит вызывающий: модуль остаётся чистым и проверяемым,
// а import.meta.dirname здесь ломает ts-jest, который грузит исходник как CJS.
export const SEMANTICS_RELATIVE_PATH = path.join('data', 'topvisor-semantics.json')

// Замеры Вордстата лежат рядом с банком и приклеиваются к нему по ключу. Без цифры
// занятый ключ и цель дожима выглядят равнозначными, и решение «сослаться или
// проигнорировать» принимается вслепую.
const VOLUMES_FILE = 'semantics-volumes.json'

// Ключ вида «<интент> <профессия>» состоит из двух частей, и разводит темы только
// вторая. Совпадение по интенту роднит «резюме дизайнера» с «резюме таргетолога» —
// это разные темы. Совпадение по профессии роднит «резюме таргетолога» с
// «вакансии таргетолог» — а это одна тема и реальный риск каннибализации.
// Поэтому в счёт идут только основы вне списка интентов.
const INTENT_STEMS = new Set(
  [
    'резюме',
    'вакансии',
    'вакансия',
    'зарплата',
    'работа',
    'профессия',
    'портфолио',
    'собеседование',
    'обучение',
    'курсы',
    'тестовое',
    'задание',
    'найти',
    'нанять',
    'стать',
    'опыта',
    'образец',
    'шаблон',
    'пример',
  ].map((w) => w.slice(0, 5))
)

export function loadTopvisorSemantics(file: string): {
  keywords: TopvisorKeyword[]
  snapshotDate: string
} {
  // Пустой банк — не нейтральное состояние: STOP-лист и перелинковка исчезают молча,
  // и статья уходит без защиты от каннибализации. Кричим, а не деградируем тихо.
  if (!fs.existsSync(file)) {
    console.warn(`[tz] Банк семантики Топвизора не найден: ${file}. STOP-лист будет пустым.`)
    return { keywords: [], snapshotDate: '' }
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as {
    keywords?: TopvisorKeyword[]
    snapshotDate?: string
  }
  const volumes = loadVolumes(path.join(path.dirname(file), VOLUMES_FILE))
  return {
    keywords: (raw.keywords ?? []).map((k) => ({ ...k, volume: volumes.get(k.keyword) ?? null })),
    snapshotDate: raw.snapshotDate ?? '',
  }
}

function loadVolumes(file: string): Map<string, number> {
  if (!fs.existsSync(file)) return new Map()
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as {
    seeds?: Record<string, { volume?: number }>
  }
  const out = new Map<string, number>()
  for (const [keyword, data] of Object.entries(raw.seeds ?? {})) {
    if (typeof data.volume === 'number') out.set(keyword, data.volume)
  }
  return out
}

/**
 * Фраза целиком содержит главный ключ? Такие вхождения нельзя требовать дословно:
 * каждое из них тратит бюджет главного ключа, а шесть обязательных мест его уже
 * выбирают. Вордстат отдаёт почти только такие фразы — их место в разбавленных.
 */
export function containsMainKeyword(phrase: string, mainKeyword: string): boolean {
  const phraseStems = new Set(stems(phrase))
  return stems(mainKeyword).every((s) => phraseStems.has(s))
}

// Брендовые запросы закреплены за главной и в STOP-лист попадать не должны:
// конкурировать с собственной главной по «диджитал паб» статья не может, а
// запретить писателю слово «digital» — значит запретить половину словаря.
//
// Ловятся они не по смыслу, а по механике сопоставления: в строку темы входит
// заголовок, а в заголовках у нас сплошь «digital-специалисту». На очереди из
// 40 тем это давало 24 брендовые позиции в STOP-листах у шести тем — ровно у
// тех шести, где в заголовке есть «digital».
const BRAND_PATTERN = /(диджитал\s*паб|digital\s*pub|d-?pub)/i

export function isBrandKeyword(keyword: string): boolean {
  return BRAND_PATTERN.test(keyword)
}

/** Общие основы двух фраз за вычетом интент-слов — то, что реально задаёт тему. */
export function sharedSubjectStems(a: string, b: string): string[] {
  const bStems = new Set(stems(b))
  return [...new Set(stems(a).filter((s) => bStems.has(s) && !INTENT_STEMS.has(s)))]
}

/**
 * Ключи Топвизора, относящиеся к теме. Учитываются только те, за которыми уже
 * закреплена посадочная: ключ без страницы ничего не запрещает и никуда не ведёт.
 */
export function buildTopvisorContext(
  topicKeyword: string,
  topicTitle: string,
  semantics: { keywords: TopvisorKeyword[]; snapshotDate: string }
): TopvisorContext {
  const subject = `${topicKeyword} ${topicTitle}`
  const related = semantics.keywords.filter(
    (k) =>
      k.relevantUrl &&
      !isBrandKeyword(k.keyword) &&
      sharedSubjectStems(k.keyword, subject).length > 0
  )

  const byPosition = [...related].sort((a, b) => (a.position ?? 999) - (b.position ?? 999))

  return {
    pushUp: byPosition.filter(
      (k) => k.position !== null && k.position > 30 && k.position <= 100
    ) as OwnedKeyword[],
    stopList: byPosition as OwnedKeyword[],
    snapshotDate: semantics.snapshotDate,
  }
}

const formatVolume = (volume: number | null | undefined): string =>
  typeof volume === 'number' ? ` — ${volume.toLocaleString()}/мес` : ''

/** Блок данных для промпта аналитика и SEO: цифры, а не пересказ. */
export function buildSourceDataBlock(
  mainKeyword: string,
  mainVolume: number | null,
  lsi: LsiSelection,
  tv: TopvisorContext
): string {
  const lines = [
    'ИСХОДНЫЕ ДАННЫЕ (замеры, не оценки)',
    '',
    `Главный ключ: "${mainKeyword}"${mainVolume === null ? '' : ` — ${mainVolume.toLocaleString()}/мес`}`,
    `Порог отсечения фраз: ${lsi.floor}/мес`,
  ]

  if (lsi.tail.length) {
    lines.push('', 'Уточняющие смыслы из Вордстата (что дописывают к главному ключу):')
    for (const p of lsi.tail) {
      lines.push(`  - ${modifierWords(p.phrase, mainKeyword)} — ${p.count.toLocaleString()}/мес`)
    }
  }

  if (tv.pushUp.length) {
    lines.push(
      '',
      `Наши позиции 31-100 по теме (снимок Топвизора ${tv.snapshotDate}) — эти ключи`,
      'дожимает страница-владелец, новая статья на них не претендует:'
    )
    for (const k of tv.pushUp) {
      lines.push(
        `  - "${k.keyword}"${formatVolume(k.volume)}, позиция ${k.position}, страница ${k.relevantUrl}`
      )
    }
  }

  if (tv.stopList.length) {
    lines.push(
      '',
      'ЗАНЯТЫЕ КЛЮЧИ. За каждым уже закреплена своя страница. Ставить их в title,',
      'H1 или H2 новой статьи нельзя — две наши страницы начнут конкурировать за один',
      'запрос, и Яндекс выберет одну сам. В тексте на такой ключ ставится ссылка:'
    )
    for (const k of tv.stopList) {
      lines.push(
        `  - "${k.keyword}"${formatVolume(k.volume)} → ${k.relevantUrl}` +
          `${k.position === null ? '' : ` (позиция ${k.position})`}`
      )
    }
  }

  return lines.join('\n')
}

/** ТЗ в виде текста для промпта писателя и для приёмки. */
export function renderTechSpec(tz: TechSpec): string {
  const lines = [
    'ТЕХНИЧЕСКОЕ ЗАДАНИЕ НА СТАТЬЮ',
    `Согласовано: ${tz.agreedBy.join(', ')}`,
    '',
    `Тема: ${tz.title}`,
    `Главный ключ: "${tz.mainKeyword}"${tz.mainVolume === null ? '' : ` (${tz.mainVolume.toLocaleString()}/мес)`}`,
    `Аудитория: ${tz.audience}`,
    `Интент: ${tz.intent}`,
    '',
    'META',
    `  title (${tz.metaTitle.length} симв): ${tz.metaTitle}`,
    `  description (${tz.metaDesc.length} симв): ${tz.metaDesc}`,
    '',
    'ВХОЖДЕНИЯ',
    `  Точная фраза "${tz.mainKeyword}" — не более ${tz.maxMainKeyUses} раз на всю статью.`,
    '  Дословно — только в title и description. В теле ключ склоняется и меняет',
    '  порядок слов как в живой речи; в первых 60 словах, в первом H2 и в одном ответе',
    '  FAQ он присутствует в любой форме. Не выделять ключ жирным. Не открывать',
    '  статью конструкцией «<ключ> — это …».',
  ]

  if (tz.exactPhrases.length) {
    lines.push('', '  Обязательные фразы (в любой грамматической форме и порядке слов, не реже):')
    for (const p of tz.exactPhrases) lines.push(`    - "${p.phrase}" — ${p.uses} раз`)
  }

  if (tz.dilutedPhrases.length) {
    lines.push(
      '',
      '  Разбавленные вхождения (смысл раскрыть, дословность не нужна — можно менять',
      '  падеж, порядок слов, вставлять слова внутрь):'
    )
    for (const p of tz.dilutedPhrases) lines.push(`    - ${p}`)
  }

  if (tz.stopPhrases.length) {
    lines.push(
      '',
      'STOP-ЛИСТ. Эти ключи закреплены за другими нашими страницами. В заголовках',
      'не использовать; при упоминании в тексте — ставить ссылку на владельца:'
    )
    for (const p of tz.stopPhrases) lines.push(`  - "${p.phrase}" → ${p.ownerUrl}`)
  }

  if (tz.interlinks.length) {
    lines.push('', 'ОБЯЗАТЕЛЬНАЯ ПЕРЕЛИНКОВКА (минимум по одной ссылке на каждый адрес):')
    for (const url of tz.interlinks) lines.push(`  - ${url}`)
  }

  if (tz.h2Requirements.length) {
    lines.push('', 'СТРУКТУРА H2 (смыслы, формулировка на усмотрение писателя):')
    for (const h of tz.h2Requirements) lines.push(`  - ${h}`)
  }

  lines.push(
    '',
    'ОБЪЁМ',
    `  Тело статьи: ${tz.wordCountMin}-${tz.wordCountMax} слов.`,
    `  Каждый ответ FAQ: не менее ${tz.faqMinWords} слов.`
  )

  if (tz.factualAnchors.length) {
    lines.push('', 'ФАКТУРА (обязана попасть в текст, с источником и датой):')
    for (const f of tz.factualAnchors) lines.push(`  - ${f}`)
  }

  if (tz.antifakeMarkers.length) {
    lines.push('', 'АНТИФЕЙК (опровергнуть в теле статьи):')
    for (const m of tz.antifakeMarkers) lines.push(`  - ${m}`)
  }

  return lines.join('\n')
}

export interface SpecViolation {
  rule: string
  detail: string
}

// Единственное нарушение, с которым статья не выходит: переспам — это риск фильтра,
// а не косметика, и опубликованный текст с ним вредит сильнее, чем пропущенный день.
export const OVERSPAM_RULE = 'Переспам главного ключа'
export const BOLD_KEY_RULE = 'Ключ выделен жирным'
export const TEMPLATE_PHRASE_RULE = 'Шаблонная фраза'

/**
 * Фразы, которые промпт когда-то требовал «один раз» — и модель ставила их
 * в каждую статью: «Мы разбираем тысячи вакансий…» в 13 файлах / 16 вхождений,
 * «Миф о том, что … неверен» в 8 файлах / 10 вхождений (аудит 04.09.2026,
 * срез content/articles). Первые две запрещены совсем,
 * «на самом деле» — не больше одного раза.
 */
const BANNED_TEMPLATES = ['мы разбираем тысячи вакансий', 'миф о том, что']
const LIMITED_TEMPLATES: { phrase: string; max: number }[] = [{ phrase: 'на самом деле', max: 1 }]
export const DEFINITION_OPENER_RULE = 'Статья открывается определением ключа'

/**
 * Механическая часть приёмки: то, что считается регуляркой, считается кодом, а не
 * запросом к модели. Агентам остаётся смысловая часть, где они действительно нужны.
 */
export function checkTechSpec(tz: TechSpec, markdown: string): SpecViolation[] {
  const violations: SpecViolation[] = []
  const lower = markdown.toLowerCase().replace(/ё/g, 'е')

  const countOf = (phrase: string): number => {
    const needle = phrase.toLowerCase().replace(/ё/g, 'е')
    if (!needle) return 0
    return lower.split(needle).length - 1
  }

  const mainUses = countOf(tz.mainKeyword)
  if (mainUses > tz.maxMainKeyUses) {
    violations.push({
      rule: OVERSPAM_RULE,
      detail: `"${tz.mainKeyword}" встречается ${mainUses} раз при лимите ${tz.maxMainKeyUses}`,
    })
  }

  // Обязательные фразы считаются по основам: «образец резюме без опыта работы»
  // засчитывается за «резюме без опыта работы образец». Дословный счёт заставлял
  // писателя вставлять форму поисковой строки — и статьи читались как SEO-тексты.
  for (const p of tz.exactPhrases) {
    const got = countPhraseForms(markdown, p.phrase)
    if (got < p.uses) {
      violations.push({
        rule: 'Недобор обязательной фразы',
        detail: `"${p.phrase}" (в любой форме) — ${got} из ${p.uses}`,
      })
    }
  }

  // Шаблоны ищутся с границей слова справа: «миф о том, чтобы…» — не шаблон.
  const templateHits = (phrase: string): number[] => {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![а-яё])', 'g')
    return [...lower.matchAll(re)].map((m) => m.index ?? 0)
  }
  const around = (index: number): string =>
    markdown
      .slice(Math.max(0, index - 30), index + 50)
      .replace(/\s+/g, ' ')
      .trim()
  for (const phrase of BANNED_TEMPLATES) {
    const hits = templateHits(phrase)
    if (hits.length) {
      violations.push({
        rule: TEMPLATE_PHRASE_RULE,
        detail: `«${phrase}» — ${hits.length} раз (…${around(hits[0])}…); перепиши своими словами, это фраза-шаблон из старого промпта`,
      })
    }
  }
  for (const { phrase, max } of LIMITED_TEMPLATES) {
    const hits = templateHits(phrase)
    if (hits.length > max) {
      violations.push({
        rule: TEMPLATE_PHRASE_RULE,
        detail: `«${phrase}» — ${hits.length} раз при лимите ${max}; лишнее: …${around(hits[max])}…`,
      })
    }
  }

  const bold = boldKeyOccurrences(markdown, tz.mainKeyword)
  if (bold.length) {
    violations.push({
      rule: BOLD_KEY_RULE,
      detail: `«${bold[0]}» — сними выделение, ключ жирным выдаёт SEO-текст`,
    })
  }
  const opener = keyDefinitionOpener(markdown, tz.mainKeyword)
  if (opener) {
    violations.push({
      rule: DEFINITION_OPENER_RULE,
      detail: `первое предложение начинается с «${opener}» — открой статью крючком (факт, число, наблюдение), а определение дай внутри первого H2`,
    })
  }

  // Заголовки проверяются отдельно: ключ из STOP-листа в теле статьи допустим и даже
  // нужен (там будет ссылка), а в H1/H2 он и создаёт конкуренцию страниц.
  const headings = markdown
    .split('\n')
    .filter((l) => /^#{1,3}\s/.test(l))
    .join('\n')
    .toLowerCase()
    .replace(/ё/g, 'е')
  for (const p of tz.stopPhrases) {
    if (headings.includes(p.phrase.toLowerCase().replace(/ё/g, 'е'))) {
      violations.push({
        rule: 'Занятый ключ в заголовке',
        detail: `"${p.phrase}" закреплён за ${p.ownerUrl}`,
      })
    }
  }

  for (const url of tz.interlinks) {
    if (!markdown.includes(url) && !markdown.includes(new URL(url).pathname)) {
      violations.push({ rule: 'Нет обязательной ссылки', detail: url })
    }
  }

  const words = markdown
    .replace(/[#*`>[\]()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
  if (words < tz.wordCountMin) {
    violations.push({
      rule: 'Недобор объёма',
      detail: `${words} слов при минимуме ${tz.wordCountMin}`,
    })
  }

  if (tz.metaTitle.length > 60) {
    violations.push({ rule: 'Длинный title', detail: `${tz.metaTitle.length} симв при лимите 60` })
  }
  if (tz.metaDesc.length < 130 || tz.metaDesc.length > 155) {
    violations.push({
      rule: 'Description вне 130-155',
      detail: `${tz.metaDesc.length} симв`,
    })
  }

  return violations
}

export { MAX_MAIN_KEY_USES }
