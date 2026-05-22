import { MetadataRoute } from 'next'
import { getArticles } from '@/lib/articles'
import { prisma } from '@/lib/prisma'

const BASE_URL = 'https://d-pub.ru'

export const revalidate = 3600 // rebuild sitemap every hour

// Static fallback so tag pages are always in sitemap even if DB is unreachable at build time
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/vacancies`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/resumes`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/articles`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // Category pages (vacancies + resumes) — slugs from DB with static fallback
  let tagSlugs: string[] = KNOWN_TAG_SLUGS
  try {
    const tags = await prisma.tag.findMany({ select: { slug: true } })
    if (tags.length > 0) tagSlugs = tags.map((t) => t.slug)
  } catch {
    console.warn('[sitemap] DB unavailable, using static tag list')
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

  // Articles
  const articles = getArticles()
  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/articles/${article.slug}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Individual vacancy and resume pages from DB
  let postRoutes: MetadataRoute.Sitemap = []
  try {
    const posts = await prisma.post.findMany({
      where: {
        status: 'published',
        slug: { not: null },
        description: { not: null },
      },
      select: {
        slug: true,
        type: true,
        updatedAt: true,
        tags: {
          select: { tag: { select: { slug: true, tagType: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    postRoutes = posts
      .filter((p) => p.slug)
      .map((p) => {
        const specTag = p.tags.find((pt) => pt.tag?.tagType === 'specialization')
        const categorySlug = specTag?.tag?.slug || p.tags[0]?.tag?.slug || 'other'
        const url =
          p.type === 'vacancy'
            ? `${BASE_URL}/vacancies/${categorySlug}/${p.slug}`
            : `${BASE_URL}/post/${p.slug}`
        return {
          url,
          lastModified: p.updatedAt,
          changeFrequency: 'weekly' as const,
          priority: 0.5,
        }
      })
  } catch {
    console.warn('[sitemap] DB unavailable, skipping post routes')
  }

  return [...staticRoutes, ...tagRoutes, ...articleRoutes, ...postRoutes]
}
