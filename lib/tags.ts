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
  try {
    const payload = await getPayload({ config })
    // Loads up to 10k posts to aggregate tag counts in memory — acceptable for current scale (<50k posts)
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
  } catch (err) {
    console.error('[tags] DB error:', err)
    return []
  }
}

export async function getTagsWithCountsByType(type: 'vacancy' | 'resume'): Promise<TagWithCount[]> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'posts',
      where: { status: { equals: 'published' }, type: { equals: type } },
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
  } catch (err) {
    console.error('[tags] DB error:', err)
    return []
  }
}

export async function getTagBySlug(slug: string): Promise<TagDetail | null> {
  const parsed = slugSchema.safeParse(slug)
  if (!parsed.success) return null

  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'tags',
      where: { slug: { equals: slug } },
      limit: 1,
    })

    if (!result.docs.length) return null
    const tag = result.docs[0] as any
    const seoText = typeof tag.seoText === 'string' ? tag.seoText || null : null
    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      tagType: tag.tagType,
      h1: tag.h1 ?? null,
      seoTitle: tag.seoTitle ?? null,
      seoDescription: tag.seoDescription ?? null,
      seoText,
    }
  } catch (err) {
    console.error('[tags] DB error:', err)
    return null
  }
}

export async function getPostsByTag(tagSlug: string) {
  const parsed = slugSchema.safeParse(tagSlug)
  if (!parsed.success) return []

  try {
    const payload = await getPayload({ config })

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
  } catch (err) {
    console.error('[tags] DB error:', err)
    return []
  }
}

export async function getPostsByTwoTags(tag1Slug: string, tag2Slug: string) {
  const p1 = slugSchema.safeParse(tag1Slug)
  const p2 = slugSchema.safeParse(tag2Slug)
  if (!p1.success || !p2.success) return []

  try {
    const payload = await getPayload({ config })

    const [r1, r2] = await Promise.all([
      payload.find({ collection: 'tags', where: { slug: { equals: tag1Slug } }, limit: 1 }),
      payload.find({ collection: 'tags', where: { slug: { equals: tag2Slug } }, limit: 1 }),
    ])
    if (!r1.docs.length || !r2.docs.length) return []
    const id1 = (r1.docs[0] as any).id
    const id2 = (r2.docs[0] as any).id

    // Fetch by the first tag, filter in memory by second
    const posts = await payload.find({
      collection: 'posts',
      where: {
        status: { equals: 'published' },
        description: { not_equals: null },
        type: { equals: 'vacancy' },
        tags: { in: [id1] },
      },
      limit: 200,
      sort: '-createdAt',
      depth: 1,
    })

    return (posts.docs as unknown as PayloadPost[])
      .filter((p) => p.tags?.some((t) => t.id === id2))
      .map(toFeedPost)
  } catch (err) {
    console.error('[tags] getPostsByTwoTags error:', err)
    return []
  }
}

export async function getStats() {
  try {
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
  } catch (err) {
    console.error('[tags] DB error:', err)
    return { vacancyCount: 0, resumeCount: 0, companyCount: 0, newToday: 0 }
  }
}

export interface CategoryStats {
  total: number
  newThisWeek: number
  avgSalary: string | null
}

export async function getCategoryStats(tagSlug: string): Promise<CategoryStats> {
  const parsed = slugSchema.safeParse(tagSlug)
  if (!parsed.success) return { total: 0, newThisWeek: 0, avgSalary: null }

  try {
    const payload = await getPayload({ config })

    const tagResult = await payload.find({
      collection: 'tags',
      where: { slug: { equals: tagSlug } },
      limit: 1,
    })
    if (!tagResult.docs.length) return { total: 0, newThisWeek: 0, avgSalary: null }
    const tagId = (tagResult.docs[0] as any).id

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const [allPosts, newPosts] = await Promise.all([
      payload.find({
        collection: 'posts',
        where: {
          status: { equals: 'published' },
          type: { equals: 'vacancy' },
          tags: { in: [tagId] },
        },
        limit: 500,
        depth: 0,
      }),
      payload.find({
        collection: 'posts',
        where: {
          status: { equals: 'published' },
          type: { equals: 'vacancy' },
          tags: { in: [tagId] },
          createdAt: { greater_than_equal: weekAgo.toISOString() },
        },
        limit: 0,
      }),
    ])

    // Parse salary numbers from strings like "от 80 000 ₽", "80 000 – 120 000 ₽"
    const salaries: number[] = (allPosts.docs as any[])
      .map((p) => p.salary as string | null)
      .filter(Boolean)
      .flatMap((s) => {
        const nums = s!.replace(/\s/g, '').match(/\d{4,7}/g)
        return nums ? nums.map(Number) : []
      })
      .filter((n) => n >= 10000 && n <= 1000000)

    let avgSalary: string | null = null
    if (salaries.length >= 3) {
      const avg = Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length / 1000) * 1000
      avgSalary = avg.toLocaleString('ru-RU') + ' ₽'
    }

    return {
      total: allPosts.totalDocs,
      newThisWeek: newPosts.totalDocs,
      avgSalary,
    }
  } catch {
    return { total: 0, newThisWeek: 0, avgSalary: null }
  }
}
