import { FEED_DESCRIPTION_LIMIT, trimForFeed } from '@/lib/postUtils'
import type { FeedPost } from '@/lib/postUtils'

const post = (description: string | null): FeedPost => ({
  id: 1,
  type: 'vacancy',
  title: 'SMM-менеджер',
  slug: 'smm-menedzher',
  description,
  company: 'Агентство',
  salary: '80 000 ₽',
  imageUrl: null,
  channelUsername: 'channel',
  telegramMessageId: '1',
  createdAt: '2026-08-31T00:00:00.000Z',
  isNew: false,
  tags: [],
})

describe('обрезка описания для ленты', () => {
  it('длинный текст режется до предела', () => {
    const long = 'а'.repeat(FEED_DESCRIPTION_LIMIT * 3)
    expect(trimForFeed(post(long)).description).toHaveLength(FEED_DESCRIPTION_LIMIT)
  })

  it('короткий текст остаётся как есть', () => {
    const short = 'Ищем SMM-менеджера в агентство.'
    expect(trimForFeed(post(short)).description).toBe(short)
  })

  it('пустое описание не ломает обрезку', () => {
    expect(trimForFeed(post(null)).description).toBeNull()
  })

  it('остальные поля карточки не трогаются', () => {
    const original = post('б'.repeat(FEED_DESCRIPTION_LIMIT * 2))
    const trimmed = trimForFeed(original)
    expect(trimmed.title).toBe(original.title)
    expect(trimmed.salary).toBe(original.salary)
    expect(trimmed.telegramMessageId).toBe(original.telegramMessageId)
    // Исходный пост не мутируется: тот же объект уходит и на детальную страницу.
    expect(original.description).toHaveLength(FEED_DESCRIPTION_LIMIT * 2)
  })

  it('предела хватает на две строки карточки с запасом на поиск', () => {
    expect(FEED_DESCRIPTION_LIMIT).toBeGreaterThanOrEqual(300)
  })
})
