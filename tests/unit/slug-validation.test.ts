import { z } from 'zod'

const slugSchema = z.string().regex(/^[a-z0-9-_]{1,80}$/)

describe('slugSchema', () => {
  it('accepts valid slugs', () => {
    expect(slugSchema.safeParse('smm').success).toBe(true)
    expect(slugSchema.safeParse('udalyonka').success).toBe(true)
    expect(slugSchema.safeParse('my-post-slug').success).toBe(true)
    expect(slugSchema.safeParse('post_123').success).toBe(true)
    expect(slugSchema.safeParse('a').success).toBe(true)
  })

  it('rejects path traversal attempts', () => {
    expect(slugSchema.safeParse('../../../etc/passwd').success).toBe(false)
    expect(slugSchema.safeParse('../../.env').success).toBe(false)
    expect(slugSchema.safeParse('/etc/passwd').success).toBe(false)
  })

  it('rejects invalid formats', () => {
    expect(slugSchema.safeParse('UPPERCASE').success).toBe(false)
    expect(slugSchema.safeParse('has spaces').success).toBe(false)
    expect(slugSchema.safeParse('').success).toBe(false)
    expect(slugSchema.safeParse('slug/with/slashes').success).toBe(false)
    expect(slugSchema.safeParse('slug.with.dots').success).toBe(false)
  })

  it('rejects too-long slugs', () => {
    const longSlug = 'a'.repeat(81)
    expect(slugSchema.safeParse(longSlug).success).toBe(false)
  })

  it('accepts max length slug', () => {
    const maxSlug = 'a'.repeat(80)
    expect(slugSchema.safeParse(maxSlug).success).toBe(true)
  })
})
