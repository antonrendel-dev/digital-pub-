/**
 * Возраст вакансии и что он означает для выдачи.
 *
 * Объявления не снимают с публикации: канал их просто перестаёт обновлять.
 * Поэтому срок жизни считается от даты появления, а не от какого-либо статуса.
 *
 * Три состояния:
 *   fresh  — до 30 дней. Полноценная страница с разметкой JobPosting.
 *   stale  — 31–90 дней. Может быть ещё актуальна для человека, но для
 *            поисковика уже нет: validThrough истёк, разметку снимаем и
 *            закрываем от индексации. В листингах остаётся.
 *   gone   — больше 90 дней. Не нужна никому: отдаём 410 и убираем отовсюду.
 *
 * Порог в 30 дней взят из validThrough в разметке — он ставился как
 * datePosted + 30 дней, и держать в индексе страницу с истёкшим сроком
 * означает нарушать политику Google для structured data.
 */

export const FRESH_DAYS = 30
export const GONE_DAYS = 90

export type VacancyStage = 'fresh' | 'stale' | 'gone'

const DAY_MS = 24 * 60 * 60 * 1000

export function vacancyAgeDays(createdAt: string | Date, now: Date = new Date()): number {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt)
  if (Number.isNaN(created.getTime())) return 0
  return Math.floor((now.getTime() - created.getTime()) / DAY_MS)
}

export function vacancyStage(createdAt: string | Date, now: Date = new Date()): VacancyStage {
  const age = vacancyAgeDays(createdAt, now)
  if (age > GONE_DAYS) return 'gone'
  if (age > FRESH_DAYS) return 'stale'
  return 'fresh'
}

/** Показывать ли объявление в листингах и подборках. */
export function isListed(createdAt: string | Date, now: Date = new Date()): boolean {
  return vacancyStage(createdAt, now) !== 'gone'
}

/** Пускать ли поисковик в карточку и давать ли ей разметку вакансии. */
export function isIndexable(createdAt: string | Date, now: Date = new Date()): boolean {
  return vacancyStage(createdAt, now) === 'fresh'
}

/**
 * Граница, за которой объявление считается ушедшим, — для запросов к базе.
 * Там фильтровать в памяти нельзя: пагинация и счётчик считаются на стороне
 * базы и разошлись бы с показанным.
 */
export function listedSince(now: Date = new Date()): Date {
  return new Date(now.getTime() - GONE_DAYS * DAY_MS)
}
