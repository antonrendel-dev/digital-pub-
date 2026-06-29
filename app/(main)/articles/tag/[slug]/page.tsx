import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getArticles, mergeAndSortArticles, type MergedArticle } from '@/lib/articles'
import { tagBySlug } from '@/lib/article-tags'
import { PageShellWrapper } from '@/components/PageShellWrapper'
import JsonLd from '@/components/JsonLd'
import ArticlesGrid from '@/components/ArticlesGrid'
import Link from 'next/link'

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tag = tagBySlug(slug)
  if (!tag) return {}
  return {
    title: tag.pageTitle,
    description: tag.pageDescription,
    alternates: { canonical: `https://d-pub.ru/articles/tag/${slug}` },
  }
}

export default async function ArticleTagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tag = tagBySlug(slug)
  if (!tag) notFound()

  // MDX articles
  const mdxRaw = getArticles()
  const mdxArticles: MergedArticle[] = mdxRaw.map((a) => ({
    slug: a.slug,
    title: a.title,
    description: a.description ?? '',
    publishedAt: a.publishedAt ?? null,
    tags: a.tags ?? [],
    source: 'mdx' as const,
    imageUrl: a.imageUrl,
  }))

  // Payload articles
  let payloadArticles: MergedArticle[] = []
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'articles',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { status: { equals: 'published' } } as any,
      sort: '-publishedAt',
      limit: 100,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payloadArticles = (result.docs as any[]).map((a) => ({
      slug: a.slug,
      title: a.title,
      description: a.description ?? '',
      publishedAt: a.publishedAt ?? null,
      tags: Array.isArray(a.tags) ? (a.tags as string[]) : [],
      source: 'payload' as const,
      imageUrl: typeof a.image === 'object' && a.image?.url ? a.image.url : undefined,
    }))
  } catch {
    // Payload unavailable
  }

  const allArticles = mergeAndSortArticles(mdxArticles, payloadArticles)

  const RELATED_TAGS: Record<string, { slug: string; label: string }> = {
    'analitika-dannykh': { slug: 'veb-analitika', label: 'Веб-аналитика' },
    'veb-analitika': { slug: 'analitika-dannykh', label: 'Аналитика данных' },
  }

  const relatedTag = RELATED_TAGS[slug] ?? null

  function renderSeoText(text: string): string {
    const withLinks = text.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-accent underline">$1</a>'
    )
    return withLinks
      .split('\n\n')
      .map((p) => `<p>${p}</p>`)
      .join('')
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://d-pub.ru' },
      { '@type': 'ListItem', position: 2, name: 'Статьи', item: 'https://d-pub.ru/articles' },
      {
        '@type': 'ListItem',
        position: 3,
        name: tag.name,
        item: `https://d-pub.ru/articles/tag/${slug}`,
      },
    ],
  }

  return (
    <PageShellWrapper>
      <JsonLd data={breadcrumbLd} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-text-muted mb-5">
          <Link
            href="/"
            className="hover:text-accent transition-colors no-underline text-text-muted"
          >
            Главная
          </Link>
          <span className="text-text-light">&rsaquo;</span>
          <Link
            href="/articles"
            className="hover:text-accent transition-colors no-underline text-text-muted"
          >
            Статьи
          </Link>
          <span className="text-text-light">&rsaquo;</span>
          <span className="text-text-light">{tag.name}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">{tag.pageTitle}</h1>
        <p className="text-text-muted mb-8">{tag.pageDescription}</p>

        <ArticlesGrid articles={allArticles} activeTag={tag.name} />

        {tag.seoText && (
          <div
            className="prose prose-sm max-w-none text-text-muted mt-10 pt-6 border-t border-border"
            dangerouslySetInnerHTML={{ __html: renderSeoText(tag.seoText) }}
          />
        )}

        {relatedTag && (
          <div className="mt-6">
            <span className="text-sm text-text-muted">Смотри также: </span>
            <Link
              href={`/articles/tag/${relatedTag.slug}`}
              className="text-sm text-accent underline"
            >
              {relatedTag.label}
            </Link>
          </div>
        )}
      </div>
    </PageShellWrapper>
  )
}
