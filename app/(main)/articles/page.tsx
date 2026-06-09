import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  getArticles,
  formatArticleDate,
  mergeAndSortArticles,
  type MergedArticle,
} from '@/lib/articles'
import { PageShellWrapper } from '@/components/PageShellWrapper'
import JsonLd from '@/components/JsonLd'

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
      tags: [],
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">Статьи</h1>
        <p className="text-text-muted mb-8">
          Полезные материалы для фрилансеров и digital-специалистов
        </p>

        {allArticles.length === 0 ? (
          <div className="py-9 text-center text-text-light text-sm border border-dashed border-border rounded-lg">
            Статьи скоро появятся
          </div>
        ) : (
          <div className="space-y-5">
            {allArticles.map((article) => (
              <Link
                key={`${article.source}-${article.slug}`}
                href={`/articles/${article.slug}`}
                className="block bg-bg-card border border-border rounded-xl p-6 no-underline hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="w-full md:w-48 h-32 rounded-lg flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50">
                    {article.imageUrl && (
                      <Image
                        src={article.imageUrl}
                        alt={article.title}
                        width={192}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {article.tags.length > 0 && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full whitespace-nowrap">
                          {article.tags[0]}
                        </span>
                      )}
                      <span className="text-xs text-text-light whitespace-nowrap">
                        {article.publishedAt ? formatArticleDate(article.publishedAt) : ''}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-text mb-2">{article.title}</h2>
                    <p className="text-sm text-text-muted line-clamp-2">{article.description}</p>
                    <div className="mt-3 text-sm text-amber-600 font-medium">Читать &rarr;</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShellWrapper>
  )
}
