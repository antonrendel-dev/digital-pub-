import { getPayload, type Where } from 'payload'
import { roleHeadline } from './tag-matcher'
import config from '@payload-config'
import { z } from 'zod'
import type { FeedPost } from './postUtils'
import { PROFESSION_PREVIEW_LIMIT } from './professions'

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
    console.warn('[posts] DB unavailable', err)
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
    console.warn('[posts] DB unavailable', err)
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
    console.warn('[posts] DB unavailable', err)
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
    console.warn('[posts] DB unavailable', err)
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
    console.warn('[posts] DB unavailable', err)
    return null
  }
}

/**
 * Вакансии по профессии.
 *
 * Две ступени, и вторая обязательна. Payload `like` со строкой из нескольких
 * слов ищет слова ПО ОТДЕЛЬНОСТИ: запрос «дизайнер презентаций» возвращает
 * вакансии SMM-щика и маркетолога, где слово «дизайнер» стоит в одном месте,
 * а «презентаций» — в другом. Проверено на проде 25.08.2026: 36 совпадений,
 * из которых профильных почти нет.
 *
 * Поэтому база отдаёт широкую выборку по однословным маркерам, а точная
 * фраза проверяется уже в памяти. Иначе карточка профессии обещает вакансии,
 * которых на ней нет, — ровно та ошибка, из-за которой /tools/wordpress
 * показывал 19 «вакансий WordPress-разработчика» при двух настоящих.
 */
export async function getPostsByProfession(
  queries: string[],
  limit = PROFESSION_PREVIEW_LIMIT,
  phrases?: string[]
): Promise<{ posts: FeedPost[]; total: number; capped: boolean }> {
  if (queries.length === 0) return { posts: [], total: 0, capped: false }
  // Потолок выборки: берём заведомо больше, чем покажем, чтобы после отсева
  // осталось из чего выбирать. Считать надо по широкой выборке из базы, а не
  // по итогу: у видеомонтажёра подстрока находит 151 объявление, из которых
  // роль в заголовке подтверждают 55.
  const SCAN_LIMIT = 300
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'posts',
      where: {
        and: [
          { status: { equals: 'published' } },
          { type: { equals: 'vacancy' } },
          {
            or: queries.flatMap((q) => [
              { title: { like: q } } as Where,
              { description: { like: q } } as Where,
            ]),
          },
        ],
      },
      limit: SCAN_LIMIT,
      sort: '-createdAt',
    })

    const docs = result.docs as unknown as PayloadPost[]
    const needles = (phrases ?? queries).map((p) => p.toLowerCase())
    const matched = docs.filter((doc) => {
      // Ищем роль там, где она стоит, — в заголовке объявления. По всему телу
      // подстрока ловит упоминания в требованиях: «монтаж» в вакансии
      // SMM-менеджера превращал её в вакансию видеомонтажёра и завышал
      // выборку профессии в 2,7 раза.
      const haystack = `${doc.title ?? ''} ${roleHeadline(doc.description ?? '')}`.toLowerCase()
      return needles.some((n) => haystack.includes(n))
    })

    return {
      posts: matched.slice(0, limit).map(toFeedPost),
      total: matched.length,
      // Упёрлись в потолок сканирования — значит настоящее число больше.
      capped: result.totalDocs > SCAN_LIMIT,
    }
  } catch (err) {
    console.warn('[posts] DB unavailable', err)
    return { posts: [], total: 0, capped: false }
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
    console.warn('[posts] DB unavailable', err)
    return { posts: [], total: 0, totalPages: 0 }
  }
}
