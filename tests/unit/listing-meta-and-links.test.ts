import fs from 'fs'
import path from 'path'
import { TAG_TITLE, TAG_DESCRIPTION, TAG_H1 } from '../../lib/tagH1'

/**
 * Аудит листингов 25.08.2026. Листинги дают 69% поисковых показов, а мета у
 * трёх из них целилась мимо спроса: title обещал одно, люди искали другое.
 * Эти проверки держат найденное на месте — заново сверять с Вордстатом руками
 * дорого, а тихо откатиться правка может при любой следующей чистке.
 */

const articleBodies = (): Array<{ file: string; body: string }> =>
  fs
    .readdirSync(path.join(process.cwd(), 'content', 'articles'))
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => ({
      file: f,
      // Тело без frontmatter: адреса во frontmatter и JSON-LD ссылками не являются.
      body: fs
        .readFileSync(path.join(process.cwd(), 'content', 'articles', f), 'utf8')
        .split(/^---$/m)
        .slice(2)
        .join('---'),
    }))

describe('мета листингов целится в спрос', () => {
  const HEADS = ['junior', 'udalyonka', 'analitika'] as const

  // Проверка 25.08.2026 на 660 ключах Топвизора дала правило без исключений:
  // есть в запросе «digital» или роль — домен в топ-10, нет — за топ-100.
  // Квалификатор в голове title и есть то, что держит эти страницы в выдаче,
  // поэтому его отсутствие — регрессия, а не вопрос вкуса.
  it('все три головы несут квалификатор «digital»', () => {
    for (const slug of HEADS) {
      expect(TAG_TITLE[slug].toLowerCase()).toContain('digital')
      expect(TAG_H1[slug].toLowerCase()).toContain('digital')
    }
  })

  // Голова 141 668/мес недостижима и не наша: хвост Вордстата — вахта, склад,
  // «для женщин», а на странице digital-вакансии. Возврат к «вакансии junior»
  // (3 457/мес) опирается на позицию 3 по «джуниор вакансии digital».
  it('junior ведёт по «junior в digital», а не по общему «без опыта работы»', () => {
    expect(TAG_TITLE.junior).toMatch(/^Вакансии junior в digital/)
    expect(TAG_TITLE.junior.toLowerCase()).not.toContain('без опыта работы')
    // Сам модификатор не потерян — он ловит комбинации из description.
    expect(TAG_DESCRIPTION.junior.toLowerCase()).toContain('без опыта')
  })

  // По «работа в digital без опыта» ранжируется udalyonka (позиция 8-9, CTR 28,6%).
  // Вторая страница на том же интенте отбирает сигнал у той, что уже зарабатывает.
  it('junior не претендует на интент, занятый udalyonka', () => {
    expect(TAG_TITLE.junior.toLowerCase()).not.toContain('работа в digital без опыта')
  })

  // «Удалённая работа» и «digital» должны стоять неразорванной парой: раньше
  // между ними вклинивалось число, и фраза читалась как национальная голова.
  it('udalyonka держит «удалённая работа» и «digital» рядом', () => {
    const t = TAG_TITLE.udalyonka.toLowerCase()
    expect(t).toMatch(/^удалённая работа в digital/)
  })

  // «вакансии аналитика» (23 588/мес) — территория hh и SuperJob, у нас >100.
  // Страницу кормит нишевый интент: «аналитик яндекс метрика вакансии» — 4.
  // Сужение до «аналитика данных» снято: по нему за 30 дней ноль показов в GSC.
  it('analitika стоит на «аналитика в digital», без сужения до «данных»', () => {
    expect(TAG_TITLE.analitika).toMatch(/^Вакансии аналитика в digital/)
    expect(TAG_TITLE.analitika).not.toContain('аналитика данных')
  })

  // Длину считает соседний title-length.test.ts, и считает правильно — вместе
  // с « | Диджитал Паб», который дописывает шаблон. Здесь дублировать не нужно:
  // при первой правке я забыл про хвост и получил 71 символ вместо 65.

  it('описания не потеряли подстановку числа', () => {
    for (const slug of HEADS) {
      expect(TAG_DESCRIPTION[slug]).toContain('{N}')
    }
  })
})

describe('перелинковка статей на листинги', () => {
  const LISTING = /\[([^\]]{1,80})\]\((\/vacancies\/[a-z0-9-]+)\)/g

  // Брендовый анкор на категорию тратит вес впустую: он ничего не сообщает о
  // теме страницы. На общий /vacancies/ бренд уместен — там он и есть тема.
  it('на категорию не ведёт брендовый анкор', () => {
    const bad: string[] = []
    for (const { file, body } of articleBodies()) {
      for (const m of body.matchAll(LISTING)) {
        if (/^\*{0,2}(диджитал паб|d-pub[^\s]*)\*{0,2}$/i.test(m[1].trim())) {
          bad.push(`${file}: «${m[1]}» → ${m[2]}`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  // Листинг без единой входящей ссылки не получает веса вовсе. На 25.08 таких
  // было семь; wordpress оставлен сознательно — 76 запросов в месяц и
  // нерешённое пересечение с /tools/wordpress.
  it('у категорий со спросом есть входящие ссылки', () => {
    const linked = new Set<string>()
    for (const { body } of articleBodies()) {
      for (const m of body.matchAll(LISTING)) linked.add(m[2])
    }
    const shouldBeLinked = [
      'smm',
      'seo',
      'dizajn',
      'marketing',
      'menedzher',
      'target',
      'razrabotka',
      'analitika',
      'finansy',
      'kreativ',
      'copywriting',
      'content',
      'hr',
      'udalyonka',
      'ofis',
      'gibrid',
      'junior',
      'middle',
      'senior',
    ]
    const orphans = shouldBeLinked.filter((s) => !linked.has(`/vacancies/${s}`))
    expect(orphans).toEqual([])
  })
})
