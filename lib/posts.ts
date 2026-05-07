import { prisma } from './prisma'
import { z } from 'zod'

export const slugSchema = z.string().regex(/^[a-z0-9-_]{1,80}$/)

export interface FeedPost {
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
  createdAt: string
  isNew: boolean
  tags: { id: number; name: string; slug: string }[]
}

function toFeedPost(p: {
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
  createdAt: Date
  tags: { tag: { id: number; name: string; slug: string } }[]
}): FeedPost {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return {
    id: p.id,
    type: p.type,
    title: p.title,
    slug: p.slug,
    description: p.description,
    company: p.company,
    salary: p.salary,
    imageUrl: p.imageUrl,
    channelUsername: p.channelUsername,
    telegramMessageId: p.telegramMessageId,
    createdAt: p.createdAt.toISOString(),
    isNew: p.createdAt > cutoff,
    tags: p.tags.map((pt) => ({
      id: pt.tag.id,
      name: pt.tag.name,
      slug: pt.tag.slug,
    })),
  }
}

export async function getPublishedPosts(): Promise<FeedPost[]> {
  try {
    const posts = await prisma.post.findMany({
      where: {
        status: 'published',
        description: { not: null },
      },
      include: {
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return posts.map(toFeedPost)
  } catch {
    console.warn('[posts] DB unavailable')
    return []
  }
}

export async function getPostsByType(type: 'vacancy' | 'resume'): Promise<FeedPost[]> {
  try {
    const posts = await prisma.post.findMany({
      where: {
        status: 'published',
        type,
        description: { not: null },
      },
      include: {
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return posts.map(toFeedPost)
  } catch {
    console.warn(`[posts] DB unavailable`)
    return []
  }
}

export async function getPostById(id: number): Promise<FeedPost | null> {
  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
      },
    })
    if (!post) return null
    return toFeedPost(post)
  } catch {
    console.warn('[posts] DB unavailable')
    return null
  }
}

export async function getPostBySlug(slug: string): Promise<FeedPost | null> {
  const parsed = slugSchema.safeParse(slug)
  if (!parsed.success) return null

  try {
    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        tags: { include: { tag: true } },
      },
    })
    if (!post) return null
    return toFeedPost(post)
  } catch {
    console.warn('[posts] DB unavailable')
    return null
  }
}
