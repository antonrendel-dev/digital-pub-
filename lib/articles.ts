import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { z } from 'zod'

const ARTICLES_DIR = path.join(process.cwd(), 'content', 'articles')

const slugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format')

const frontmatterSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: slugSchema,
  description: z.string().min(1, 'Description is required'),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  publishedAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  tags: z.array(z.string()).optional().default([]),
  imageUrl: z.string().optional(),
})

export interface Article {
  title: string
  slug: string
  description: string
  metaTitle?: string
  metaDescription?: string
  publishedAt: string
  tags: string[]
  content: string
  imageUrl?: string
}

export interface ArticleMeta {
  title: string
  slug: string
  description: string
  metaTitle?: string
  metaDescription?: string
  publishedAt: string
  tags: string[]
  imageUrl?: string
}

/** Get all articles sorted by date (newest first) */
export function getArticles(): ArticleMeta[] {
  if (!fs.existsSync(ARTICLES_DIR)) return []

  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.mdx'))

  const articles: ArticleMeta[] = []

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf-8')
      const { data } = matter(raw)
      const parsed = frontmatterSchema.safeParse(data)
      if (!parsed.success) continue
      articles.push({
        title: parsed.data.title,
        slug: parsed.data.slug,
        description: parsed.data.description,
        metaTitle: parsed.data.metaTitle,
        metaDescription: parsed.data.metaDescription,
        publishedAt: parsed.data.publishedAt,
        tags: parsed.data.tags,
        imageUrl: parsed.data.imageUrl,
      })
    } catch {
      // Skip invalid files
    }
  }

  return articles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
}

/** Get a single article by slug with path traversal prevention */
export function getArticleBySlug(slug: string): Article | null {
  // Validate slug format
  const result = slugSchema.safeParse(slug)
  if (!result.success) return null

  // Cross-check against actual files on disk (prevents path traversal)
  if (!fs.existsSync(ARTICLES_DIR)) return null
  const validFiles = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.mdx'))
  const matchingFile = validFiles.find((f) => f === `${slug}.mdx`)
  if (!matchingFile) return null

  const filePath = path.join(ARTICLES_DIR, matchingFile)
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)

  const parsed = frontmatterSchema.safeParse(data)
  if (!parsed.success) return null

  return {
    title: parsed.data.title,
    slug: parsed.data.slug,
    description: parsed.data.description,
    metaTitle: parsed.data.metaTitle,
    metaDescription: parsed.data.metaDescription,
    publishedAt: parsed.data.publishedAt,
    tags: parsed.data.tags,
    content,
    imageUrl: parsed.data.imageUrl,
  }
}

export type MergedArticle = {
  slug: string
  title: string
  description: string
  publishedAt: string | null
  tags: string[]
  source: 'mdx' | 'payload'
  imageUrl?: string
}

/** Merge MDX and Payload articles, deduplicate by slug (MDX preferred for content, Payload for image), sort by publishedAt descending. */
export function mergeAndSortArticles(
  mdxArticles: MergedArticle[],
  payloadArticles: MergedArticle[]
): MergedArticle[] {
  const payloadBySlug = new Map(payloadArticles.map((a) => [a.slug, a]))
  // MDX articles enriched with Payload image if available
  const enrichedMdx = mdxArticles.map((a) => {
    const p = payloadBySlug.get(a.slug)
    return p?.imageUrl ? { ...a, imageUrl: p.imageUrl } : a
  })
  const mdxSlugs = new Set(mdxArticles.map((a) => a.slug))
  const mdxTitles = new Set(mdxArticles.map((a) => a.title.toLowerCase().trim()))
  const uniquePayload = payloadArticles.filter(
    (a) => !mdxSlugs.has(a.slug) && !mdxTitles.has(a.title.toLowerCase().trim())
  )
  return [...enrichedMdx, ...uniquePayload].sort((a, b) => {
    if (!a.publishedAt && !b.publishedAt) return 0
    if (!a.publishedAt) return 1
    if (!b.publishedAt) return -1
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  })
}

/** Format date for article display */
export function formatArticleDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Allowlist of safe HTML element names for MDX rendering.
 * Only these elements are allowed when rendering MDX content.
 * No custom components, no script/iframe.
 */
export const MDX_ALLOWED_ELEMENTS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'code',
  'pre',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'strong',
  'em',
  'br',
  'hr',
] as const
