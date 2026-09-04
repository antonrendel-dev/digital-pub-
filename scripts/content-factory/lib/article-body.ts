/**
 * Тело статьи из сырого ответа модели — с сохранением лида.
 *
 * Модель на каждой стадии завода отдаёт текст в одном и том же виде:
 *
 *   **Title:** …            (или `META TITLE: …`, или YAML-frontmatter `---…---`)
 *   **Meta description:** …
 *   # H1
 *   абзац-крючок (один-два)
 *   ## первый H2
 *
 * До 04.09.2026 все стадии резали ответ по первому `## ` и выбрасывали
 * всё выше — вместе с крючком, который тот же промпт требует написать
 * (правило 9.8a). 76 из 86 статей на сайте начинались с определения
 * термина, хотя в стенограммах крючок был на каждой стадии.
 *
 * Здесь из преамбулы убирается только служебное: frontmatter, строки
 * Title/Meta, заголовки любого уровня (страница рендерит H1 из
 * frontmatter), метка роли, списки и болтовня вроде «Вот статья:».
 * Абзацы крючка остаются и встают перед первым H2.
 *
 * Страховки возвращают старое поведение (лид выброшен, в лог —
 * предупреждение): если в лиде остался служебный маркер, из-за которого
 * публикация упала бы на `hasServiceText`; если «лид» длиннее
 * LEAD_MAX_WORDS — это уже не крючок, а рассуждения модели. А если
 * стадия-шлифовщик (nudge, SEO-ревью, круг правок) вернула текст без
 * лида, хотя на входе он был, — лид входа приклеивается обратно:
 * иначе крючок терялся бы молча ровно там, где этот модуль его спасает.
 */
import { stripRoleTag } from './agent-role.js'
import { hasServiceText } from '../../../lib/strip-service-tail'

/** Крючок по промпту — 2–3 предложения. Всё, что заметно длиннее, не крючок. */
export const LEAD_MAX_WORDS = 250

/**
 * Строка-лейбл метаданных: `**Title:**`, `**Title**: x`, `META TITLE:`,
 * `**Title (H1):**`, `Заголовок H1:`. Двоеточие может стоять и внутри
 * болда, и снаружи; после лейбла значение может идти на следующей строке.
 */
const META_LABEL =
  /^\s*(?:\*\*)?\s*(?:Title|Meta\s*title|Meta\s*description|Description|H1|Title\s*tag|Заголовок(?:\s*H1)?|Мета-?(?:описание|заголовок))(?:\s*\([^)]*\))?\s*(?:tag)?\s*(?:\*\*)?\s*:\s*(?:\*\*)?\s*(.*)$/i

/**
 * Не крючок по форме: заголовок любого уровня, горизонтальная черта,
 * fence, JSON, метка роли отдельной строкой, пункт списка. Нумерация
 * только одно-двузначная и с заглавной после номера: «2026. Год, когда…»
 * и «10. место занимает Россия…» — крючки, «1. Целевую должность.» — пункт.
 */
const STRUCTURAL_LINE =
  /^\s*(?:#{1,6}\s|-{3,}\s*$|```|\{|\[[A-Z]+\]\s*$|[-*•]\s|\d{1,2}[.)]\s+(?=[A-ZА-ЯЁ*_\[`«"]))/

/**
 * Болтовня модели перед текстом. Три формы: любая строка преамбулы с
 * двоеточием на конце («Вот статья:», «Внёс правки по пунктам 3 и 8:»);
 * строка от первого лица с отчётным глаголом («Я применил две техники.»);
 * строка, начинающаяся с отчётного слова, в которой есть и предмет отчёта —
 * статья, текст, версия, правки, пункты, техники («Ниже — финальная версия
 * статьи.», «Готово. Исправленный текст.»). Одно отчётное слово без
 * предмета — не улика: «Ниже среднего по рынку платят 40 % стартовых
 * вакансий» и «Финальный отбор проходят 3 из 100» — крючки. Голое
 * «Готово.» из одного-трёх слов без цифр — болтовня.
 * «Вот» в списке нет: «Вот почему 39 % откликов…» — законный крючок,
 * а «Вот статья:» ловится двоеточием. `\b` и `\w` в JS не знают
 * кириллицы — хвосты слов через [а-яё].
 */
const CHATTER_COLON = /:\s*$/
const REPORT_WORD =
  /^\s*(?:ниже|готово|финальн[а-яё]*|итогов[а-яё]*|обновл[а-яё]*|обновил[а-яё]*|исправл[а-яё]*|исправил[а-яё]*|переписа[лн][а-яё]*|применил[а-яё]*|внёс|внес|добавил[а-яё]*|сохранил[а-яё]*|учёл|учел|статья\s+(?:готова|ниже))(?=[\s,.:—-]|$)/i
const REPORT_SUBJECT = /стать[а-яё]*|текст|верси[а-яё]*|правк|пункт|техник|изменен/i
const FIRST_PERSON_REPORT =
  /^\s*я\s+(?:применил|внёс|внес|добавил|исправил|переписал|обновил|сохранил|учёл|учел)/i

/**
 * Отчёт без отчётного слова в начале: «Правки внесены по всем пунктам
 * статьи.» — предмет правок и слово-действие в одной строке, и ни одной
 * цифры (крючок по промпту несёт число).
 */
const REPORT_OBJECT = /правк|пункт|техник|верси/i
const REPORT_ACTION = /внесен|применен|обновлен|исправлен|стать[а-яё]*|текст/i

function isChatter(line: string): boolean {
  if (CHATTER_COLON.test(line) || FIRST_PERSON_REPORT.test(line)) return true
  const noDigits = !/\d/.test(line)
  if (REPORT_WORD.test(line)) {
    return REPORT_SUBJECT.test(line) || (wordCount(line) <= 3 && noDigits)
  }
  return noDigits && REPORT_OBJECT.test(line) && REPORT_ACTION.test(line)
}

export interface ArticleBody {
  /** Абзацы до первого H2 без служебного. Пусто, если крючка нет или он отброшен. */
  lead: string
  /** Текст с первого `## ` и до конца. */
  body: string
  /** Что уходит дальше по конвейеру: лид + пустая строка + тело. */
  markdown: string
  /** Почему лид отброшен целиком, если отброшен. Для лога стадии. */
  dropped?: 'service-text' | 'too-long'
  /** Строки преамбулы, снятые как болтовня или структура (не Title/Meta/H1). Для лога. */
  filtered: string[]
}

/** Начало тела: первый H2 в начале строки. `### Что изменено` содержит `## ` со смещением — ловушка. */
export function bodyStart(raw: string): number {
  return raw.search(/^## /m)
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

/** Для сравнения текста стадий: без разметки, регистра и лишних пробелов. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * YAML-frontmatter в преамбуле — целиком, с любыми ключами. Блок узнаётся
 * по строкам `ключ: значение` между парой `---`: две горизонтальные черты
 * вокруг абзаца крючка — не frontmatter. Может стоять не с первой строки
 * («Вот статья:» перед ним).
 */
function dropFrontmatter(preamble: string): string {
  return preamble.replace(/(?:^|\n)\s*---\s*\n(?:[\w-]+:.*\n)+---\s*(?=\n|$)/, '\n')
}

function splitLead(preamble: string): { lead: string; filtered: string[] } {
  const lines = dropFrontmatter(preamble).split('\n')
  const kept: string[] = []
  const filtered: string[] = []
  let swallowNextValue = false

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '')
    if (!line.trim()) {
      kept.push('')
      swallowNextValue = false
      continue
    }
    if (swallowNextValue) {
      // Значение лейбла сразу на следующей строке: «**Meta description:**\nТекст…».
      // Через пустую строку — уже абзац, его не трогаем.
      swallowNextValue = false
      filtered.push(line.trim())
      continue
    }
    const meta = line.match(META_LABEL)
    if (meta) {
      if (!meta[1].trim()) swallowNextValue = true
      continue
    }
    // H1 — ожидаемая часть ответа, страница рендерит его из frontmatter. В лог не идёт.
    if (/^\s*#\s/.test(line)) continue
    if (STRUCTURAL_LINE.test(line) || isChatter(line)) {
      filtered.push(line.trim())
      continue
    }
    kept.push(line)
  }

  const lead = kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { lead, filtered }
}

export function extractArticleBody(raw: string): ArticleBody {
  const text = stripRoleTag(raw ?? '').replace(/\r\n/g, '\n')
  const start = bodyStart(text)
  if (start === -1) {
    const body = text.trim()
    return { lead: '', body, markdown: body, filtered: [] }
  }

  const preamble = text.slice(0, start)
  let body = text.slice(start).trim()
  // Модель обернула ответ в fence: открывающая была в преамбуле, закрывающая
  // остаётся в хвосте тела — снимаем пару целиком.
  if (/^\s*```/m.test(preamble)) body = body.replace(/\n```\s*$/, '').trim()

  const { lead, filtered } = splitLead(preamble)

  if (!lead) return { lead: '', body, markdown: body, filtered }
  if (hasServiceText(lead)) {
    return { lead: '', body, markdown: body, dropped: 'service-text', filtered }
  }
  if (wordCount(lead) > LEAD_MAX_WORDS) {
    return { lead: '', body, markdown: body, dropped: 'too-long', filtered }
  }
  return { lead, body, markdown: `${lead}\n\n${body}`, filtered }
}

/**
 * Замена старого `raw.slice(raw.indexOf('## '))` во всех стадиях: тот же
 * контракт (строка на входе — строка на выходе), но лид не теряется.
 *
 * `stage` — для лога. `previous` — текст, который стадия получила на вход:
 * если у него был лид, а стадия вернула тело без лида, лид входа
 * приклеивается обратно с предупреждением. Guard по объёму (60 %) такую
 * потерю не замечает — 40 слов на 2000.
 */
export function keepLead(raw: string, stage: string, previous?: string): string {
  const parsed = extractArticleBody(raw)
  if (parsed.dropped) {
    console.warn(
      `[writer] ${stage}: лид отброшен (${parsed.dropped === 'service-text' ? 'служебный текст' : `длиннее ${LEAD_MAX_WORDS} слов`})`
    )
  }
  if (parsed.filtered.length > 0) {
    console.warn(
      `[writer] ${stage}: из преамбулы снято ${parsed.filtered.length} стр.: ${parsed.filtered
        .map((l) => `«${l.slice(0, 60)}»`)
        .join(', ')}`
    )
  }
  if (!parsed.lead && parsed.body && previous) {
    const before = extractArticleBody(previous).lead
    if (before) {
      // Стадия могла не выбросить крючок, а перенести его в первый раздел
      // (SEO-ревью просит именно это не делать, но делает). Тогда сверху
      // его не возвращаем — иначе крючок выйдет дважды и ключ посчитается лишний раз.
      const firstSentence = normalize(before.split(/(?<=[.!?…])\s/)[0] ?? before)
      if (firstSentence && normalize(parsed.body).includes(firstSentence)) {
        console.warn(`[writer] ${stage}: крючок ушёл в первый раздел — сверху не дублирую`)
        return parsed.markdown
      }
      console.warn(`[writer] ${stage}: стадия вернула текст без лида — возвращаю лид входа`)
      return `${before}\n\n${parsed.body}`
    }
  }
  return parsed.markdown
}
