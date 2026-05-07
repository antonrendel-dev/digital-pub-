import { MetadataRoute } from 'next'
import { getArticles } from '@/lib/articles'

const BASE_URL = 'https://d-pub.ru'

const TAG_SLUGS = [
  'udalyonka', 'ofis', 'gibrid',
  'smm', 'seo', 'dizajn', 'marketing', 'menedzher', 'target',
  'razrabotka', 'analitika', 'finansy', 'hr', 'wordpress',
  'junior', 'middle', 'senior',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/vacancies`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/resumes`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/articles`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // Tag pages
  const tagRoutes: MetadataRoute.Sitemap = TAG_SLUGS.flatMap((slug) => [
    { url: `${BASE_URL}/vacancies/tag/${slug}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${BASE_URL}/resumes/tag/${slug}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.7 },
  ])

  // Articles
  const articles = getArticles()
  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/articles/${article.slug}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...tagRoutes, ...articleRoutes]
}
