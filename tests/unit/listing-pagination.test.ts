/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPayload } from 'payload'
import { getPostsByTag, getPostsByTwoTags } from '../../lib/tags'

jest.mock('payload', () => ({ getPayload: jest.fn() }))
jest.mock('@payload-config', () => ({}), { virtual: true })

const mockGetPayload = jest.mocked(getPayload)

beforeEach(() => {
  jest.resetAllMocks()
})

/** Отдаёт `total` постов постранично, как это делает Payload. */
function payloadWith(total: number, tagId = 1, extraTagId?: number) {
  const post = (i: number) => ({
    id: 1000 + i,
    type: 'vacancy',
    slug: `v-${i}`,
    title: 'V',
    description: 'd',
    createdAt: '2026-08-01T00:00:00.000Z',
    tags: extraTagId ? [{ id: tagId }, { id: extraTagId }] : [{ id: tagId }],
  })
  const find = jest.fn().mockImplementation(({ collection, limit, page }: any) => {
    if (collection === 'tags') {
      return Promise.resolve({ docs: [{ id: tagId === 1 ? 1 : tagId }], totalDocs: 1 })
    }
    const p = page ?? 1
    const start = (p - 1) * limit
    const docs = Array.from({ length: Math.max(0, Math.min(limit, total - start)) }, (_, i) =>
      post(start + i)
    )
    return Promise.resolve({ docs, totalDocs: total, hasNextPage: start + docs.length < total })
  })
  return { find }
}

describe('листинги не обрезают выборку лимитом', () => {
  it('getPostsByTag отдаёт все посты тега, а не первую страницу', async () => {
    mockGetPayload.mockResolvedValue(payloadWith(1200) as any)
    const posts = await getPostsByTag('smm', 'vacancy')
    expect(posts).toHaveLength(1200)
  })

  it('getPostsByTag кладёт тип в запрос, а не фильтрует после выборки', async () => {
    const p = payloadWith(10)
    mockGetPayload.mockResolvedValue(p as any)
    await getPostsByTag('smm', 'vacancy')
    const postCalls = p.find.mock.calls.filter((c: any[]) => c[0].collection === 'posts')
    expect(postCalls.length).toBeGreaterThan(0)
    for (const [args] of postCalls) {
      expect(args.where.type).toEqual({ equals: 'vacancy' })
    }
  })

  it('getPostsByTag без типа не навязывает фильтр', async () => {
    const p = payloadWith(10)
    mockGetPayload.mockResolvedValue(p as any)
    await getPostsByTag('smm')
    const [args] = p.find.mock.calls.find((c: any[]) => c[0].collection === 'posts') as any[]
    expect(args.where.type).toBeUndefined()
  })

  it('getPostsByTwoTags отдаёт все посты пересечения', async () => {
    mockGetPayload.mockResolvedValue(payloadWith(700, 1, 1) as any)
    const posts = await getPostsByTwoTags('smm', 'udalyonka')
    expect(posts).toHaveLength(700)
  })
})
