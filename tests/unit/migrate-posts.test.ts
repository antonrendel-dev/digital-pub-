/**
 * Tests for scripts/migrate-posts.ts
 * TDD: tests written before implementation.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildPostData } from '../../scripts/migrate-posts'

// ────────────────────────────────────────────────────────────────────────────
// Unit: buildPostData helper
// ────────────────────────────────────────────────────────────────────────────

describe('buildPostData', () => {
  const prismaPost = {
    id: 1,
    type: 'vacancy' as const,
    title: 'Senior Developer',
    slug: 'senior-developer-123',
    description: 'Great job',
    company: 'ACME Corp',
    salary: '200k',
    status: 'published' as const,
    source: 'telegram' as const,
    imageUrl: 'https://example.com/img.jpg',
    telegramMessageId: 'msg-42',
    channelUsername: 'jobchannel',
    categoryId: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
  }

  const tagIdMap = new Map<string, string>([
    ['smm', 'payload-tag-id-1'],
    ['copywriting', 'payload-tag-id-2'],
  ])

  const prismaTags = [{ tagId: 1, tag: { slug: 'smm' } }]

  it('maps type, title, slug correctly', () => {
    const data = buildPostData(prismaPost, prismaTags, tagIdMap)
    expect(data.type).toBe('vacancy')
    expect(data.title).toBe('Senior Developer')
    expect(data.slug).toBe('senior-developer-123')
  })

  it('maps all required Prisma camelCase fields to Payload fields', () => {
    const data = buildPostData(prismaPost, prismaTags, tagIdMap)
    expect(data.telegramMessageId).toBe('msg-42')
    expect(data.channelUsername).toBe('jobchannel')
    expect(data.source).toBe('telegram')
    expect(data.status).toBe('published')
  })

  it('migrate_posts_field_level_spot_check — spot-checked post has non-null type, title, telegramMessageId, channelUsername, source, status', () => {
    const data = buildPostData(prismaPost, prismaTags, tagIdMap)
    expect(data.type).toBeTruthy()
    expect(data.title).toBeTruthy()
    expect(data.telegramMessageId).toBeTruthy()
    expect(data.channelUsername).toBeTruthy()
    expect(data.source).toBeTruthy()
    expect(data.status).toBeTruthy()
  })

  it('resolves tag IDs from slug map and produces tags array', () => {
    const data = buildPostData(prismaPost, prismaTags, tagIdMap)
    expect(data.tags).toEqual(['payload-tag-id-1'])
  })

  it('migrate_posts_tags_relationship — post with multiple tags maps all known slugs', () => {
    const multiTags = [
      { tagId: 1, tag: { slug: 'smm' } },
      { tagId: 2, tag: { slug: 'copywriting' } },
    ]
    const data = buildPostData(prismaPost, multiTags, tagIdMap)
    expect(data.tags).toHaveLength(2)
    expect(data.tags).toContain('payload-tag-id-1')
    expect(data.tags).toContain('payload-tag-id-2')
  })

  it('returns empty tags array when post has no PostTag entries', () => {
    const data = buildPostData(prismaPost, [], tagIdMap)
    expect(data.tags).toEqual([])
  })

  it('skips tags whose slug is not in tagIdMap (unknown tags)', () => {
    const unknownTags = [{ tagId: 99, tag: { slug: 'unknown-tag' } }]
    const data = buildPostData(prismaPost, unknownTags, tagIdMap)
    expect(data.tags).toEqual([])
  })

  it('handles null slug gracefully', () => {
    const postWithNullSlug = { ...prismaPost, slug: null }
    const data = buildPostData(postWithNullSlug, [], tagIdMap)
    expect(data.slug).toBeNull()
  })

  it('handles null imageUrl gracefully', () => {
    const postWithNoImage = { ...prismaPost, imageUrl: null }
    const data = buildPostData(postWithNoImage, [], tagIdMap)
    expect(data.imageUrl).toBeNull()
  })

  it('preserves createdAt and updatedAt for chronological ordering', () => {
    const data = buildPostData(prismaPost, [], tagIdMap)
    expect(data.createdAt).toBe(prismaPost.createdAt.toISOString())
    expect(data.updatedAt).toBe(prismaPost.updatedAt.toISOString())
  })

  it('does not include categoryId in the result', () => {
    const data = buildPostData(prismaPost, prismaTags, tagIdMap)
    expect('categoryId' in data).toBe(false)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Integration-style: migratePosts function (mocked Prisma + Payload)
// ────────────────────────────────────────────────────────────────────────────

describe('migratePosts integration', () => {
  const makePrismaPosts = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      type: 'vacancy' as const,
      title: `Post ${i + 1}`,
      slug: `post-${i + 1}`,
      description: `Description ${i + 1}`,
      company: `Company ${i + 1}`,
      salary: null,
      status: 'published' as const,
      source: 'telegram' as const,
      imageUrl: null,
      telegramMessageId: `msg-${i + 1}`,
      channelUsername: `channel-${i + 1}`,
      categoryId: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      tags: i === 0 ? [{ tagId: 1, tag: { slug: 'smm' } }] : [],
    }))

  const mockPayloadTags = {
    docs: [
      { id: 'payload-tag-1', slug: 'smm' },
      { id: 'payload-tag-2', slug: 'copywriting' },
    ],
    totalDocs: 2,
  }

  it('migrate_posts_count_assertion — payload.create called N times for N Prisma posts', async () => {
    const N = 3
    const prismaPosts = makePrismaPosts(N)

    const mockPrisma = {
      post: {
        findMany: jest.fn().mockResolvedValue(prismaPosts),
        count: jest.fn().mockResolvedValue(N),
      },
    }

    const mockPayload = {
      create: jest.fn().mockResolvedValue({ id: 'new-id' }),
      find: jest
        .fn()
        .mockResolvedValueOnce(mockPayloadTags) // for tags loading
        .mockResolvedValue({ totalDocs: N }), // for count assertion
    }

    const { migratePosts } = await import('../../scripts/migrate-posts')
    await migratePosts(mockPrisma as any, mockPayload as any)

    expect(mockPayload.create).toHaveBeenCalledTimes(N)
  })

  it('migrate_posts_tags_relationship — at least one migrated post has non-empty tags array', async () => {
    const prismaPosts = makePrismaPosts(3) // first post has tag 'smm'

    const mockPrisma = {
      post: {
        findMany: jest.fn().mockResolvedValue(prismaPosts),
        count: jest.fn().mockResolvedValue(3),
      },
    }

    const createCalls: any[] = []
    const mockPayload = {
      create: jest.fn().mockImplementation((args) => {
        createCalls.push(args)
        return Promise.resolve({ id: `id-${createCalls.length}` })
      }),
      find: jest.fn().mockResolvedValueOnce(mockPayloadTags).mockResolvedValue({ totalDocs: 3 }),
    }

    const { migratePosts } = await import('../../scripts/migrate-posts')
    await migratePosts(mockPrisma as any, mockPayload as any)

    // First post should have tags
    const firstCall = createCalls[0]
    expect(firstCall.data.tags).toHaveLength(1)
    expect(firstCall.data.tags[0]).toBe('payload-tag-1')
  })

  it('skips (does not throw) when payload.create rejects with unique constraint error', async () => {
    const prismaPosts = makePrismaPosts(2)

    const mockPrisma = {
      post: {
        findMany: jest.fn().mockResolvedValue(prismaPosts),
        count: jest.fn().mockResolvedValue(2),
      },
    }

    let callCount = 0
    const mockPayload = {
      create: jest.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) return Promise.reject(new Error('unique constraint violation'))
        return Promise.resolve({ id: 'id-2' })
      }),
      find: jest.fn().mockResolvedValueOnce(mockPayloadTags).mockResolvedValue({ totalDocs: 1 }),
    }

    const { migratePosts } = await import('../../scripts/migrate-posts')
    await expect(migratePosts(mockPrisma as any, mockPayload as any)).resolves.not.toThrow()
  })

  it('passes overrideAccess: true when creating each post', async () => {
    const prismaPosts = makePrismaPosts(1)

    const mockPrisma = {
      post: {
        findMany: jest.fn().mockResolvedValue(prismaPosts),
        count: jest.fn().mockResolvedValue(1),
      },
    }

    const createCalls: any[] = []
    const mockPayload = {
      create: jest.fn().mockImplementation((args) => {
        createCalls.push(args)
        return Promise.resolve({ id: 'id-1' })
      }),
      find: jest.fn().mockResolvedValueOnce(mockPayloadTags).mockResolvedValue({ totalDocs: 1 }),
    }

    const { migratePosts } = await import('../../scripts/migrate-posts')
    await migratePosts(mockPrisma as any, mockPayload as any)

    expect(createCalls[0].overrideAccess).toBe(true)
    expect(createCalls[0].collection).toBe('posts')
  })
})
