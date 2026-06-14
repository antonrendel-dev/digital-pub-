import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getArticles, mergeAndSortArticles, type MergedArticle } from '@/lib/articles'
import { PageShellWrapper } from '@/components/PageShellWrapper'
import JsonLd from '@/components/JsonLd'
import ArticlesGrid from '@/components/ArticlesGrid'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Карьера в digital: статьи для маркетологов и дизайнеров',
  description:
    'Как составить резюме, пройти собеседование и вырасти в digital. Полезные материалы для SMM, маркетологов, дизайнеров и аналитиков.',
  alternates: { canonical: 'https://d-pub.ru/articles' },
  openGraph: {
    title: 'Карьера в digital: статьи для маркетологов и дизайнеров',
    description:
      'Как составить резюме, пройти собеседование и вырасти в digital. Полезные материалы для специалистов.',
    url: 'https://d-pub.ru/articles',
    type: 'website',
  },
}

export default async function ArticlesPage() {
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
    // Payload unavailable — show MDX only
  }

  const allArticles = mergeAndSortArticles(mdxArticles, payloadArticles)

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://d-pub.ru' },
      { '@type': 'ListItem', position: 2, name: 'Статьи', item: 'https://d-pub.ru/articles' },
    ],
  }

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Статьи о карьере в digital',
    numberOfItems: allArticles.length,
    itemListElement: allArticles.map((article, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://d-pub.ru/articles/${article.slug}`,
      name: article.title,
    })),
  }

  return (
    <PageShellWrapper>
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={itemListLd} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">Статьи</h1>
        <p className="text-text-muted mb-6">
          Полезные материалы для фрилансеров и digital-специалистов
        </p>

        {allArticles.length === 0 ? (
          <div className="py-9 text-center text-text-light text-sm border border-dashed border-border rounded-lg">
            Статьи скоро появятся
          </div>
        ) : (
          <Suspense fallback={<div className="h-10 animate-pulse bg-bg-card rounded-full w-64" />}>
            <ArticlesGrid articles={allArticles} />
          </Suspense>
        )}
      </div>
    </PageShellWrapper>
  )
}
