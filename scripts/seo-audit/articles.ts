/**
 * Разбор статей: как их читают и где они стоят.
 *
 * Логика вынесена в TypeScript ради тестов — jest не читает голый .mjs.
 * Сборка кладёт рядом articles.compiled.mjs, его и подключают скрипты.
 */

/** Знаков в минуту при беглом чтении русского текста средней сложности. */
export const CHARS_PER_MINUTE = 1200
/** Ниже этого времени читать нечего при любой длине статьи. */
export const NOT_READ_SECONDS = 30
/** Доля от нужного времени, начиная с которой считаем, что статью читали. */
export const READ_SHARE = 0.15
/** Позиция, начиная с которой страница считается видимой. */
export const TOP_POSITION = 10
/** Сколько статей показывать в каждой группе: полный список никто не разберёт. */
export const PER_GROUP = 3

export interface ArticleRow {
  slug: string
  visits: number
  seconds: number
  expectedSeconds: number
  share: number
  position: number | null
  leftPage: boolean
}

export interface ArticleGroup {
  title: string
  action: string
  rows: ArticleRow[]
}

/**
 * Насколько глубоко статью прочли.
 *
 * Само по себе время бесполезно: две минуты на статье в пять тысяч знаков
 * и в двадцать тысяч означают противоположное.
 */
export function readShare(seconds: number, chars: number): number {
  if (!chars || chars <= 0) return 0
  const expected = (chars / CHARS_PER_MINUTE) * 60
  return expected > 0 ? seconds / expected : 0
}

export function isRead(row: Pick<ArticleRow, 'seconds' | 'share'>): boolean {
  return row.seconds >= NOT_READ_SECONDS && row.share >= READ_SHARE
}

export function isInTop(row: Pick<ArticleRow, 'position'>): boolean {
  return row.position !== null && row.position <= TOP_POSITION
}

/**
 * Пересечение позиции и глубины чтения. Оно и говорит, что чинить: заголовок,
 * который не приводит людей, или текст, который их не удерживает.
 */
export function groupArticles(rows: ArticleRow[]): ArticleGroup[] {
  const groups: ArticleGroup[] = [
    {
      title: 'В топе, но не читают',
      action: 'чинить текст',
      rows: rows.filter((r) => isInTop(r) && !isRead(r)),
    },
    {
      title: 'Читают, но не в топе',
      action: 'чинить заголовок',
      rows: rows.filter((r) => !isInTop(r) && isRead(r)),
    },
    {
      title: 'Ни того, ни другого',
      action: 'разбирать спрос',
      rows: rows.filter((r) => !isInTop(r) && !isRead(r)),
    },
  ]
  // Внутри группы сначала те, у кого больше людей: там правка даёт больше.
  for (const group of groups) group.rows.sort((a, b) => b.visits - a.visits)
  return groups.filter((g) => g.rows.length > 0)
}

/** Доля прочтения для показа: выше сотни она означает уход на другую страницу. */
export function displayShare(share: number): number {
  return Math.round(Math.min(share, 1) * 100)
}
