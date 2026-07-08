import { MetadataRoute } from 'next'
import { getArticles } from '@/lib/articles'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAllFilterCombinations } from '@/lib/spec-filter-meta'

const BASE_URL = 'https://d-pub.ru'

export const revalidate = 3600

const KNOWN_TAG_SLUGS = [
  'smm',
  'seo',
  'dizajn',
  'marketing',
  'menedzher',
  'target',
  'razrabotka',
  'analitika',
  'finansy',
  'kreativ',
  'copywriting',
  'content',
  'udalyonka',
  'ofis',
  'gibrid',
  'junior',
  'middle',
  'senior',
]

type PayloadPost = {
  slug: string | null
  type: 'vacancy' | 'resume'
  updatedAt: string | Date
  tags: Array<{ slug: string; tagType: string } | number>
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const TOOL_SLUGS = [
    'capcut',
    'figma',
    'yandex-metrika',
    'chatgpt',
    'canva',
    'screaming-frog',
    'semrush',
    'tilda',
    'midjourney',
    'google-analytics',
    'yandex-direct',
    'photoshop',
    'tablicy',
  ]

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/vacancies`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/resumes`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/articles`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/tools`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...TOOL_SLUGS.map((slug) => ({
      url: `${BASE_URL}/tools/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // Single Payload instance shared by all DB queries below
  let payloadInstance: Awaited<ReturnType<typeof getPayload>> | null = null
  try {
    payloadInstance = await getPayload({ config })
  } catch {
    console.warn('[sitemap] DB unavailable, using static routes only')
  }

  // Individual vacancy and resume pages from DB — fetched early to compute per-tag lastModified
  let postRoutes: MetadataRoute.Sitemap = []
  const maxPostDateByTag = new Map<string, Date>()

  if (payloadInstance) {
    try {
      const postsResult = await payloadInstance.find({
        collection: 'posts',
        where: {
          status: { equals: 'published' },
          slug: { not_equals: null },
          description: { not_equals: null },
        },
        sort: '-updatedAt',
        limit: 10000,
        depth: 1,
      })

      postRoutes = (postsResult.docs as unknown as PayloadPost[])
        .filter((p) => p.slug)
        .map((p) => {
          const tags = Array.isArray(p.tags) ? p.tags : []
          const specTag = tags.find(
            (t): t is { slug: string; tagType: string } =>
              typeof t === 'object' &&
              t !== null &&
              (t as { tagType: string }).tagType === 'specialization'
          )
          const categorySlug = specTag?.slug ?? 'other'
          const updatedAt = p.updatedAt ? new Date(p.updatedAt) : now

          // Track max updatedAt per tag slug
          for (const tag of tags) {
            if (typeof tag === 'object' && tag !== null) {
              const existing = maxPostDateByTag.get((tag as { slug: string }).slug)
              if (!existing || updatedAt > existing) {
                maxPostDateByTag.set((tag as { slug: string }).slug, updatedAt)
              }
            }
          }

          const url =
            p.type === 'vacancy'
              ? `${BASE_URL}/vacancies/${categorySlug}/${p.slug}`
              : `${BASE_URL}/resumes/${categorySlug}/${p.slug}`
          return { url, lastModified: updatedAt, changeFrequency: 'weekly' as const, priority: 0.5 }
        })
    } catch {
      console.warn('[sitemap] DB error fetching posts, skipping post routes')
    }
  }

  // Category pages (vacancies + resumes) — slugs from DB with static fallback
  let tagSlugs: string[] = KNOWN_TAG_SLUGS
  if (payloadInstance) {
    try {
      const tagsResult = await payloadInstance.find({ collection: 'tags', limit: 500 })
      if (tagsResult.docs.length > 0) {
        tagSlugs = (tagsResult.docs as unknown as Array<{ slug: string }>).map((t) => t.slug)
      }
    } catch {
      console.warn('[sitemap] DB error fetching tags, using static list')
    }
  }

  const tagRoutes: MetadataRoute.Sitemap = tagSlugs.flatMap((slug) => [
    {
      url: `${BASE_URL}/vacancies/${slug}`,
      lastModified: maxPostDateByTag.get(slug) ?? now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/resumes/tag/${slug}`,
      lastModified: maxPostDateByTag.get(slug) ?? now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
  ])

  // Articles
  const articles = getArticles()
  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/articles/${article.slug}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Programmatic SEO filter pages: spec+format and spec+level combinations (72 pages)
  const filterCombos = getAllFilterCombinations()
  const filterUrls: MetadataRoute.Sitemap = filterCombos.map(({ category, slug }) => ({
    url: `${BASE_URL}/vacancies/${category}/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...tagRoutes, ...articleRoutes, ...postRoutes, ...filterUrls]
}
