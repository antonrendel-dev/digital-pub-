import { prisma } from './prisma'

export interface FeedPost {
  id: number
  type: 'vacancy' | 'resume'
  title: string
  description: string | null
  company: string | null
  salary: string | null
  channelUsername: string | null
  telegramMessageId: string | null
  createdAt: string
  isNew: boolean
}

function toFeedPost(p: {
  id: number
  type: 'vacancy' | 'resume'
  title: string
  description: string | null
  company: string | null
  salary: string | null
  channelUsername: string | null
  telegramMessageId: string | null
  createdAt: Date
}): FeedPost {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return {
    id: p.id,
    type: p.type,
    title: p.title,
    description: p.description,
    company: p.company,
    salary: p.salary,
    channelUsername: p.channelUsername,
    telegramMessageId: p.telegramMessageId,
    createdAt: p.createdAt.toISOString(),
    isNew: p.createdAt > cutoff,
  }
}

export async function getPublishedPosts(): Promise<FeedPost[]> {
  const posts = await prisma.post.findMany({
    where: { status: 'published' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return posts.map(toFeedPost)
}

export async function getPostsByType(type: 'vacancy' | 'resume'): Promise<FeedPost[]> {
  const posts = await prisma.post.findMany({
    where: { status: 'published', type },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return posts.map(toFeedPost)
}

export async function getPostById(id: number): Promise<FeedPost | null> {
  const post = await prisma.post.findUnique({ where: { id } })
  if (!post) return null
  return toFeedPost(post)
}
