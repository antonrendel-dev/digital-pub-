import { prisma } from './prisma'

export interface FeedPost {
  id: number
  type: 'vacancy' | 'resume'
  title: string
  description: string | null
  company: string | null
  salary: string | null
  channelUsername: string | null
  createdAt: string // serialized for client components
  isNew: boolean
}

export async function getPublishedPosts(): Promise<FeedPost[]> {
  const posts = await prisma.post.findMany({
    where: { status: 'published' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24h ago

  return posts.map((p) => ({
    id: p.id,
    type: p.type,
    title: p.title,
    description: p.description,
    company: p.company,
    salary: p.salary,
    channelUsername: p.channelUsername,
    createdAt: p.createdAt.toISOString(),
    isNew: p.createdAt > cutoff,
  }))
}
