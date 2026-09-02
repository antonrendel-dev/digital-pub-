import { HUB_FAQ, type HubKey } from '../../lib/hub-faq'

const HUBS: HubKey[] = ['articles', 'resumes', 'vacancies', 'tools', 'professions']

describe('FAQ хабов', () => {
  it('закрыты все пять хабов', () => {
    expect(Object.keys(HUB_FAQ).sort()).toEqual([...HUBS].sort())
  })

  it.each(HUBS)('%s: вопросов хватает для разметки и они не повторяются', (hub) => {
    const items = HUB_FAQ[hub]
    expect(items.length).toBeGreaterThanOrEqual(2)
    expect(new Set(items.map((i) => i.q)).size).toBe(items.length)
  })

  it.each(HUBS)('%s: вопрос сформулирован вопросом, ответ не отписка', (hub) => {
    for (const { q, a } of HUB_FAQ[hub]) {
      expect(q.trim().endsWith('?')).toBe(true)
      expect(a.length).toBeGreaterThanOrEqual(120)
    }
  })

  it('не обещает того, чего на сайте нет', () => {
    const all = Object.values(HUB_FAQ)
      .flat()
      .map((i) => i.a)
      .join(' ')
      .toLowerCase()
    // Подписчиков не показываем нигде — цифра мёртвая и вводит в заблуждение.
    expect(all).not.toMatch(/подписчик/)
    // Платного доступа и обязательной регистрации у нас нет.
    expect(all).not.toMatch(/оплат[аи] доступа|платный доступ/)
  })

  it('вопросы хабов не дублируют друг друга дословно', () => {
    const questions = Object.values(HUB_FAQ)
      .flat()
      .map((i) => i.q.toLowerCase())
    expect(new Set(questions).size).toBe(questions.length)
  })
})
