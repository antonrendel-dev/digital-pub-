import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET() {
  const payload = await getPayload({ config })
  // overrideAccess: false — Payload enforces the read access function from articles.ts
  // (non-admin gets { status: { equals: 'published' } } filter applied automatically)
  const result = await payload.find({
    collection: 'articles',
    overrideAccess: false,
  })
  return Response.json(result)
}

export async function POST(req: Request) {
  const payload = await getPayload({ config })

  let user: Awaited<ReturnType<typeof payload.auth>>['user']
  try {
    ;({ user } = await payload.auth({ headers: req.headers }))
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'agent' && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const article = await payload.create({
      collection: 'articles',
      data: body as Record<string, unknown>,
      overrideAccess: false,
      user,
    })
    return Response.json(article, { status: 201 })
  } catch (err: unknown) {
    // Preserve HTTP status from Payload APIError; don't leak internal messages
    if (err instanceof Error && 'status' in err) {
      const status = (err as { status: number }).status
      if (status === 403) return Response.json({ error: 'Forbidden' }, { status: 403 })
      const isPublic = 'isPublic' in err ? (err as { isPublic: boolean }).isPublic : false
      const message = isPublic ? err.message : 'Validation error'
      return Response.json(
        { error: message },
        { status: status >= 400 && status < 500 ? status : 400 }
      )
    }
    return Response.json({ error: 'Validation error' }, { status: 400 })
  }
}
