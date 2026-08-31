import { ANNOUNCE_CHANNEL, announceText } from '../../scripts/content-factory/lib/announce'

/**
 * Анонс уходит подписчикам, а не в рабочий чат: ошибку в формате увидят все,
 * а поправить задним числом нельзя.
 */
describe('текст анонса', () => {
  const text = announceText('https://d-pub.ru/articles/test')

  it('ровно две строки', () => {
    expect(text.split('\n')).toHaveLength(2)
  })

  it('первая — приписка, вторая — ссылка', () => {
    const [first, second] = text.split('\n')
    expect(first).toBe('Читайте новую статью на нашем сайте 👇🏻')
    expect(second).toBe('https://d-pub.ru/articles/test')
  })

  it('в ссылочной строке нет ничего, кроме ссылки', () => {
    // Иначе превью Telegram не подтянется, а ради него анонс и существует.
    expect(text.split('\n')[1].trim()).toMatch(/^https:\/\/\S+$/)
  })

  it('без разметки — сообщение уходит без parse_mode', () => {
    expect(text).not.toMatch(/<[a-z/]/i)
    expect(text).not.toMatch(/\*\*|__/)
  })

  it('адрес канала не совпадает с рабочим чатом', () => {
    expect(ANNOUNCE_CHANNEL).toBe('@web_vacancy')
  })
})
