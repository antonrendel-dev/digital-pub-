import { getArticles, getArticleBySlug, mergeAndSortArticles } from '@/lib/articles'

// Reference slug — one of the real articles checked into content/articles/.
// Used to assert getArticleBySlug() on a known-existing file without
// hard-coding fragile title strings into every test.
const REAL_SLUG = 'kak-nayti-rabotu-smm-menedzheru-2026'

describe('articles', () => {
  describe('getArticles', () => {
    it('returns articles sorted by date (newest first)', () => {
      const articles = getArticles()
      expect(Array.isArray(articles)).toBe(true)
      // After the 57bd2c sample-removal + 10 real articles commit
      expect(articles.length).toBeGreaterThanOrEqual(10)

      // Check structure of the first item
      const article = articles[0]
      expect(article).toHaveProperty('title')
      expect(article).toHaveProperty('slug')
      expect(article).toHaveProperty('description')
      expect(article).toHaveProperty('publishedAt')
      expect(article).toHaveProperty('tags')

      // Sorted newest-first
      for (let i = 1; i < articles.length; i++) {
        const prev = new Date(articles[i - 1].publishedAt).getTime()
        const curr = new Date(articles[i].publishedAt).getTime()
        expect(prev).toBeGreaterThanOrEqual(curr)
      }
    })

    it('parses frontmatter correctly for a known real article', () => {
      const articles = getArticles()
      const found = articles.find((a) => a.slug === REAL_SLUG)
      expect(found).toBeDefined()
      expect(typeof found!.title).toBe('string')
      expect(found!.title.length).toBeGreaterThan(0)
      expect(typeof found!.description).toBe('string')
      expect(found!.description.length).toBeGreaterThan(0)
      expect(Array.isArray(found!.tags)).toBe(true)
    })

    it('all articles have valid slug format (a-z0-9-)', () => {
      const articles = getArticles()
      for (const article of articles) {
        expect(article.slug).toMatch(/^[a-z0-9-]+$/)
      }
    })
  })

  describe('getArticleBySlug', () => {
    it('returns article for a valid existing slug', () => {
      const article = getArticleBySlug(REAL_SLUG)
      expect(article).not.toBeNull()
      expect(article!.slug).toBe(REAL_SLUG)
      expect(article!.content.length).toBeGreaterThan(0)
    })

    it('returns null for non-existent slug', () => {
      const article = getArticleBySlug('non-existent-article')
      expect(article).toBeNull()
    })

    it('rejects path traversal attempts', () => {
      expect(getArticleBySlug('../../../etc/passwd')).toBeNull()
      expect(getArticleBySlug('../../.env')).toBeNull()
      expect(getArticleBySlug('..%2F..%2Fetc%2Fpasswd')).toBeNull()
    })

    it('rejects invalid slug formats', () => {
      expect(getArticleBySlug('UPPERCASE')).toBeNull()
      expect(getArticleBySlug('has spaces')).toBeNull()
      // Underscores rejected by article slugSchema (only allows a-z0-9 and hyphens)
      expect(getArticleBySlug('has_underscores')).toBeNull()
      expect(getArticleBySlug('')).toBeNull()
      expect(getArticleBySlug('slug/with/slashes')).toBeNull()
    })

    it('accepts valid slug format but returns null when file is absent', () => {
      // Valid slug format but no file - should return null
      expect(getArticleBySlug('valid-slug-format')).toBeNull()
      // Actually existing file
      expect(getArticleBySlug(REAL_SLUG)).not.toBeNull()
    })
  })

  describe('formatArticleDate', () => {
    it('formats date in Russian locale', async () => {
      const { formatArticleDate } = await import('@/lib/articles')
      const result = formatArticleDate('2026-05-01')
      expect(result).toContain('2026')
      // Should contain a Russian month name
      expect(result).toMatch(/\d+\s+\S+\s+2026/)
    })
  })
})

describe('mergeAndSortArticles', () => {
  const mdxArticles = [
    {
      slug: 'mdx-old',
      title: 'Old MDX',
      description: 'desc',
      publishedAt: '2024-01-01',
      tags: [],
      source: 'mdx' as const,
    },
    {
      slug: 'mdx-new',
      title: 'New MDX',
      description: 'desc',
      publishedAt: '2024-06-01',
      tags: [],
      source: 'mdx' as const,
    },
  ]
  const payloadArticles = [
    {
      slug: 'payload-mid',
      title: 'Mid Payload',
      description: 'desc',
      publishedAt: '2024-03-15',
      tags: [],
      source: 'payload' as const,
    },
  ]

  it('mergeAndSortArticles_sortsPayloadAndMdxByPublishedAtDescending', () => {
    const result = mergeAndSortArticles(mdxArticles, payloadArticles)
    expect(result[0].slug).toBe('mdx-new')
    expect(result[1].slug).toBe('payload-mid')
    expect(result[2].slug).toBe('mdx-old')
  })

  it('mergeAndSortArticles_putsMissingDateAtEnd', () => {
    const noDate = [
      {
        slug: 'no-date',
        title: 'No Date',
        description: '',
        publishedAt: null,
        tags: [],
        source: 'payload' as const,
      },
    ]
    const result = mergeAndSortArticles(mdxArticles, noDate)
    expect(result[result.length - 1].slug).toBe('no-date')
  })

  it('mergeAndSortArticles_returnsCorrectShape', () => {
    const result = mergeAndSortArticles(mdxArticles, payloadArticles)
    for (const item of result) {
      expect(item).toHaveProperty('slug')
      expect(item).toHaveProperty('title')
      expect(item).toHaveProperty('description')
      expect(item).toHaveProperty('publishedAt')
      expect(item).toHaveProperty('tags')
      expect(item).toHaveProperty('source')
    }
  })

  it('mergeAndSortArticles_emptyPayloadArray_returnsMdxOnly', () => {
    const result = mergeAndSortArticles(mdxArticles, [])
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.source === 'mdx')).toBe(true)
  })
})
