import { MetadataRoute } from 'next'
import { getArticles } from '@/lib/articles'
import { ARTICLE_TAGS } from '@/lib/article-tags'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAllFilterCombinations } from '@/lib/spec-filter-meta'
import {
  getVacancySitemapEntries,
  getResumeSitemapEntries,
  SitemapUnavailableError,
} from '@/lib/sitemap/vacancies'
import { SITEMAP_BASE_URL, SITEMAP_SHARDS, isKnownShard } from '@/lib/sitemap/shards'
import { cachedShard } from '@/lib/sitemap/cache'

const BASE_URL = SITEMAP_BASE_URL

// Не ISR, а рендер на запрос. При статической пререндеринге шарды вакансий и
// резюме уезжали на прод пустыми: база недоступна из раннера GitHub Actions
// (`ENOTFOUND postgres.***.h2` в логе сборки 23.08.2026), а пустой результат
// становился готовым артефактом и раздавался роботам до первой ревалидации.
// Повторные обращения гасит cachedShard, TTL те же десять минут.
export const dynamic = 'force-dynamic'

/**
 * Sitemap split strategy — состав шардов описан в lib/sitemap/shards.ts,
 * оттуда же его берут robots.txt и индексный файл.
 */
export function generateSitemaps() {
  return SITEMAP_SHARDS.map((s) => ({ id: s.id }))
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
  'head-of-seo',
  'videomontazher',
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

export default async function sitemap({
  id,
}: {
  id: number | string
}): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  // Next отдаёт id из URL строкой, хотя типизирует его как number. Строгое
  // сравнение с числом всегда ложно — шарды 1 и 2 отдавали содержимое шарда 0.
  const shard = Number(id)

  // Незаявленный шард отдаёт пустой набор, а не содержимое нулевого. Раньше
  // «остальное» проваливалось в ветку id=0, и /sitemap/3.xml, которого нет ни
  // в generateSitemaps, ни в robots, отдавал 226 адресов — полную копию
  // нулевого шарда, то есть дубль всей статики для поисковика.
  if (!isKnownShard(shard)) {
    console.warn(`[sitemap] Запрошен незаявленный шард ${id}, отдаю пустой`)
    return []
  }

  // Single Payload instance shared by all DB queries
  let payloadInstance: Awaited<ReturnType<typeof getPayload>> | null = null
  try {
    payloadInstance = await getPayload({ config })
  } catch {
    console.warn(`[sitemap:${id}] DB unavailable`)
  }

  // Шарды вакансий и резюме держатся только на базе — статического запасного
  // списка у них нет. Отдать пустой набор значит закэшировать его на десять
  // минут и показать поисковику, что 1680 карточек исчезли. Лучше упасть:
  // Next продолжит отдавать прошлую удачную сборку.
  if (shard === 1) {
    return cachedShard('vacancies', async () => {
      if (!payloadInstance) throw new SitemapUnavailableError('getPayload failed')
      return getVacancySitemapEntries(payloadInstance, now)
    })
  }

  if (shard === 2) {
    return cachedShard('resumes', async () => {
      if (!payloadInstance) throw new SitemapUnavailableError('getPayload failed')
      return getResumeSitemapEntries(payloadInstance, now)
    })
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
    'vk-ads',
    'photoshop',
    'tablicy',
    'bitrix24',
    'excel',
    'wordpress',
    'notion',
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
    lastModified: article.dateModified
      ? new Date(article.dateModified)
      : new Date(article.publishedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
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
          priority: 0.75,
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
