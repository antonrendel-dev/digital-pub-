import { HOME_FAQ } from '../../lib/home-faq'

describe('FAQ главной страницы', () => {
  it('вопросов достаточно для разметки', () => {
    expect(HOME_FAQ.length).toBeGreaterThanOrEqual(2)
  })

  it('вопросы не повторяются', () => {
    expect(new Set(HOME_FAQ.map((i) => i.q)).size).toBe(HOME_FAQ.length)
  })

  it('каждый вопрос заканчивается знаком вопроса', () => {
    HOME_FAQ.forEach((i) => expect(i.q.trim().endsWith('?')).toBe(true))
  })

  it('ответы не отписки: минимум 120 знаков', () => {
    HOME_FAQ.forEach((i) => expect(i.a.length).toBeGreaterThanOrEqual(120))
  })

  it('не обещает того, чего нет: ни регистрации, ни платного доступа', () => {
    const all = HOME_FAQ.map((i) => i.a)
      .join(' ')
      .toLowerCase()
    expect(all).not.toMatch(/подписчик/)
    expect(all).toContain('без регистрации')
  })
})
