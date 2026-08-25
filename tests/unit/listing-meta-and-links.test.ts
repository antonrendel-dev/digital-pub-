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
  // «вакансии без опыта работы» — 141 668/мес, «вакансии джуниор» — 1 163.
  // Слово junior стоило странице спроса в сто раз больше собственного.
  it('junior ведёт по «без опыта», а не по «junior»', () => {
    expect(TAG_TITLE.junior).toContain('без опыта')
    expect(TAG_H1.junior).toContain('без опыта')
    expect(TAG_TITLE.junior.toLowerCase()).not.toMatch(/^вакансии junior/)
  })

  // «удалённая работа вакансии» — 125 782/мес. Прежний title разрывал пару
  // словами «digital 2026», и точного вхождения не было.
  it('udalyonka держит «удалённая работа» и «вакансии» рядом', () => {
    // Форма слова роли не играет — Яндекс приводит к лемме. Важно, чтобы
    // «удалённая работа» и «вакансии» стояли рядом, а не через полстроки.
    const t = TAG_TITLE.udalyonka.toLowerCase()
    expect(t).toContain('удалённая работа')
    const vac = t.indexOf('ваканси')
    expect(vac).toBeGreaterThan(t.indexOf('удалённая работа'))
    expect(vac - t.indexOf('удалённая работа')).toBeLessThan(25)
  })

  // «вакансии аналитика» — 23 588/мес, «вакансии аналитика данных» — 3 676.
  // Уточнение срезало спрос в шесть раз, а категория шире одних дата-аналитиков.
  it('analitika не сужается до «данных» в title', () => {
    expect(TAG_TITLE.analitika).toContain('Вакансии аналитика')
    expect(TAG_TITLE.analitika).not.toContain('аналитика данных')
  })

  // Длину считает соседний title-length.test.ts, и считает правильно — вместе
  // с « | Диджитал Паб», который дописывает шаблон. Здесь дублировать не нужно:
  // при первой правке я забыл про хвост и получил 71 символ вместо 65.

  it('описания не потеряли подстановку числа', () => {
    for (const slug of ['junior', 'udalyonka', 'analitika']) {
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
