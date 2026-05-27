/* eslint-disable @typescript-eslint/no-explicit-any */
import { GET, POST } from '../../app/api/articles/route'
import { getPayload } from 'payload'

jest.mock('payload', () => ({ getPayload: jest.fn() }))
jest.mock('@payload-config', () => ({}), { virtual: true })

// Cast to loose mock type — partial payload objects are sufficient for unit tests
const mockGetPayload = getPayload as unknown as jest.Mock<Promise<any>>

function makeRequest(opts: {
  method?: string
  headers?: Record<string, string>
  body?: unknown
  throwOnJson?: boolean
}): Request {
  const { method = 'GET', headers = {}, body, throwOnJson = false } = opts
  return {
    method,
    headers: new Headers(headers),
    json:
      throwOnJson || body === undefined
        ? () => Promise.reject(new SyntaxError('bad json'))
        : () => Promise.resolve(body),
  } as unknown as Request
}

describe('GET /api/articles', () => {
  beforeEach(() => jest.clearAllMocks())

  it('get_no_token_returns_200_published_only', async () => {
    const mockDocs = [
      { id: '1', title: 'A', status: 'published' },
      { id: '2', title: 'B', status: 'published' },
    ]
    mockGetPayload.mockResolvedValue({
      find: jest.fn().mockResolvedValue({ docs: mockDocs, totalDocs: 2 }),
    })

    const res = await GET()
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.docs).toHaveLength(2)
  })

  it('get_excludes_draft', async () => {
    const findMock = jest
      .fn()
      .mockResolvedValue({
        docs: [{ id: '1', title: 'Published', status: 'published' }],
        totalDocs: 1,
      })
    mockGetPayload.mockResolvedValue({ find: findMock })

    await GET()

    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'articles',
        overrideAccess: false,
      })
    )
  })
})

describe('POST /api/articles', () => {
  beforeEach(() => jest.clearAllMocks())

  it('post_no_token_returns_401', async () => {
    mockGetPayload.mockResolvedValue({
      auth: jest.fn().mockResolvedValue({ user: null }),
      create: jest.fn(),
    })

    const res = await POST(makeRequest({ method: 'POST', body: { title: 'T', slug: 's' } }))
    expect(res.status).toBe(401)
  })

  it('post_invalid_token_returns_401', async () => {
    // Simulate Payload throwing on a malformed / invalid token
    mockGetPayload.mockResolvedValue({
      auth: jest.fn().mockRejectedValue(new Error('Invalid token format')),
      create: jest.fn(),
    })

    const res = await POST(
      makeRequest({
        method: 'POST',
        headers: { Authorization: 'users API-Key bad-token-xyz' },
        body: { title: 'T', slug: 's' },
      })
    )
    expect(res.status).toBe(401)
  })

  it('post_admin_token_returns_201', async () => {
    const created = { id: '10', title: 'Admin Article', slug: 'admin-article', status: 'published' }
    mockGetPayload.mockResolvedValue({
      auth: jest.fn().mockResolvedValue({ user: { id: 'u1', role: 'admin' } }),
      create: jest.fn().mockResolvedValue(created),
    })

    const res = await POST(
      makeRequest({
        method: 'POST',
        headers: { Authorization: 'users API-Key admin-key' },
        body: { title: 'Admin Article', slug: 'admin-article', status: 'published' },
      })
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe('10')
  })

  it('post_agent_token_returns_201', async () => {
    const created = { id: '11', title: 'Agent Article', slug: 'agent-article', status: 'draft' }
    mockGetPayload.mockResolvedValue({
      auth: jest.fn().mockResolvedValue({ user: { id: 'u2', role: 'agent' } }),
      create: jest.fn().mockResolvedValue(created),
    })

    const res = await POST(
      makeRequest({
        method: 'POST',
        headers: { Authorization: 'users API-Key agent-key' },
        body: { title: 'Agent Article', slug: 'agent-article', status: 'draft' },
      })
    )
    expect(res.status).toBe(201)
  })

  it('post_sync_role_returns_403', async () => {
    mockGetPayload.mockResolvedValue({
      auth: jest.fn().mockResolvedValue({ user: { id: 'u3', role: 'sync' } }),
      create: jest.fn(),
    })

    const res = await POST(
      makeRequest({
        method: 'POST',
        headers: { Authorization: 'users API-Key sync-key' },
        body: { title: 'T', slug: 's' },
      })
    )
    expect(res.status).toBe(403)
  })

  it('post_invalid_body_returns_400', async () => {
    mockGetPayload.mockResolvedValue({
      auth: jest.fn().mockResolvedValue({ user: { id: 'u2', role: 'agent' } }),
      create: jest.fn(),
    })

    const res = await POST(
      makeRequest({
        method: 'POST',
        headers: { Authorization: 'users API-Key agent-key' },
        throwOnJson: true,
      })
    )
    expect(res.status).toBe(400)
  })

  it('post_create_validation_error_returns_400', async () => {
    const validationErr = Object.assign(new Error('Slug already exists'), {
      status: 400,
      isPublic: true,
    })
    mockGetPayload.mockResolvedValue({
      auth: jest.fn().mockResolvedValue({ user: { id: 'u2', role: 'agent' } }),
      create: jest.fn().mockRejectedValue(validationErr),
    })

    const res = await POST(
      makeRequest({
        method: 'POST',
        headers: { Authorization: 'users API-Key agent-key' },
        body: { title: 'Dupe', slug: 'existing-slug' },
      })
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Slug already exists')
  })
})
