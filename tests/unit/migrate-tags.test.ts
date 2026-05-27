/**
 * Tests for scripts/migrate-tags.ts
 * TDD: tests written before implementation.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { toRichText, buildTagData } from '../../scripts/migrate-tags'

// ────────────────────────────────────────────────────────────────────────────
// Unit: toRichText helper
// ────────────────────────────────────────────────────────────────────────────

describe('toRichText', () => {
  it('returns null for null input', () => {
    expect(toRichText(null)).toBeNull()
  })

  it('returns null for empty string input (falsy)', () => {
    expect(toRichText('')).toBeNull()
  })

  it('migrateTags_lexical_json_validity — wraps non-empty string in valid Lexical JSON', () => {
    const result = toRichText('Hello world')
    expect(result).not.toBeNull()
    expect(result).toMatchObject({
      root: {
        type: 'root',
        version: 1,
        children: [
          {
            type: 'paragraph',
            version: 1,
            children: [
              {
                type: 'text',
                version: 1,
                text: 'Hello world',
                format: 0,
              },
            ],
          },
        ],
      },
    })
  })

  it('migrateTags_null_seoText_passthrough — null returns null (no wrapper)', () => {
    const result = toRichText(null)
    expect(result).toBeNull()
    // Make sure we don't return an empty object
    expect(result).not.toEqual({})
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Unit: buildTagData helper
// ────────────────────────────────────────────────────────────────────────────

describe('buildTagData', () => {
  const prismaTag = {
    id: 1,
    name: 'Копирайтинг',
    slug: 'copywriting',
    tagType: 'specialization' as const,
    seoTitle: 'SEO Title',
    seoDescription: 'SEO Description',
    seoText: 'Some rich content here',
  }

  it('migrateTags_spot_check_seo_fields — all 6 fields present and not undefined', () => {
    const data = buildTagData(prismaTag)
    expect(data.name).toBeDefined()
    expect(data.slug).toBeDefined()
    expect(data.tagType).toBeDefined()
    expect(data.seoTitle).not.toBeUndefined()
    expect(data.seoDescription).not.toBeUndefined()
    expect(data.seoText).not.toBeUndefined()
  })

  it('maps name, slug, tagType correctly', () => {
    const data = buildTagData(prismaTag)
    expect(data.name).toBe('Копирайтинг')
    expect(data.slug).toBe('copywriting')
    expect(data.tagType).toBe('specialization')
  })

  it('sets h1 to null (field absent in Prisma)', () => {
    const data = buildTagData(prismaTag)
    expect(data.h1).toBeNull()
  })

  it('converts seoText to Lexical JSON when present', () => {
    const data = buildTagData(prismaTag)
    expect(data.seoText).toMatchObject({
      root: { type: 'root', version: 1 },
    })
  })

  it('passes seoText as null when Prisma value is null', () => {
    const tag = { ...prismaTag, seoText: null }
    const data = buildTagData(tag)
    expect(data.seoText).toBeNull()
  })

  it('passes seoText as null when Prisma value is empty string', () => {
    const tag = { ...prismaTag, seoText: '' }
    const data = buildTagData(tag)
    expect(data.seoText).toBeNull()
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Integration-style: migrateTags function (mocked Prisma + Payload)
// ────────────────────────────────────────────────────────────────────────────

describe('migrateTags integration', () => {
  const makePrismaTags = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Tag ${i + 1}`,
      slug: `tag-${i + 1}`,
      tagType: 'specialization' as const,
      seoTitle: `SEO ${i + 1}`,
      seoDescription: `Desc ${i + 1}`,
      seoText: i % 2 === 0 ? `Content ${i + 1}` : null,
    }))

  it('migrateTags_count_assertion — payload.create called N times for N Prisma tags', async () => {
    const N = 5
    const prismaTags = makePrismaTags(N)

    const mockPrisma = {
      tag: {
        findMany: jest.fn().mockResolvedValue(prismaTags),
        count: jest.fn().mockResolvedValue(N),
      },
    }

    const mockPayload = {
      create: jest.fn().mockResolvedValue({ id: 'some-id' }),
      find: jest.fn().mockResolvedValue({ totalDocs: N }),
    }

    // Import the injectable version
    const { migrateTags } = await import('../../scripts/migrate-tags')
    await migrateTags(mockPrisma as any, mockPayload as any)

    expect(mockPayload.create).toHaveBeenCalledTimes(N)
  })

  it('migrateTags_spot_check_seo_fields — each create call includes all 6 fields', async () => {
    const prismaTags = makePrismaTags(1)

    const mockPrisma = {
      tag: {
        findMany: jest.fn().mockResolvedValue(prismaTags),
        count: jest.fn().mockResolvedValue(1),
      },
    }

    const createCalls: any[] = []
    const mockPayload = {
      create: jest.fn().mockImplementation((args) => {
        createCalls.push(args)
        return Promise.resolve({ id: 'id-1' })
      }),
      find: jest.fn().mockResolvedValue({ totalDocs: 1 }),
    }

    const { migrateTags } = await import('../../scripts/migrate-tags')
    await migrateTags(mockPrisma as any, mockPayload as any)

    expect(createCalls).toHaveLength(1)
    const data = createCalls[0].data
    expect(data.name).not.toBeUndefined()
    expect(data.slug).not.toBeUndefined()
    expect(data.tagType).not.toBeUndefined()
    expect(data.seoTitle).not.toBeUndefined()
    expect(data.seoDescription).not.toBeUndefined()
    // seoText may be null but must not be undefined
    expect('seoText' in data).toBe(true)
  })

  it('skips (does not throw) when payload.create rejects with unique constraint error', async () => {
    const prismaTags = makePrismaTags(2)

    const mockPrisma = {
      tag: {
        findMany: jest.fn().mockResolvedValue(prismaTags),
        count: jest.fn().mockResolvedValue(2),
      },
    }

    let callCount = 0
    const mockPayload = {
      create: jest.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) return Promise.reject(new Error('unique constraint'))
        return Promise.resolve({ id: 'id-2' })
      }),
      find: jest.fn().mockResolvedValue({ totalDocs: 1 }),
    }

    const { migrateTags } = await import('../../scripts/migrate-tags')
    // Should not throw
    await expect(migrateTags(mockPrisma as any, mockPayload as any)).resolves.not.toThrow()
  })
})
