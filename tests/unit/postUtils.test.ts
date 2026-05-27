import { getPrimaryCategorySlug } from '../../lib/postUtils'
import type { FeedPost } from '../../lib/postUtils'

function makePost(tags: FeedPost['tags']): FeedPost {
  return {
    id: 1,
    type: 'vacancy',
    title: 'Test',
    slug: 'test',
    description: null,
    company: null,
    salary: null,
    imageUrl: null,
    channelUsername: null,
    telegramMessageId: null,
    createdAt: new Date().toISOString(),
    isNew: false,
    tags,
  }
}

describe('getPrimaryCategorySlug', () => {
  it('specialization tag wins over format/level tags', () => {
    const post = makePost([
      { id: 1, name: 'Удалёнка', slug: 'remote', tagType: 'format' },
      { id: 2, name: 'IT', slug: 'it', tagType: 'specialization' },
    ])
    expect(getPrimaryCategorySlug(post)).toBe('it')
  })

  it('falls back to first tag when no specialization tag', () => {
    const post = makePost([
      { id: 1, name: 'Junior', slug: 'junior', tagType: 'level' },
      { id: 2, name: 'Удалёнка', slug: 'remote', tagType: 'format' },
    ])
    expect(getPrimaryCategorySlug(post)).toBe('junior')
  })

  it('falls back to "other" for empty tags array', () => {
    const post = makePost([])
    expect(getPrimaryCategorySlug(post)).toBe('other')
  })
})
