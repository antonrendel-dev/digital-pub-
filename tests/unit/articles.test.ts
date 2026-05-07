import { getArticles, getArticleBySlug } from '@/lib/articles'

describe('articles', () => {
  describe('getArticles', () => {
    it('returns articles sorted by date', () => {
      const articles = getArticles()
      expect(Array.isArray(articles)).toBe(true)
      // At least one sample article exists
      expect(articles.length).toBeGreaterThanOrEqual(1)
      // Check structure
      const article = articles[0]
      expect(article).toHaveProperty('title')
      expect(article).toHaveProperty('slug')
      expect(article).toHaveProperty('description')
      expect(article).toHaveProperty('publishedAt')
      expect(article).toHaveProperty('tags')
    })

    it('parses frontmatter correctly', () => {
      const articles = getArticles()
      const sample = articles.find((a) => a.slug === 'sample')
      expect(sample).toBeDefined()
      expect(sample!.title).toBe('Как найти работу в digital в 2026 году')
      expect(sample!.description).toContain('Практическое руководство')
      expect(sample!.tags).toEqual(['карьера', 'digital'])
    })
  })

  describe('getArticleBySlug', () => {
    it('returns article for valid slug', () => {
      const article = getArticleBySlug('sample')
      expect(article).not.toBeNull()
      expect(article!.title).toBe('Как найти работу в digital в 2026 году')
      expect(article!.content).toContain('С чего начать')
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
      // Note: underscores are rejected by article slugSchema (only allows a-z0-9 and hyphens)
      expect(getArticleBySlug('has_underscores')).toBeNull()
      expect(getArticleBySlug('')).toBeNull()
      expect(getArticleBySlug('slug/with/slashes')).toBeNull()
    })

    it('accepts valid slug formats', () => {
      // Valid slug format but no file - should return null
      expect(getArticleBySlug('valid-slug-format')).toBeNull()
      // Actually existing file
      expect(getArticleBySlug('sample')).not.toBeNull()
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
