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

import fs from 'fs'
import path from 'path'
import { type LsiSelection, MAX_MAIN_KEY_USES, modifierWords, stems } from './lsi.js'

export interface TopvisorKeyword {
  keyword: string
  position: number | null
  relevantUrl: string
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
  // Точные вхождения: фраза и сколько раз она обязана встретиться дословно.
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
  return { keywords: raw.keywords ?? [], snapshotDate: raw.snapshotDate ?? '' }
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
    (k) => k.relevantUrl && sharedSubjectStems(k.keyword, subject).length > 0
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
      lines.push(`  - "${k.keyword}" — позиция ${k.position}, страница ${k.relevantUrl}`)
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
        `  - "${k.keyword}" → ${k.relevantUrl}${k.position === null ? '' : ` (позиция ${k.position})`}`
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
    '  Места обязательных вхождений: title, H1, первые 60 слов, первый H2, один ответ',
    '  FAQ, meta description. Всё сверх — переспам.',
  ]

  if (tz.exactPhrases.length) {
    lines.push('', '  Точные вхождения (дословно, с указанным числом раз):')
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

  for (const p of tz.exactPhrases) {
    const got = countOf(p.phrase)
    if (got < p.uses) {
      violations.push({
        rule: 'Недобор точного вхождения',
        detail: `"${p.phrase}" — ${got} из ${p.uses}`,
      })
    }
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
