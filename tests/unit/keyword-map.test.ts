import { KEYWORD_MAP, findKeywordCollisions, normalizeKeyword } from '../../lib/keyword-map'
import { TAG_TITLE } from '../../lib/tagH1'

/**
 * Каннибализация ловится здесь, а не в выдаче через три месяца.
 *
 * Повод: замер 25.08.2026 по кластеру «контент-менеджер + удалёнка» —
 * четыре наши страницы, 1 064 показа, ноль кликов. Лучшая по позиции
 * получала 7% показов. Такое расходится дёшево, если поймать до релиза.
 */
describe('реестр главных ключей', () => {
  it('один ключ принадлежит одной странице', () => {
    expect(findKeywordCollisions()).toEqual([])
  })

  it('ловит коллизию, если ключ назначен дважды', () => {
    // Проверяем сам детектор: без этого предыдущий тест зелёный и когда сломан.
    const collisions = findKeywordCollisions({
      '/a': { main: 'вакансии монтажера' },
      '/b': { main: 'Вакансии  монтажёра' },
    })
    expect(collisions).toHaveLength(1)
    expect(collisions[0].urls).toEqual(['/a', '/b'])
  })

  it('ё и е — один ключ: Вордстат их не различает', () => {
    // Замер 25.08.2026: «ретушёр» и «ретушер» дали идентичные 5 496.
    expect(normalizeKeyword('Ретушёр')).toBe(normalizeKeyword('ретушер'))
  })

  it('порядок слов и дефис — один ключ', () => {
    // Замер 25.08.2026, 7 пар из 7 совпали до единицы и в broad, и в exact:
    // «рилсмейкер вакансии» = «вакансии рилсмейкера» — по 245 и 79.
    expect(normalizeKeyword('рилсмейкер вакансии')).toBe(normalizeKeyword('вакансии рилсмейкера'))
    // «веб дизайнер вакансии» = «веб-дизайнер вакансии» — по 1 577.
    expect(normalizeKeyword('веб-дизайнер вакансии')).toBe(
      normalizeKeyword('вакансии веб дизайнера'.replace('дизайнера', 'дизайнер'))
    )
  })

  it('разные корни и алфавиты — разные ключи', () => {
    // «монтажер» 1 277 против «видеомонтажер» 897 — разный спрос, разные страницы.
    expect(normalizeKeyword('монтажер вакансии')).not.toBe(
      normalizeKeyword('видеомонтажер вакансии')
    )
    // «excel» 523 против «эксель» 419 — обе живые, но это разные ключи.
    expect(normalizeKeyword('excel вакансии')).not.toBe(normalizeKeyword('эксель вакансии'))
  })

  it('назначенный ключ листинга присутствует в его title', () => {
    // Ключ, которого нет в title, — это намерение, а не назначение.
    const missing: string[] = []
    for (const [url, { main }] of Object.entries(KEYWORD_MAP)) {
      const m = url.match(/^\/vacancies\/([a-z0-9-]+)$/)
      if (!m || !TAG_TITLE[m[1]]) continue
      // Сравниваем по значимым словам: title склоняет и переставляет.
      const words = normalizeKeyword(main)
        .split(' ')
        .filter((w) => w.length >= 5)
        .map((w) => w.slice(0, Math.max(5, w.length - 2)))
      const title = normalizeKeyword(TAG_TITLE[m[1]])
      const absent = words.filter((w) => !title.includes(w))
      if (absent.length) missing.push(`${url}: нет «${absent.join(', ')}» в «${TAG_TITLE[m[1]]}»`)
    }
    expect(missing).toEqual([])
  })
})
