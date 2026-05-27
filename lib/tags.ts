/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPayload } from 'payload'
import config from '@payload-config'
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
  h1: string | null
  seoTitle: string | null
  seoDescription: string | null
  seoText: string | null
}

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

export async function getTagsWithCounts(): Promise<TagWithCount[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'posts',
    where: { status: { equals: 'published' } },
    limit: 10000,
    depth: 1,
  })

  const tagMap = new Map<number, TagWithCount>()
  for (const post of result.docs as unknown as PayloadPost[]) {
    for (const tag of post.tags ?? []) {
      if (typeof tag === 'object' && tag !== null && tag.id) {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, {
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            tagType: tag.tagType,
            count: 0,
          })
        }
        tagMap.get(tag.id)!.count++
      }
    }
  }

  return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export async function getTagBySlug(slug: string): Promise<TagDetail | null> {
  const parsed = slugSchema.safeParse(slug)
  if (!parsed.success) return null

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'tags',
    where: { slug: { equals: slug } },
    limit: 1,
  })

  if (!result.docs.length) return null
  const tag = result.docs[0] as any
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    tagType: tag.tagType,
    h1: tag.h1 ?? null,
    seoTitle: tag.seoTitle ?? null,
    seoDescription: tag.seoDescription ?? null,
    seoText: tag.seoText ?? null,
  }
}

export async function getPostsByTag(tagSlug: string) {
  const parsed = slugSchema.safeParse(tagSlug)
  if (!parsed.success) return []

  const payload = await getPayload({ config })

  // Resolve tag ID by slug first
  const tagResult = await payload.find({
    collection: 'tags',
    where: { slug: { equals: tagSlug } },
    limit: 1,
  })
  if (!tagResult.docs.length) return []
  const tagId = (tagResult.docs[0] as any).id

  const posts = await payload.find({
    collection: 'posts',
    where: {
      status: { equals: 'published' },
      description: { not_equals: null },
      tags: { in: [tagId] },
    },
    limit: 100,
    sort: '-createdAt',
  })

  return (posts.docs as unknown as PayloadPost[]).map(toFeedPost)
}

export async function getStats() {
  const payload = await getPayload({ config })
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [vacancyResult, resumeResult, companyPosts, newTodayResult] = await Promise.all([
    payload.find({
      collection: 'posts',
      where: { status: { equals: 'published' }, type: { equals: 'vacancy' } },
      limit: 0,
    }),
    payload.find({
      collection: 'posts',
      where: { status: { equals: 'published' }, type: { equals: 'resume' } },
      limit: 0,
    }),
    payload.find({
      collection: 'posts',
      where: { status: { equals: 'published' }, company: { not_equals: null } },
      limit: 10000,
      depth: 0,
    }),
    payload.find({
      collection: 'posts',
      where: {
        status: { equals: 'published' },
        createdAt: { greater_than_equal: today.toISOString() },
      },
      limit: 0,
    }),
  ])

  const companyCount = new Set(
    (companyPosts.docs as unknown as Array<{ company: string | null }>)
      .map((p) => p.company)
      .filter(Boolean)
  ).size

  return {
    vacancyCount: vacancyResult.totalDocs,
    resumeCount: resumeResult.totalDocs,
    companyCount,
    newToday: newTodayResult.totalDocs,
  }
}
