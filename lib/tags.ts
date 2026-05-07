import { prisma } from './prisma'
import { slugSchema, toFeedPost } from './posts'

export interface TagWithCount {
  id: number
  name: string
  slug: string
  tagType: string
  count: number
}

export interface TagDetail {
  id: number
  name: string
  slug: string
  tagType: string
  seoTitle: string | null
  seoDescription: string | null
  seoText: string | null
}

/** Get all tags with post counts */
export async function getTagsWithCounts(): Promise<TagWithCount[]> {
  const tags = await prisma.tag.findMany({
    include: {
      posts: {
        select: { postId: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    tagType: t.tagType,
    count: t.posts.length,
  }))
}

/** Get tag by slug with SEO data */
export async function getTagBySlug(slug: string): Promise<TagDetail | null> {
  const parsed = slugSchema.safeParse(slug)
  if (!parsed.success) return null

  const tag = await prisma.tag.findUnique({
    where: { slug },
  })

  if (!tag) return null

  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    tagType: tag.tagType,
    seoTitle: tag.seoTitle,
    seoDescription: tag.seoDescription,
    seoText: tag.seoText,
  }
}

/** Get published posts by tag slug */
export async function getPostsByTag(tagSlug: string) {
  const parsed = slugSchema.safeParse(tagSlug)
  if (!parsed.success) return []

  const posts = await prisma.post.findMany({
    where: {
      status: 'published',
      description: { not: null },
      tags: {
        some: {
          tag: { slug: tagSlug },
        },
      },
    },
    include: {
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return posts.map(toFeedPost)
}

/** Get DB statistics for sidebar */
export async function getStats() {
  const [vacancyCount, resumeCount, companyCount, newToday] = await Promise.all([
    prisma.post.count({ where: { status: 'published', type: 'vacancy' } }),
    prisma.post.count({ where: { status: 'published', type: 'resume' } }),
    prisma.post.groupBy({
      by: ['company'],
      where: { status: 'published', company: { not: null } },
    }).then((r) => r.length),
    prisma.post.count({
      where: {
        status: 'published',
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ])

  return { vacancyCount, resumeCount, companyCount, newToday }
}
