import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'
import type { FeedPost } from './postUtils'

export { getPrimaryCategorySlug, type FeedPost } from './postUtils'

export const slugSchema = z.string().regex(/^[a-z0-9-_]{1,80}$/)

type PayloadTag = { id: number; name: string; slug: string; tagType: string }
type PayloadPost = {
  id: number
  type: 'vacancy' | 'resume'
  title: string
  slug: string | null
  description: string | null
  company: string | null
  salary: string | null
  imageUrl: string | null
  channelUsername: string | null
  telegramMessageId: string | null
  createdAt: string | Date
  tags: PayloadTag[]
}

export function toFeedPost(p: PayloadPost): FeedPost {
  const createdAt = typeof p.createdAt === 'string' ? p.createdAt : p.createdAt.toISOString()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return {
    id: p.id,
    type: p.type,
    title: p.title.replace(/^#+\s*/, ''),
    slug: p.slug,
    description: p.description,
    company: p.company,
    salary: p.salary,
    imageUrl: p.imageUrl,
    channelUsername: p.channelUsername,
    telegramMessageId: p.telegramMessageId,
    createdAt,
    isNew: new Date(createdAt) > cutoff,
    tags: (p.tags ?? []).map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      tagType: tag.tagType,
    })),
  }
}

export async function getPublishedPosts(): Promise<FeedPost[]> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'posts',
      where: { status: { equals: 'published' } },
      limit: 100,
      sort: '-createdAt',
    })
    return (result.docs as unknown as PayloadPost[]).map(toFeedPost)
  } catch (err) {
    console.error('[posts] DB error:', err)
    return []
  }
}

export async function getPostsByType(type: 'vacancy' | 'resume'): Promise<FeedPost[]> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'posts',
      where: {
        status: { equals: 'published' },
        type: { equals: type },
        description: { not_equals: null },
      },
      limit: 100,
      sort: '-createdAt',
    })
    return (result.docs as unknown as PayloadPost[]).map(toFeedPost)
  } catch (err) {
    console.error('[posts] DB error:', err)
    return []
  }
}

export async function getPostById(id: number): Promise<FeedPost | null> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'posts',
      where: { id: { equals: id } },
      limit: 1,
    })
    if (!result.docs.length) return null
    return toFeedPost(result.docs[0] as unknown as PayloadPost)
  } catch (err) {
    console.error('[posts] DB error:', err)
    return null
  }
}

export async function getPostsByTypePaginated(
  type: 'vacancy' | 'resume',
  page: number = 1,
  pageSize: number = 20
): Promise<{ posts: FeedPost[]; total: number; totalPages: number }> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'posts',
      where: {
        status: { equals: 'published' },
        type: { equals: type },
        description: { not_equals: null },
      },
      limit: pageSize,
      page,
      sort: '-createdAt',
    })
    return {
      posts: (result.docs as unknown as PayloadPost[]).map(toFeedPost),
      total: result.totalDocs,
      totalPages: result.totalPages,
    }
  } catch (err) {
    console.error('[posts] DB error:', err)
    return { posts: [], total: 0, totalPages: 0 }
  }
}

export async function getPostBySlug(slug: string): Promise<FeedPost | null> {
  const parsed = slugSchema.safeParse(slug)
  if (!parsed.success) return null

  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'posts',
      where: { slug: { equals: slug } },
      limit: 1,
    })
    if (!result.docs.length) return null
    return toFeedPost(result.docs[0] as unknown as PayloadPost)
  } catch (err) {
    console.error('[posts] DB error:', err)
    return null
  }
}

export async function getPostsByTool(
  query: string,
  page = 1,
  limit = 20
): Promise<{ posts: FeedPost[]; total: number; totalPages: number }> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'posts',
      where: {
        and: [
          { status: { equals: 'published' } },
          { type: { equals: 'vacancy' } },
          {
            or: [{ title: { like: query } }, { description: { like: query } }],
          },
        ],
      },
      limit,
      page,
      sort: '-createdAt',
    })
    return {
      posts: (result.docs as unknown as PayloadPost[]).map(toFeedPost),
      total: result.totalDocs,
      totalPages: result.totalPages,
    }
  } catch (err) {
    console.error('[posts] getPostsByTool error:', err)
    return { posts: [], total: 0, totalPages: 0 }
  }
}
