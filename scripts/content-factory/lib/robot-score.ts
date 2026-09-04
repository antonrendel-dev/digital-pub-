/**
 * Скоринг роботности статьи.
 *
 * Все гейты завода до 04.09.2026 были про вхождения, ссылки, объём и мета
 * (`tz.ts`, `article-metadata-gate.ts`). Читаемость не измерялась нигде, и
 * каждый ритуал, который промпт просил «для живости», через несколько правок
 * промпта превращался в штамп: абзацы-афоризмы из одного предложения,
 * «Миф о том, что … неверен», «На самом деле — …», «**ключ** — это …»,
 * все H2 вопросами, «по данным hh.ru» в каждом третьем предложении.
 * Правило проекта: что можно нарушить в коде, обязано быть хуком или тестом.
 *
 * Здесь считаются числа, которые эти ритуалы выдают, и пороги к ним.
 * Пороги калиброваны на 86 статьях сайта 04.09.2026
 * (`data/robot-score-baseline.json`, снимок, не контракт): все 10 статей
 * с крючком проходят, 76 падают на «нет текста до первого H2» (находка
 * аудита: статьи открываются определением), три свежие сентябрьские —
 * ещё и на шаблонах и афоризмах. Режим — предупреждение
 * (ROBOT_SCORE_MODE = 'warn'): нарушения уходят в лог и в уведомление
 * завода, публикацию не останавливают. Блокировка — после недели наблюдений.
 *
 * Модуль без зависимостей от промптов и модели: тот же код гоняет CLI
 * `npm run robot-score -- <файл|каталог>` по готовым mdx.
 */
import { LEAD_MAX_WORDS } from './article-body.js'
import { ROBOT_PHRASES, type PhraseEntry } from './robot-phrases.js'

export type RobotScoreMode = 'warn' | 'block'
/** Пока только предупреждаем. Переключить на 'block' после калибровки на живых прогонах. */
export const ROBOT_SCORE_MODE: RobotScoreMode = 'warn'

export interface RobotMetrics {
  /** Слов в текстовых абзацах (без заголовков, списков, таблиц, кода). */
  words: number
  /** Текстовых абзацев (списки и таблицы — не абзацы). */
  paragraphs: number
  /** Доля абзацев ≤ APHORISM_WORDS слов среди текстовых абзацев. */
  aphorismShare: number
  /** Средняя длина абзаца в словах и её среднеквадратичное отклонение. */
  avgParagraphWords: number
  paragraphSd: number
  /** Коэффициент вариации длины предложений: σ/μ. Ровный ритм — маленький CV. */
  sentenceCv: number
  sentences: number
  avgSentenceWords: number
  /** Сколько и каких фраз-шаблонов нашлось. */
  templateHits: { phrase: string; count: number }[]
  templateCount: number
  /** Доля H2 с вопросительным знаком. */
  h2Count: number
  questionH2Share: number
  /** Предложений с атрибуцией («по данным hh.ru», «Росстат сообщил») на 250 слов. */
  attributions: number
  attributionsPer250: number
  /** Есть ли текст до первого H2. */
  hasLead: boolean
  leadWords: number
}

export type RobotLevel = 'violation' | 'warning'

export interface RobotViolation {
  rule: string
  detail: string
  level: RobotLevel
}

export interface RobotScore {
  metrics: RobotMetrics
  violations: RobotViolation[]
}

// ─── Пороги ───────────────────────────────────────────────────────────────────

/** Абзац из стольких слов и короче — афоризм, если это не вывод. */
export const APHORISM_WORDS = 7
/**
 * Не афоризм по форме: подводка к списку («Формат описания опыта:»),
 * строка-лейбл целиком в болде или курсиве («**Опыт работы:**»,
 * «**Junior (0-1 год)**»), шаблон с плейсхолдером («[Должность] | [Период]»).
 * «**Итог.** Начните с задач.» — тот же ритуал в болде, считается.
 */
const NOT_APHORISM =
  /:$|^(?:\*\*|__)[^*_]+(?:\*\*|__)[^а-яёa-z]*$|^(?:\*|_)[^*_]+(?:\*|_)[^а-яёa-z]*$|\[[^\]]+\]/iu
export const THRESHOLDS = {
  /** Нарушение: доля абзацев-афоризмов выше. Корпус 04.09: p90 = 6 %, свежие сентябрьские 10–18 %. */
  aphorismShare: 0.08,
  /** Нарушение: шаблонных фраз столько и больше. */
  templateCount: 2,
  /** Предупреждение: CV длины предложений ниже — ритм выровнен. На корпусе 04.09 CV не разделяет свежие и майские (0,40–0,74, медиана 0,53), поэтому не нарушение. */
  sentenceCv: 0.42,
  /**
   * Предупреждение: доля вопросительных H2 выше. Стандарт 9.3a просит H2
   * вопросами там, где есть хвост, а структура D4 — 5 содержательных H2 + CTA +
   * FAQ: 71 % вопросов — норма. Предупреждение только когда вопросами всё.
   */
  questionH2Share: 0.85,
  /** Предупреждение: атрибуций на 250 слов больше. Корпус 04.09: медиана 0,8, p75 1,3. */
  attributionsPer250: 1.5,
} as const

export const APHORISM_RULE = 'Абзацы-афоризмы'
export const TEMPLATE_RULE = 'Фразы-шаблоны'
export const RHYTHM_RULE = 'Ровный ритм предложений'
export const QUESTION_H2_RULE = 'H2 вопросами'
export const ATTRIBUTION_RULE = 'Перегруз атрибуциями'
export const NO_LEAD_RULE = 'Нет текста до первого H2'
export const DEFINITION_RULE = 'Определение жирным «**термин** — это»'
/** Крючок короче — не крючок: у проходящих статей корпуса 49–114 слов. Длиннее LEAD_MAX_WORDS keepLead отбросит. */
export const LEAD_MIN_WORDS = 25

// ─── Словарь ─────────────────────────────────────────────────────────────────

export interface CompiledPhrase {
  phrase: string
  re: RegExp
}

/** Фразы в регэкспы. `\b` в JS не знает кириллицы — границы через просмотры. */
export function compilePhrases(entries: PhraseEntry[]): CompiledPhrase[] {
  return entries.map((p) => ({
    phrase: p.phrase,
    re: new RegExp(
      `(?<![а-яёa-z])(?:${p.regex ?? escapeRegex(p.phrase.toLowerCase())})(?![а-яёa-z])`,
      'giu'
    ),
  }))
}

const PHRASES = compilePhrases(ROBOT_PHRASES)

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Открытие абзаца «**ключ** — это …» — тоже шаблон, но регулярный, не словарный. */
const BOLD_DEFINITION_OPENER =
  /^(?:\*\*|__)[^*_\n]{3,160}?(?:\*\*|__)\s*[—–-]\s*это(?=[\s,.:;!?]|$)/u

/**
 * Атрибуция — предложение с маркером источника или с названием источника.
 * Считается по предложениям, не по маркерам: «по данным hh.ru за 2026 год»
 * — одна атрибуция, а не две.
 */
const SOURCE_NAME =
  'hh\\.ru|superjob|суперджоб|росстат|хабр\\s+карьер[а-яё]*|habr\\s+career|getmatch|зарплат[аы]\\.ру|минтруд[а-яё]*|банк[а-яё]* россии|вциом|ромир'
// Глаголы с левой границей и в формах отчёта: «показатели» и «укажите» — не атрибуция.
const SOURCE_VERB =
  '(?<![а-яё])(?:сообщ(?:ил|ает|ают|ала|или)[а-яё]*|указ(?:ал|ала|али|ывает|ывают)|рекоменд(?:ует|уют|овал|овала|овали)|опубликова(?:л|ла|ли)|оцени(?:л|ла|ли|вает|вают)|подсчита(?:л|ла|ли)|зафиксирова(?:л|ла|ли)|отмеча(?:ет|ют)|отмети(?:л|ла|ли)|привод(?:ит|ят)|прив(?:ёл|ела|ели)|показа(?:л|ла|ли)|насчита(?:л|ла|ли)|изуча(?:ет|ют)|фиксиру(?:ет|ют)|отслежива(?:ет|ют))'
const ATTRIBUTION = new RegExp(
  [
    'по данным',
    'согласно (?:данным|исследованию|отч[её]ту|опросу|оценк[а-яё]+|статистике|обзору|отчётности)',
    'по оценк[а-яё]+',
    'по информации',
    'по словам',
    'по подсч[её]там',
    'в материале от',
    'в исследовании',
    'в отч[её]те',
    'по результатам (?:исследования|опроса|замера)',
    // «hh.ru в обзоре от 3 марта сообщил», «Росстат опубликовал» — источник и глагол не
    // дальше трёх слов. Обратный порядок не считается: «Показать hh.ru работодателю» — не источник.
    // «Работодатели на hh.ru рекомендуют» — площадка как место, не источник: предлог перед именем исключает.
    `(?<!(?:на|в|с|из|через)\\s)(?:${SOURCE_NAME})(?:\\s+\\S+){0,3}?\\s+(?:${SOURCE_VERB})`,
    `данн(?:ые|ым|ых|ыми) (?:${SOURCE_NAME})`,
  ].join('|'),
  'iu'
)

// ─── Разбор текста ───────────────────────────────────────────────────────────

interface Parsed {
  lead: string
  paragraphs: string[]
  h2: string[]
}

/**
 * Из markdown/MDX — только текстовые абзацы. Frontmatter, JSX/HTML-теги,
 * таблицы, код, списки и заголовки не считаются абзацами: в списке пункт
 * короткий по природе, в таблице ячейка — не предложение.
 */
export function parseArticle(markdown: string): Parsed {
  let text = markdown.replace(/\r\n/g, '\n')
  text = text.replace(/^---\n[\s\S]*?\n---\n?/, '')
  text = text.replace(/```[\s\S]*?```/g, '\n')
  // Тег с кавычками внутри: alt="x > y" не обрывает тег на первом «>».
  text = text.replace(/<(?:[^<>"']|"[^"]*"|'[^']*'){0,600}>/g, ' ')

  const lines = text.split('\n')
  const paragraphs: string[] = []
  const h2: string[] = []
  const leadParts: string[] = []
  let seenH2 = false
  let buf: string[] = []

  const flush = () => {
    if (buf.length === 0) return
    const p = cleanInline(buf.join(' '))
    buf = []
    if (!p) return
    paragraphs.push(p)
    if (!seenH2) leadParts.push(p)
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    if (/^#{1,6}\s/.test(line)) {
      flush()
      if (/^##\s/.test(line)) {
        seenH2 = true
        h2.push(line.replace(/^##\s+/, '').trim())
      }
      continue
    }
    // Нумерация в теле — всегда пункт списка. До первого H2 — только с заглавной или
    // разметкой после номера, как в article-body.ts: «10. место занимает Россия» — крючок.
    const numbered = seenH2 ? /^\d{1,3}[.)]\s/ : /^\d{1,2}[.)]\s+(?=[A-ZА-ЯЁ*_[`«"])/
    if (numbered.test(line) || /^(\||[-*+•]\s|>|-{3,}$|\{|\}|import\s|export\s)/.test(line)) {
      flush()
      continue
    }
    buf.push(line)
  }
  flush()

  return { lead: leadParts.join('\n\n'), paragraphs, h2 }
}

function cleanInline(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function words(s: string): number {
  return s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}

/**
 * Предложения: конец на .!?… (и закрывающая кавычка или скобка после него),
 * дальше пробел с заглавной, цифрой или кавычкой. «hh.ru», «12.5» не режутся:
 * после точки нет пробела; сокращения «т. д.», «тыс.», «руб.», «млн», «г.»
 * исключены явно — после них часто идёт заглавная.
 */
export function splitSentences(paragraph: string): string[] {
  return paragraph
    .replace(/\*\*|__/g, '')
    .split(
      /(?<=[.!?…][»")]*)(?<!(?:^|\s)(?:т\. [дпе]|тыс|руб|млн|млрд|гг?|см|ул|стр)\.[»")]*)\s+(?=[А-ЯЁA-Z\d«"(])/u
    )
    .map((s) => s.trim())
    .filter((s) => words(s) > 0)
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

function sd(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

function round(x: number, digits = 3): number {
  const k = 10 ** digits
  return Math.round(x * k) / k
}

// ─── Скоринг ─────────────────────────────────────────────────────────────────

export function scoreArticle(markdown: string): RobotScore {
  const { lead, paragraphs, h2 } = parseArticle(markdown)

  const paragraphLengths = paragraphs.map(words)
  const totalWords = paragraphLengths.reduce((a, b) => a + b, 0)
  const aphorismList = paragraphs.filter((p) => words(p) <= APHORISM_WORDS && !NOT_APHORISM.test(p))
  const aphorisms = aphorismList.length
  const aphorismShare = paragraphs.length ? aphorisms / paragraphs.length : 0

  const sentences = paragraphs.flatMap(splitSentences)
  const sentenceLengths = sentences.map(words)
  const avgSentence = mean(sentenceLengths)
  const sentenceCv = avgSentence ? sd(sentenceLengths) / avgSentence : 0

  const plain = paragraphs.join('\n')
  const templateHits: { phrase: string; count: number }[] = []
  for (const { phrase, re } of PHRASES) {
    const count = (plain.match(re) ?? []).length
    if (count) templateHits.push({ phrase, count })
  }
  const boldOpeners = paragraphs.filter((p) => BOLD_DEFINITION_OPENER.test(p))
  const templateCount = templateHits.reduce((a, h) => a + h.count, 0)

  const questionH2 = h2.filter((t) => t.includes('?')).length
  const questionH2Share = h2.length ? questionH2 / h2.length : 0

  const attributions = sentences.filter((s) => ATTRIBUTION.test(s)).length
  const attributionsPer250 = totalWords ? (attributions / totalWords) * 250 : 0

  const leadWords = words(lead)

  const metrics: RobotMetrics = {
    words: totalWords,
    paragraphs: paragraphs.length,
    aphorismShare: round(aphorismShare),
    avgParagraphWords: round(mean(paragraphLengths), 1),
    paragraphSd: round(sd(paragraphLengths), 1),
    sentenceCv: round(sentenceCv),
    sentences: sentences.length,
    avgSentenceWords: round(avgSentence, 1),
    templateHits,
    templateCount,
    h2Count: h2.length,
    questionH2Share: round(questionH2Share),
    attributions,
    attributionsPer250: round(attributionsPer250, 2),
    hasLead: leadWords >= LEAD_MIN_WORDS && leadWords <= LEAD_MAX_WORDS,
    leadWords,
  }

  const violations: RobotViolation[] = []
  const pct = (x: number) => `${Math.round(x * 100)} %`

  if (aphorismShare > THRESHOLDS.aphorismShare) {
    violations.push({
      rule: APHORISM_RULE,
      level: 'violation',
      detail: `${aphorisms} из ${paragraphs.length} абзацев короче ${APHORISM_WORDS + 1} слов (${pct(aphorismShare)} при пороге ${pct(THRESHOLDS.aphorismShare)}): ${aphorismList
        .slice(0, 3)
        .map((p) => `«${p}»`)
        .join(', ')}`,
    })
  }
  if (templateCount >= THRESHOLDS.templateCount) {
    violations.push({
      rule: TEMPLATE_RULE,
      level: 'violation',
      detail: templateHits.map((h) => `«${h.phrase}» ×${h.count}`).join(', '),
    })
  }
  if (sentences.length >= 20 && sentenceCv < THRESHOLDS.sentenceCv) {
    violations.push({
      rule: RHYTHM_RULE,
      level: 'warning',
      detail: `CV длины предложений ${metrics.sentenceCv} при пороге ${THRESHOLDS.sentenceCv} (средняя ${metrics.avgSentenceWords} слов)`,
    })
  }
  if (!metrics.hasLead) {
    violations.push({
      rule: NO_LEAD_RULE,
      level: 'violation',
      detail:
        leadWords === 0
          ? 'статья начинается с заголовка раздела, крючка нет'
          : leadWords < LEAD_MIN_WORDS
            ? `до первого H2 только ${leadWords} слов — крючок из 2–3 предложений с фактом, не меньше ${LEAD_MIN_WORDS} слов`
            : `до первого H2 ${leadWords} слов — это не крючок, а рассуждение; keepLead отбросит всё длиннее ${LEAD_MAX_WORDS}`,
    })
  }
  if (boldOpeners.length) {
    violations.push({
      rule: DEFINITION_RULE,
      level: 'violation',
      detail: `${boldOpeners.map((p) => `«${p.slice(0, 70)}…»`).join(', ')} — сними жирный; текст и место предложения не меняй`,
    })
  }
  if (h2.length >= 4 && questionH2Share > THRESHOLDS.questionH2Share) {
    violations.push({
      rule: QUESTION_H2_RULE,
      level: 'warning',
      detail: `${questionH2} из ${h2.length} H2 с «?» (${pct(questionH2Share)} при пороге ${pct(THRESHOLDS.questionH2Share)})`,
    })
  }
  if (attributionsPer250 > THRESHOLDS.attributionsPer250) {
    violations.push({
      rule: ATTRIBUTION_RULE,
      level: 'warning',
      detail: `${attributions} предложений с источником на ${totalWords} слов (${metrics.attributionsPer250} на 250 при пороге ${THRESHOLDS.attributionsPer250})`,
    })
  }

  return { metrics, violations }
}

/** Строка для лога и уведомления: только нарушения, коротко. */
export function formatViolations(violations: RobotViolation[]): string {
  return violations
    .map((v) => `${v.level === 'violation' ? '✗' : '△'} ${v.rule}: ${v.detail}`)
    .join('\n')
}
