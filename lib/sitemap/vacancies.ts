import { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'

const BASE_URL = 'https://d-pub.ru'

// Tool slugs that redirect to /tools/* — must NOT appear in sitemap as /vacancies/* URLs
const TOOL_REDIRECT_SLUGS = new Set([
  'figma',
  'canva',
  'tilda',
  'yandex-direct',
  'tablicy',
  'capcut',
  'chatgpt',
  'yandex-metrika',
  'screaming-frog',
  'semrush',
  'midjourney',
  'google-analytics',
  'photoshop',
  'wordpress',
])

// Пустой ответ при недоступной базе кэшируется и уезжает в поисковик как
// «этих адресов больше нет». 23.08.2026 Яндекс прочитал шарды 1 и 2 ровно в
// такой момент и записал у обоих 0 URL, хотя вживую там 1333 и 347. Поэтому
// сбой базы пробрасывается наверх: Next оставит в кэше прошлую удачную версию
// вместо того, чтобы сохранить пустоту на десять минут.
export class SitemapUnavailableError extends Error {
  constructor(cause: unknown) {
    super('Сайтмап не собран: база недоступна')
    this.name = 'SitemapUnavailableError'
    this.cause = cause
  }
}

type PayloadPost = {
  slug: string | null
  type: 'vacancy' | 'resume'
  updatedAt: string | Date
  tags: Array<{ slug: string; tagType: string } | number>
}

export async function getVacancySitemapEntries(
  payloadInstance: Awaited<ReturnType<typeof getPayload>>,
  now: Date
): Promise<MetadataRoute.Sitemap> {
  try {
    const postsResult = await payloadInstance.find({
      collection: 'posts',
      where: {
        status: { equals: 'published' },
        type: { equals: 'vacancy' },
        slug: { not_equals: null },
        description: { not_equals: null },
      },
      sort: '-updatedAt',
      limit: 10000,
      depth: 1,
    })

    return (postsResult.docs as unknown as PayloadPost[])
      .filter((p) => p.slug && p.type === 'vacancy')
      .flatMap((p) => {
        const tags = Array.isArray(p.tags) ? p.tags : []
        const specTag = tags.find(
          (t): t is { slug: string; tagType: string } =>
            typeof t === 'object' &&
            t !== null &&
            (t as { tagType: string }).tagType === 'specialization'
        )
        const categorySlug = specTag?.slug ?? 'other'
        if (categorySlug === 'other' || TOOL_REDIRECT_SLUGS.has(categorySlug)) return []

        const updatedAt = p.updatedAt ? new Date(p.updatedAt) : now
        return [
          {
            url: `${BASE_URL}/vacancies/${categorySlug}/${p.slug}`,
            lastModified: updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.5,
          },
        ]
      })
  } catch (e) {
    console.warn('[sitemap] DB error fetching vacancy posts')
    throw new SitemapUnavailableError(e)
  }
}

export async function getResumeSitemapEntries(
  payloadInstance: Awaited<ReturnType<typeof getPayload>>,
  now: Date
): Promise<MetadataRoute.Sitemap> {
  try {
    const postsResult = await payloadInstance.find({
      collection: 'posts',
      where: {
        status: { equals: 'published' },
        type: { equals: 'resume' },
        slug: { not_equals: null },
        description: { not_equals: null },
      },
      sort: '-updatedAt',
      limit: 10000,
      depth: 1,
    })

    return (postsResult.docs as unknown as PayloadPost[])
      .filter((p) => p.slug && p.type === 'resume')
      .flatMap((p) => {
        const tags = Array.isArray(p.tags) ? p.tags : []
        const specTag = tags.find(
          (t): t is { slug: string; tagType: string } =>
            typeof t === 'object' &&
            t !== null &&
            (t as { tagType: string }).tagType === 'specialization'
        )
        const categorySlug = specTag?.slug ?? 'other'
        if (categorySlug === 'other') return []

        const updatedAt = p.updatedAt ? new Date(p.updatedAt) : now
        return [
          {
            url: `${BASE_URL}/resumes/${categorySlug}/${p.slug}`,
            lastModified: updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.5,
          },
        ]
      })
  } catch (e) {
    console.warn('[sitemap] DB error fetching resume posts')
    throw new SitemapUnavailableError(e)
  }
}
