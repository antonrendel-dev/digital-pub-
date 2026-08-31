import { getSpecFilterSeo } from '@/lib/spec-filter-seo'
import { SPEC_SLUGS, FORMAT_SLUGS, LEVEL_SLUGS } from '@/lib/spec-filter-meta'

describe('getSpecFilterSeo (JSON data source)', () => {
  it('returns content for a known landing', () => {
    const content = getSpecFilterSeo('smm', 'udalyonka')
    expect(content).not.toBeNull()
    expect(content!.seoText).toContain('<h2>')
    expect(content!.faqItems.length).toBeGreaterThan(0)
    expect(content!.faqItems[0]).toHaveProperty('question')
    expect(content!.faqItems[0]).toHaveProperty('answer')
  })

  it('returns content for all 78 spec×filter combinations', () => {
    const filters = [...FORMAT_SLUGS, ...LEVEL_SLUGS]
    for (const spec of SPEC_SLUGS) {
      for (const filter of filters) {
        const content = getSpecFilterSeo(spec, filter)
        expect(content).not.toBeNull()
        expect(content!.seoText.length).toBeGreaterThan(100)
        expect(content!.faqItems.length).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('returns null for unknown combinations', () => {
    expect(getSpecFilterSeo('unknown-spec', 'udalyonka')).toBeNull()
    expect(getSpecFilterSeo('smm', 'unknown-filter')).toBeNull()
  })

  it('is safe against path traversal in slugs', () => {
    expect(getSpecFilterSeo('../../etc', 'passwd')).toBeNull()
    expect(getSpecFilterSeo('smm', '../smm-udalyonka')).toBeNull()
  })

  it('returns the same cached object on repeated calls', () => {
    const a = getSpecFilterSeo('seo', 'senior')
    const b = getSpecFilterSeo('seo', 'senior')
    expect(a).toBe(b)
  })
})
