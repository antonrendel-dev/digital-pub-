/**
 * Yandex Metrika goal tracking helper.
 * Safe to call on server (no-op) and client.
 */

const METRIKA_ID = 109131123

type YmFn = (...args: unknown[]) => void

export function reachGoal(goalName: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  ;(window as Window & { ym?: YmFn }).ym?.(METRIKA_ID, 'reachGoal', goalName, params)
}

/**
 * Имена целей держим здесь, а не строками по компонентам: цель, набранная
 * с опечаткой, не падает и не подсвечивается — она просто молча не считается,
 * и обнаруживается это через месяц по пустому отчёту.
 */
export const GOALS = {
  /** Клик по вакансии — уход в Telegram к работодателю. */
  VACANCY_CLICK: 'vacancy_click',
  /** Клик по кнопке отклика/резюме. */
  RESUME_SUBMIT: 'resume_submit',
  /** Уход в наш Telegram по кнопке вакансии. */
  TELEGRAM_CLICK: 'telegram_click',
  /** Подписка на канал в соцсетях: Telegram, Макс, ВКонтакте. */
  SOCIAL_CLICK: 'social_click',
  /** Статью долистали до конца, потратив на это правдоподобное время. */
  ARTICLE_READ: 'article_read',
  /** Поиск по листингу вакансий или резюме. */
  LISTING_SEARCH: 'listing_search',
  /** Переход по тегу-фильтру из бокового списка. */
  TAG_FILTER: 'tag_filter',
  /**
   * Открытие карточки вакансии или резюме из листинга.
   *
   * Отдельная цель, а не vacancy_click: это разные шаги воронки. Открыл
   * карточку — посмотрел объявление; vacancy_click — ушёл к работодателю
   * в Telegram. Без этой цели путь «листинг → карточка» не измеряется вовсе,
   * и любая правка компоновки листингов остаётся без замера.
   */
  CARD_OPEN: 'card_open',
} as const
