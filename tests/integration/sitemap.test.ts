/**
 * Integration test: Sitemap generation
 * Verifies that sitemap includes expected URLs for all route types
 */
import sitemap from '@/app/sitemap'

describe('Sitemap', () => {
  it('generates sitemap entries', () => {
    const entries = sitemap()
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBeGreaterThan(0)
  })

  it('includes homepage', () => {
    const entries = sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://d-pub.ru')
  })

  it('includes vacancies and resumes pages', () => {
    const entries = sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://d-pub.ru/vacancies')
    expect(urls).toContain('https://d-pub.ru/resumes')
  })

  it('includes articles page', () => {
    const entries = sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://d-pub.ru/articles')
  })

  it('includes privacy and terms', () => {
    const entries = sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://d-pub.ru/privacy')
    expect(urls).toContain('https://d-pub.ru/terms')
  })

  it('includes tag pages for vacancies and resumes', () => {
    const entries = sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://d-pub.ru/vacancies/tag/smm')
    expect(urls).toContain('https://d-pub.ru/resumes/tag/smm')
    expect(urls).toContain('https://d-pub.ru/vacancies/tag/udalyonka')
  })

  it('includes article detail pages', () => {
    const entries = sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://d-pub.ru/articles/sample')
  })

  it('all entries have required fields', () => {
    const entries = sitemap()
    for (const entry of entries) {
      expect(entry.url).toBeTruthy()
      expect(entry.lastModified).toBeTruthy()
    }
  })
})
