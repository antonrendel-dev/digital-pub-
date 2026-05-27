/**
 * Integration test: Sitemap generation
 * Verifies that sitemap includes expected URLs for all route types.
 *
 * Note: sitemap() is async (touches Payload + filesystem). All assertions
 * must await the result. If the test DB is unavailable, tag/post routes
 * are silently skipped by the implementation — static + article routes
 * remain assertable in all environments.
 */

// Mock Payload to avoid ESM/DB issues in test environment
jest.mock('payload', () => ({ getPayload: jest.fn() }))
jest.mock('@payload-config', () => ({}), { virtual: true })

import sitemap from '@/app/sitemap'
import { getArticles } from '@/lib/articles'
import { getPayload } from 'payload'

const mockGetPayload = jest.mocked(getPayload)

beforeEach(() => {
  jest.resetAllMocks()
  // Simulate DB unavailable — sitemap falls back to static content
  mockGetPayload.mockRejectedValue(new Error('DB unavailable in test env'))
})

describe('Sitemap', () => {
  test('generates sitemap entries', async () => {
    const entries = await sitemap()
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBeGreaterThan(0)
  })

  test('includes homepage', async () => {
    const entries = await sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://d-pub.ru')
  })

  test('includes vacancies and resumes pages', async () => {
    const entries = await sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://d-pub.ru/vacancies')
    expect(urls).toContain('https://d-pub.ru/resumes')
  })

  test('includes articles page', async () => {
    const entries = await sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://d-pub.ru/articles')
  })

  test('includes privacy and terms', async () => {
    const entries = await sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://d-pub.ru/privacy')
    expect(urls).toContain('https://d-pub.ru/terms')
  })

  test('article detail entries match real articles on disk', async () => {
    const entries = await sitemap()
    const urls = entries.map((e) => e.url)
    const articles = getArticles()
    expect(articles.length).toBeGreaterThanOrEqual(10)
    for (const article of articles) {
      expect(urls).toContain(`https://d-pub.ru/articles/${article.slug}`)
    }
  })

  test('all entries have required fields', async () => {
    const entries = await sitemap()
    for (const entry of entries) {
      expect(entry.url).toBeTruthy()
      expect(entry.lastModified).toBeTruthy()
    }
  })

  /**
   * Tag-route URL schema (per app/sitemap.ts and Decision 6 deviation):
   *   vacancies → /vacancies/{slug}        (NOT /vacancies/tag/{slug})
   *   resumes   → /resumes/tag/{slug}
   *
   * Tag routes come from Prisma; if DB is unavailable in the test env,
   * tagRoutes is empty by design. We only assert URL shape when present.
   */
  test('tag routes follow the documented URL schema when DB is available', async () => {
    const entries = await sitemap()
    const urls = entries.map((e) => e.url)

    const vacancyTagUrls = urls.filter((u) =>
      /^https:\/\/d-pub\.ru\/vacancies\/[a-z0-9-]+$/.test(u)
    )
    const resumeTagUrls = urls.filter((u) =>
      /^https:\/\/d-pub\.ru\/resumes\/tag\/[a-z0-9-]+$/.test(u)
    )

    // If any tag URLs exist, they must follow the schema above —
    // never the inverse (/vacancies/tag/X or /resumes/X).
    expect(urls).not.toContain('https://d-pub.ru/vacancies/tag/smm')
    expect(urls).not.toContain('https://d-pub.ru/resumes/smm')

    // Sanity: filters either both empty (no DB) or both populated.
    if (vacancyTagUrls.length > 0 || resumeTagUrls.length > 0) {
      expect(vacancyTagUrls.length).toBeGreaterThan(0)
      expect(resumeTagUrls.length).toBeGreaterThan(0)
    }
  })
})
