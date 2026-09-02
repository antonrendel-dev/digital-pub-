/**
 * Правила чек-листа для метаданных статьи — в одном месте на всех.
 *
 * До 02.09.2026 они существовали дважды: как проверки в храповике
 * tests/unit/article-metadata-ratchet.test.ts и как ничего в контент-заводе.
 * Завод публикует статью в день, поэтому вторая половина решала: ночью
 * 02.09 вышел produktovyy-marketolog-vs-prodakt-menedzher с title на 69
 * знаков, description на 131 и без FAQ — храповик завалил его наутро
 * сразу по четырём пунктам, и правили руками.
 *
 * Чинить статью после публикации бессмысленно: накопленная работа по 84
 * статьям разъезжается ровно со скоростью выпуска. Поэтому правила вынесены
 * сюда, а завод сверяется с ними ДО записи файла.
 */

import { parseFaq, MIN_FAQ_ITEMS } from './faq-schema'

/** Шаблон в app/(main)/layout.tsx дописывает это к каждому title. */
export const BRAND_SUFFIX = ' | Диджитал Паб'
export const TITLE_LIMIT = 65
export const DESC_MIN = 140
export const DESC_MAX = 175

/** Сниппет без даты и источника читается как пересказ — пункт 7 чек-листа. */
export const SOURCE_OR_YEAR = /(hh\.ru|SuperJob|Вордстат|Метрика|Росстат|Habr|202\d)/i

/** Совпадение первых четырёх слов title и description — уже пересказ. */
export const ECHO_WORDS = 4

/** Источники, которые засчитываются как атрибуция. Держим списком: он нужен и
 *  проверке, и промпту круга правок в заводе — врозь они однажды разъедутся. */
export const SOURCE_NAMES = ['hh.ru', 'SuperJob', 'Вордстат', 'Метрика', 'Росстат', 'Habr'] as const

/**
 * Привести заголовок раздела вопросов к тому виду, который понимает парсер.
 *
 * 02.09.2026 завод назвал раздел «Что ещё важно знать о профессии?» — вопросы
 * и ответы под ним были написаны как надо, но parseFaq ищет в заголовке слово
 * «вопрос» или FAQ, не нашёл, и разметка не собралась вовсе.
 *
 * Правило намеренно узкое: трогаем только последний H2, который заканчивается
 * вопросительным знаком и под которым лежат минимум две пары «### вопрос —
 * ответ», причём сами H3 обязаны быть вопросами. Любой другой заголовок
 * остаётся как написан.
 *
 * Требование вопросительного знака у H3 добавлено 02.09.2026 по ревью: без
 * него функция переименовывала «## Сколько зарабатывает продуктовый
 * маркетолог?» с грейдами «### Джуниор / ### Мидл» в «## Частые вопросы» —
 * вырезала ключевой H2 и уводила грейды в faqSchema как вопросы. Проверка на
 * живых статьях: из 306 H3 внутри FAQ-секций вопросительным знаком кончаются
 * 303, так что правило не ломает ни одного реального раздела.
 */
export function normalizeFaqHeading(markdown: string): string {
  if (parseFaq(markdown).length >= MIN_FAQ_ITEMS) return markdown

  const headings = [...markdown.matchAll(/^##\s+(.+)$/gm)]
  const last = headings[headings.length - 1]
  if (!last || !last[1].trim().endsWith('?')) return markdown

  const tail = markdown.slice(last.index! + last[0].length)
  const questions = (tail.match(/^###\s+.+$/gm) ?? []).filter((h) => h.trim().endsWith('?'))
  if (questions.length < MIN_FAQ_ITEMS) return markdown

  const replaced =
    markdown.slice(0, last.index!) +
    '## Частые вопросы' +
    markdown.slice(last.index! + last[0].length)
  return parseFaq(replaced).length >= MIN_FAQ_ITEMS ? replaced : markdown
}

export interface MetadataViolation {
  rule: string
  detail: string
}

export interface ArticleMetadata {
  metaTitle: string
  metaDescription: string
  /** Тело статьи — по нему проверяется наличие раздела вопросов. */
  markdown: string
}

export function echoedWords(title: string, description: string): number {
  const t = title.toLowerCase().split(/\s+/).slice(0, ECHO_WORDS)
  const d = description.toLowerCase().split(/\s+/).slice(0, ECHO_WORDS)
  let same = 0
  while (same < t.length && t[same] === d[same]) same++
  return same
}

/**
 * Пять правил, каждое из которых уже ловил храповик на живых статьях.
 * Возвращает пустой массив, когда придраться не к чему.
 */
export function checkArticleMetadata(meta: ArticleMetadata): MetadataViolation[] {
  const violations: MetadataViolation[] = []
  const titleLen = (meta.metaTitle + BRAND_SUFFIX).length

  if (titleLen > TITLE_LIMIT) {
    violations.push({
      rule: 'TITLE_LIMIT',
      detail: `${titleLen} знаков с брендом при пороге ${TITLE_LIMIT} — укороти metaTitle на ${titleLen - TITLE_LIMIT}`,
    })
  }

  const descLen = meta.metaDescription.length
  if (descLen < DESC_MIN || descLen > DESC_MAX) {
    violations.push({
      rule: 'DESC_RANGE',
      detail: `${descLen} знаков при коридоре ${DESC_MIN}–${DESC_MAX}`,
    })
  }

  if (parseFaq(meta.markdown).length < MIN_FAQ_ITEMS) {
    violations.push({
      rule: 'FAQ_MISSING',
      detail: `раздел вопросов даёт меньше ${MIN_FAQ_ITEMS} пар «вопрос — ответ», разметка не соберётся`,
    })
  }

  if (!SOURCE_OR_YEAR.test(meta.metaDescription)) {
    violations.push({
      rule: 'DESC_NO_SOURCE',
      detail: 'в description нет ни года, ни источника данных',
    })
  }

  if (echoedWords(meta.metaTitle, meta.metaDescription) >= ECHO_WORDS) {
    violations.push({
      rule: 'DESC_ECHOES_TITLE',
      detail: `description начинается теми же ${ECHO_WORDS} словами, что и title`,
    })
  }

  return violations
}

/**
 * Ссылки на статью из других статей. Новая страница их не имеет по построению,
 * поэтому это не нарушение, а предупреждение: сирота живёт в индексе, но во
 * внутреннем графе сайта её нет. 02.09.2026 таких набралось 49 штук.
 */
export function findIncomingLinks(slug: string, articles: Array<{ slug: string; body: string }>) {
  const needle = `/articles/${slug}`
  return articles.filter((a) => a.slug !== slug && a.body.includes(needle)).map((a) => a.slug)
}
