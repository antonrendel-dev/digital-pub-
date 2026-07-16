import { MetadataRoute } from 'next'
import { getArticles } from '@/lib/articles'
import { ARTICLE_TAGS } from '@/lib/article-tags'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAllFilterCombinations } from '@/lib/spec-filter-meta'
import { getVacancySitemapEntries, getResumeSitemapEntries } from '@/lib/sitemap/vacancies'

const BASE_URL = 'https://d-pub.ru'

export const revalidate = 600

/**
 * Sitemap split strategy:
 *   id=0 → static pages + articles + category tag pages
 *   id=1 → individual vacancy pages (with real lastModified from updatedAt)
 *   id=2 → individual resume pages (with real lastModified from updatedAt)
 */
export function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }, { id: 2 }]
}

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
  'hr',
  'udalyonka',
  'ofis',
  'gibrid',
  'junior',
  'middle',
  'senior',
]

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
])

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Single Payload instance shared by all DB queries
  let payloadInstance: Awaited<ReturnType<typeof getPayload>> | null = null
  try {
    payloadInstance = await getPayload({ config })
  } catch {
    console.warn(`[sitemap:${id}] DB unavailable`)
  }

  // id=1 → individual vacancy pages
  if (id === 1) {
    if (!payloadInstance) return []
    return getVacancySitemapEntries(payloadInstance, now)
  }

  // id=2 → individual resume pages
  if (id === 2) {
    if (!payloadInstance) return []
    return getResumeSitemapEntries(payloadInstance, now)
  }

  // id=0 → static pages + articles + category tag pages + filter combos

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
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    {
      url: `${BASE_URL}/from-telegram`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...TOOL_SLUGS.map((slug) => ({
      url: `${BASE_URL}/tools/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // Category pages (vacancies + resumes) — slugs from DB with static fallback
  let tagSlugs: string[] = KNOWN_TAG_SLUGS
  if (payloadInstance) {
    try {
      const tagsResult = await payloadInstance.find({ collection: 'tags', limit: 500 })
      if (tagsResult.docs.length > 0) {
        tagSlugs = (tagsResult.docs as unknown as Array<{ slug: string }>)
          .map((t) => t.slug)
          .filter((s) => !TOOL_REDIRECT_SLUGS.has(s))
      }
    } catch {
      console.warn('[sitemap:0] DB error fetching tags, using static list')
    }
  }

  const tagRoutes: MetadataRoute.Sitemap = tagSlugs.flatMap((slug) => [
    {
      url: `${BASE_URL}/vacancies/${slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/resumes/tag/${slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
  ])

  // Articles from MDX files
  const mdxArticles = getArticles()
  const mdxSlugs = new Set(mdxArticles.map((a) => a.slug))
  const articleRoutes: MetadataRoute.Sitemap = mdxArticles.map((article) => ({
    url: `${BASE_URL}/articles/${article.slug}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Articles from Payload DB (published, not already covered by MDX)
  let payloadArticleRoutes: MetadataRoute.Sitemap = []
  if (payloadInstance) {
    try {
      const payloadArticlesResult = await payloadInstance.find({
        collection: 'articles',
        where: { status: { equals: 'published' }, slug: { not_equals: null } },
        sort: '-publishedAt',
        limit: 1000,
        depth: 0,
      })
      payloadArticleRoutes = (
        payloadArticlesResult.docs as unknown as Array<{ slug: string; updatedAt?: string | Date }>
      )
        .filter((a) => a.slug && !mdxSlugs.has(a.slug))
        .map((a) => ({
          url: `${BASE_URL}/articles/${a.slug}`,
          lastModified: a.updatedAt ? new Date(a.updatedAt) : now,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        }))
    } catch {
      console.warn('[sitemap:0] DB error fetching payload articles, skipping')
    }
  }

  // Programmatic SEO filter pages: spec+format and spec+level combinations (72 pages)
  const filterCombos = getAllFilterCombinations()
  const filterUrls: MetadataRoute.Sitemap = filterCombos.map(({ category, slug }) => ({
    url: `${BASE_URL}/vacancies/${category}/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  const articleTagRoutes: MetadataRoute.Sitemap = ARTICLE_TAGS.map((tag) => ({
    url: `${BASE_URL}/articles/tag/${tag.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  return [
    ...staticRoutes,
    ...tagRoutes,
    ...articleRoutes,
    ...payloadArticleRoutes,
    ...filterUrls,
    ...articleTagRoutes,
  ]
}
