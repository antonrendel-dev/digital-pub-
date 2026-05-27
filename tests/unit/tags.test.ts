/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPayload } from 'payload'
import { getTagBySlug, getTagsWithCounts } from '../../lib/tags'

jest.mock('payload', () => ({ getPayload: jest.fn() }))
jest.mock('@payload-config', () => ({}), { virtual: true })

const mockGetPayload = jest.mocked(getPayload)

// Сброс моков между тестами
beforeEach(() => {
  jest.resetAllMocks()
})

describe('getTagBySlug', () => {
  it('valid slug returns TagDetail with all SEO fields including h1', async () => {
    mockGetPayload.mockResolvedValue({
      find: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 1,
            name: 'SMM',
            slug: 'smm',
            tagType: 'specialization',
            h1: 'SMM заголовок',
            seoTitle: 'SMM вакансии',
            seoDescription: 'desc',
            seoText: 'rich text',
          },
        ],
        totalDocs: 1,
      }),
    } as any)
    const result = await getTagBySlug('smm')
    expect(result).not.toBeNull()
    expect(result!.name).toBe('SMM')
    expect(result!.h1).toBeDefined()
    expect(result!.seoTitle).not.toBeUndefined()
    expect(result!.seoDescription).not.toBeUndefined()
    expect(result!.seoText).not.toBeUndefined()
  })

  it('invalid slug returns null without calling getPayload', async () => {
    const findSpy = jest.fn()
    mockGetPayload.mockResolvedValue({ find: findSpy } as any)
    const result = await getTagBySlug('../evil')
    expect(result).toBeNull()
    expect(findSpy).not.toHaveBeenCalled()
  })
})

describe('getTagsWithCounts', () => {
  it('returns array with count per tag aggregated from posts', async () => {
    mockGetPayload.mockResolvedValue({
      find: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 1,
            tags: [
              { id: 10, slug: 'smm', name: 'SMM', tagType: 'specialization' },
              { id: 11, slug: 'content', name: 'Контент', tagType: 'format' },
            ],
          },
          { id: 2, tags: [{ id: 10, slug: 'smm', name: 'SMM', tagType: 'specialization' }] },
        ],
        totalDocs: 2,
      }),
    } as any)
    const result = await getTagsWithCounts()
    expect(Array.isArray(result)).toBe(true)
    const smm = result.find((t) => t.slug === 'smm')
    const content = result.find((t) => t.slug === 'content')
    expect(smm?.count).toBe(2)
    expect(content?.count).toBe(1)
  })
})
