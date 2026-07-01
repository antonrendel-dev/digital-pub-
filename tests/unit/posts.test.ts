/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPayload } from 'payload'
import { toFeedPost, getPublishedPosts, getPostsByTypePaginated } from '../../lib/posts'

jest.mock('payload', () => ({ getPayload: jest.fn() }))
jest.mock('@payload-config', () => ({}), { virtual: true })

const mockGetPayload = jest.mocked(getPayload)

beforeEach(() => {
  jest.resetAllMocks()
})

describe('toFeedPost', () => {
  it('FeedPost fields non-undefined — Payload flat tags shape', () => {
    const payloadPost = {
      id: 1,
      type: 'vacancy' as const,
      title: 'Senior Dev',
      slug: 'senior-dev',
      description: 'Great job',
      company: 'ACME',
      salary: '200k',
      imageUrl: null,
      channelUsername: 'jobs',
      telegramMessageId: 'msg1',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      tags: [{ id: 10, name: 'SMM', slug: 'smm', tagType: 'specialization' }],
    }
    const result = toFeedPost(payloadPost)
    expect(result.id).toBe(1)
    expect(result.type).toBe('vacancy')
    expect(result.title).toBeDefined()
    expect(result.createdAt).toBeDefined()
    expect(Array.isArray(result.tags)).toBe(true)
    expect(result.tags[0].name).toBe('SMM')
    expect(result.tags[0].slug).toBe('smm')
  })
})

describe('getPublishedPosts', () => {
  it('DB unavailable resilience — returns [] and logs warn', async () => {
    mockGetPayload.mockRejectedValue(new Error('Connection refused'))
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await getPublishedPosts()
    expect(result).toEqual([])
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[posts] DB unavailable'),
      expect.anything()
    )
    warnSpy.mockRestore()
  })
})

describe('getPostBySlug', () => {
  it('unknown slug returns null', async () => {
    mockGetPayload.mockResolvedValue({
      find: jest.fn().mockResolvedValue({ docs: [], totalDocs: 0, totalPages: 0 }),
    } as any)
    const { getPostBySlug } = await import('../../lib/posts')
    const result = await getPostBySlug('nonexistent-slug')
    expect(result).toBeNull()
  })
})

describe('getPostsByTypePaginated', () => {
  it('returns correct shape { posts, total, totalPages }', async () => {
    mockGetPayload.mockResolvedValue({
      find: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 1,
            type: 'vacancy',
            title: 'Job',
            slug: 'job',
            description: 'desc',
            company: 'Co',
            salary: null,
            imageUrl: null,
            channelUsername: 'ch',
            telegramMessageId: 'msg1',
            createdAt: new Date('2024-01-01'),
            tags: [],
          },
        ],
        totalDocs: 42,
        totalPages: 3,
      }),
    } as any)
    const result = await getPostsByTypePaginated('vacancy', 1, 20)
    expect(Array.isArray(result.posts)).toBe(true)
    expect(result.total).toBe(42)
    expect(result.totalPages).toBe(3)
  })
})
