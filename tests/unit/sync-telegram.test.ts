/**
 * Tests for scripts/sync-telegram.ts
 * TDD: tests written before implementation.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as any

beforeAll(() => {
  process.env.PAYLOAD_API_KEY = 'test-secret-key-abc123'
  process.env.PAYLOAD_BASE_URL = 'https://test.d-pub.ru'
})

beforeEach(() => {
  mockFetch.mockReset()
})

describe('savePost', () => {
  const samplePost = {
    messageId: '123',
    text: 'Senior SMM менеджер в компанию ACME. Удалёнка. ЗП 150к.',
    imageUrl: null,
    channelUsername: 'web_vacancy',
    type: 'vacancy' as const,
  }
  const tagMap = { smm: 'tag-id-1', udalyonka: 'tag-id-2' }

  it('returns true on 201 response (new post)', async () => {
    mockFetch.mockResolvedValue({ status: 201, ok: true } as any)
    const { savePost } = await import('../../scripts/sync-telegram')
    const result = await savePost(samplePost, tagMap)
    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('skips post on 409 response (dedup)', async () => {
    mockFetch.mockResolvedValue({ status: 409, ok: false } as any)
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { savePost } = await import('../../scripts/sync-telegram')
    const result = await savePost(samplePost, tagMap)
    expect(result).toBe(false)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('does not log PAYLOAD_API_KEY on error', async () => {
    mockFetch.mockResolvedValue({ status: 500, ok: false } as any)
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { savePost } = await import('../../scripts/sync-telegram')
    await savePost(samplePost, tagMap)
    const allLogs = errorSpy.mock.calls.flat().join(' ')
    expect(allLogs).not.toContain('test-secret-key-abc123')
    expect(allLogs).not.toContain('API-Key')
    errorSpy.mockRestore()
  })
})

describe('resolveTagIds', () => {
  it('maps slugs to IDs from tagMap', async () => {
    const { resolveTagIds } = await import('../../scripts/sync-telegram')
    const tagMap = { smm: 'id-1', seo: 'id-2', udalyonka: 'id-3' }
    expect(resolveTagIds(['smm', 'seo'], tagMap)).toEqual(['id-1', 'id-2'])
  })

  it('filters out slugs not in tagMap', async () => {
    const { resolveTagIds } = await import('../../scripts/sync-telegram')
    const tagMap = { smm: 'id-1' }
    expect(resolveTagIds(['smm', 'unknown-slug'], tagMap)).toEqual(['id-1'])
  })

  it('returns empty array when no slugs match', async () => {
    const { resolveTagIds } = await import('../../scripts/sync-telegram')
    expect(resolveTagIds(['unknown'], {})).toEqual([])
  })
})

describe('loadTagMap', () => {
  it('returns slug→id map from API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        docs: [
          { id: 'id-1', slug: 'smm' },
          { id: 'id-2', slug: 'seo' },
        ],
      }),
    } as any)
    const { loadTagMap } = await import('../../scripts/sync-telegram')
    const map = await loadTagMap()
    expect(map).toEqual({ smm: 'id-1', seo: 'id-2' })
  })

  it('returns empty object on fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'))
    const { loadTagMap } = await import('../../scripts/sync-telegram')
    const map = await loadTagMap()
    expect(map).toEqual({})
  })

  it('returns empty object on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 } as any)
    const { loadTagMap } = await import('../../scripts/sync-telegram')
    const map = await loadTagMap()
    expect(map).toEqual({})
  })
})
