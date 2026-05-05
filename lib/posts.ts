import { prisma } from './prisma'
import { JOBS } from './data'

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
  }
}

/** Fallback: convert mock JOBS to FeedPost[] when DB is unavailable */
function getMockPosts(type?: 'vacancy' | 'resume'): FeedPost[] {
  const jobs = type ? JOBS.filter((_, i) => (type === 'vacancy' ? i % 2 === 0 : i % 2 !== 0)) : JOBS
  return jobs.map((j) => ({
    id: j.id,
    type: (j.id % 2 === 0 ? 'resume' : 'vacancy') as 'vacancy' | 'resume',
    title: j.title,
    slug: null,
    description: j.desc,
    company: j.co,
    salary: j.salary,
    imageUrl: null,
    channelUsername: null,
    telegramMessageId: null,
    createdAt: new Date(Date.now() - j.dord * 86400000).toISOString(),
    isNew: j.isNew,
  }))
}

export async function getPublishedPosts(): Promise<FeedPost[]> {
  try {
    const posts = await prisma.post.findMany({
      where: { status: 'published' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return posts.map(toFeedPost)
  } catch {
    console.warn('[posts] DB unavailable, using mock data')
    return getMockPosts()
  }
}

export async function getPostsByType(type: 'vacancy' | 'resume'): Promise<FeedPost[]> {
  try {
    const posts = await prisma.post.findMany({
      where: { status: 'published', type },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return posts.map(toFeedPost)
  } catch {
    console.warn(`[posts] DB unavailable, using mock ${type} data`)
    return getMockPosts(type)
  }
}

export async function getPostById(id: number): Promise<FeedPost | null> {
  try {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) return null
    return toFeedPost(post)
  } catch {
    console.warn('[posts] DB unavailable, using mock data')
    const mock = getMockPosts().find((p) => p.id === id)
    return mock ?? null
  }
}

export async function getPostBySlug(slug: string): Promise<FeedPost | null> {
  try {
    const post = await prisma.post.findUnique({ where: { slug } })
    if (!post) return null
    return toFeedPost(post)
  } catch {
    console.warn('[posts] DB unavailable, using mock data')
    return null
  }
}
