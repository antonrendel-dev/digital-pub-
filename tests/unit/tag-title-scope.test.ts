import { TAG_TITLE } from '@/lib/tagH1'

/**
 * Заголовок категории не должен сужаться до одного формата работы.
 *
 * Повод: 18.08.2026 в заголовок /vacancies/target добавили «удалённо» ради
 * ключа «вакансии таргетолога удалённо» (74/мес). Страница перестала отвечать
 * на «вакансии таргетолог» (489/мес) и ушла с девятой позиции за сотую —
 * променяли крупный запрос на вшестеро меньший.
 *
 * За формат отвечают срезы /vacancies/{spec}/udalyonka, /ofis, /gibrid.
 * Категория отвечает на общий запрос. Упоминание обоих форматов сразу
 * («удалёнка и офис») сужением не считается — оно ничего не отсекает.
 */

/** Категории, для которых формат и есть тема страницы. */
const FORMAT_CATEGORIES = new Set(['udalyonka', 'ofis', 'gibrid'])

const REMOTE = /удал[её]нн?[оаяые]|удал[её]нка/i
const OFFICE = /офис/i
const HYBRID = /гибрид/i

describe('заголовки категорий не сужены до одного формата', () => {
  for (const [slug, title] of Object.entries(TAG_TITLE)) {
    if (FORMAT_CATEGORIES.has(slug)) continue

    it(`${slug}`, () => {
      const mentionsRemote = REMOTE.test(title)
      const mentionsOther = OFFICE.test(title) || HYBRID.test(title)
      // Одна удалёнка без офиса рядом — это и есть сужение.
      expect(mentionsRemote && !mentionsOther).toBe(false)
    })
  }
})
