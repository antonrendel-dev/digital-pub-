import {
  getFilterHubLinks,
  getSpecFilterH1,
  getSpecFilterTitle,
  getSpecFilterDescription,
  SPEC_SLUGS,
} from '../../lib/spec-filter-meta'

/**
 * Каннибализация кластера «профессия + удалёнка».
 *
 * Замер GSC за 27.05–24.08.2026 (точка А в
 * scripts/content-factory/data/cannibalization-udalyonka-2026-08-27.json):
 * одиннадцать запросов, на каждом 2–5 наших страниц, 1 778 показов и ноль
 * кликов. Страница пересечения `/vacancies/{spec}/udalyonka` всюду самая
 * слабая по показам — 10–17 из полутора-двух сотен, — даже там, где по
 * позиции она лучшая из наших.
 *
 * Две причины, обе чинятся здесь:
 *   1. точную биграмму «удалённая работа» держал хаб (25 вхождений против 5),
 *      потому что пересечение было построено на слове «удалённо»;
 *   2. на пересечение вела ОДНА внутренняя ссылка на весь сайт, а хаб стоит
 *      в сквозной навигации.
 */
describe('мета страниц «профессия + формат»', () => {
  describe('удалёнка получает точную биграмму', () => {
    it('H1 начинается с «Удалённая работа» и ставит профессию в творительный', () => {
      expect(getSpecFilterH1('content', 'udalyonka')).toMatch(
        /^Удалённая работа контент-менеджером — вакансии \d{4}$/
      )
      expect(getSpecFilterH1('smm', 'udalyonka')).toContain('Удалённая работа SMM-менеджером')
    })

    it('описание несёт ту же биграмму в первых двух словах', () => {
      // Сниппет обрезается — фраза, ради которой всё затевалось, должна
      // попасть в его начало, а не в хвост.
      expect(getSpecFilterDescription('content', 'udalyonka')).toMatch(/^Удалённая работа /)
    })

    it('титул остаётся на «удалённо» — страница закрывает обе формулировки', () => {
      // «контент-менеджер удаленная работа» 172 показа берёт H1,
      // «контент-менеджер работа удаленно» 158 — титул. Менять титул нельзя.
      expect(getSpecFilterTitle('content', 'udalyonka')).toContain('удалённо')
    })

    it('у каждой из 12 специализаций есть творительный падеж', () => {
      // Без него шаблон подставит родительный и получится «Удалённая работа
      // контент-менеджера» — грамматический мусор в H1 на двенадцати страницах.
      const broken = SPEC_SLUGS.filter((s) => {
        const h1 = getSpecFilterH1(s, 'udalyonka')
        return /работа \S+а —/.test(h1) || h1.includes('undefined')
      })
      expect(broken).toEqual([])
    })

    it('офис и гибрид не тронуты', () => {
      expect(getSpecFilterH1('content', 'ofis')).toContain('Вакансии контент-менеджера в офисе')
      expect(getSpecFilterH1('content', 'gibrid')).toContain('на гибриде')
      expect(getSpecFilterDescription('content', 'ofis')).toMatch(/^Актуальные вакансии/)
    })

    it('уровни не тронуты', () => {
      expect(getSpecFilterH1('content', 'junior')).toContain('Вакансии Junior контент-менеджера')
    })
  })

  describe('ссылки с хаба вниз, на пересечения', () => {
    it('хаб удалёнки раздаёт ссылки на все 12 специализаций', () => {
      const links = getFilterHubLinks('udalyonka')
      expect(links).toHaveLength(SPEC_SLUGS.length)
      expect(links).toHaveLength(12)
    })

    it('анкор точный и транзакционный, под сам запрос', () => {
      const links = getFilterHubLinks('udalyonka')
      const content = links.find((l) => l.spec === 'content')
      expect(content).toEqual({
        spec: 'content',
        label: 'Контент-менеджер удалённо',
        href: '/vacancies/content/udalyonka',
      })
    })

    it('на хабе уровня квалификатор стоит перед профессией', () => {
      // «Junior дизайнер», а не «Дизайнер junior» — так формулируют спрос.
      const links = getFilterHubLinks('junior')
      expect(links.find((l) => l.spec === 'dizajn')?.label).toBe('Junior дизайнер')
    })

    it('ссылки ведут на существующие комбинации', () => {
      // Опечатка в slug дала бы 404 на двенадцати ссылках сразу.
      for (const filter of ['udalyonka', 'ofis', 'gibrid', 'junior', 'middle', 'senior']) {
        for (const l of getFilterHubLinks(filter)) {
          expect(SPEC_SLUGS).toContain(l.spec)
          expect(l.href).toBe(`/vacancies/${l.spec}/${filter}`)
        }
      }
    })

    it('обычная категория ссылок не раздаёт', () => {
      // Блок обязан появляться только на хабах формата и уровня. На
      // /vacancies/content он вёл бы сам на себя.
      expect(getFilterHubLinks('content')).toEqual([])
      expect(getFilterHubLinks('smm')).toEqual([])
      expect(getFilterHubLinks('чепуха')).toEqual([])
    })

    it('ни один анкор не пустой и не содержит слаг вместо имени', () => {
      const bad = getFilterHubLinks('udalyonka').filter(
        (l) => !l.label.trim() || l.label.includes(l.spec)
      )
      expect(bad).toEqual([])
    })
  })
})
