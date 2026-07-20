import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getArticleBySlug, getArticles, formatArticleDate } from '@/lib/articles'
import { PageShellWrapper } from '@/components/PageShellWrapper'
import JsonLd from '@/components/JsonLd'
import {
  getRelatedCategoriesForTitleAndTags,
  getRelatedToolsForArticle,
  RelatedCategoriesBlock,
  RelatedArticlesBlock,
  RelatedToolsBlock,
} from '@/components/RelatedArticles'
import RelatedVacanciesBlock from '@/components/RelatedVacanciesBlock'

// Elements NOT in MDX_ALLOWED_ELEMENTS — blocked as defense-in-depth
const mdxComponents = {
  script: () => null,
  iframe: () => null,
  style: () => null,
  object: () => null,
  embed: () => null,
  form: () => null,
} as Record<string, () => null>

export const revalidate = 300

export async function generateStaticParams() {
  const articles = getArticles()
  return articles.map((article) => ({ slug: article.slug }))
}

interface Props {
  params: Promise<{ slug: string }>
}

async function findPayloadArticle(slug: string) {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'articles',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { slug: { equals: slug }, status: { equals: 'published' } } as any,
      limit: 1,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (result.docs.length > 0) return result.docs[0] as any
  } catch {
    // Payload unavailable — fallback to MDX
  }
  return null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  const payloadArticle = await findPayloadArticle(slug)
  if (payloadArticle) {
    const title = payloadArticle.metaTitle ?? payloadArticle.title
    const description = payloadArticle.metaDescription ?? payloadArticle.description ?? ''
    const url = `https://d-pub.ru/articles/${slug}`
    // MDX imageUrl takes priority over Payload media (MDX covers are topic-specific pixel art)
    const mdxArticle = getArticleBySlug(slug)
    const ogImage = mdxArticle?.imageUrl ?? payloadArticle.image?.url ?? null
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        type: 'article',
        publishedTime: payloadArticle.publishedAt,
        modifiedTime: payloadArticle.updatedAt ?? payloadArticle.publishedAt,
        authors: ['Диджитал Паб'],
        images: ogImage
          ? [
              {
                url: ogImage.startsWith('/') ? `https://d-pub.ru${ogImage}` : ogImage,
                width: 1200,
                height: 630,
                alt: title,
              },
            ]
          : [
              {
                url: 'https://d-pub.ru/og-image.png',
                width: 1200,
                height: 630,
                alt: 'Диджитал Паб',
              },
            ],
      },
      twitter: { card: 'summary_large_image', title, description },
    }
  }

  const article = getArticleBySlug(slug)
  if (!article) return { title: 'Статья не найдена' }

  const title = article.metaTitle ?? article.title
  const description = article.metaDescription ?? article.description
  const url = `https://d-pub.ru/articles/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      publishedTime: article.publishedAt,
      authors: ['Диджитал Паб'],
      tags: article.tags,
      images: article.imageUrl
        ? [
            {
              url: article.imageUrl.startsWith('/')
                ? `https://d-pub.ru${article.imageUrl}`
                : article.imageUrl,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : [{ url: 'https://d-pub.ru/og-image.png', width: 1200, height: 630, alt: 'Диджитал Паб' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params

  const payloadArticle = await findPayloadArticle(slug)

  // Extract Payload image regardless of whether Payload has content
  const payloadImageUrl: string | null = payloadArticle?.image?.url ?? null

  // MDX article may have imageUrl in frontmatter — use as primary cover image
  // (Payload media images are often generic; MDX covers are always topic-specific)
  const mdxArticleForImage = getArticleBySlug(slug)
  const coverImageUrl: string | null = mdxArticleForImage?.imageUrl ?? payloadImageUrl ?? null

  if (payloadArticle && payloadArticle.content) {
    const allArticles = getArticles()
    const related = allArticles.slice(0, 3)
    const relatedCategories = getRelatedCategoriesForTitleAndTags(payloadArticle.title)
    const relatedTools = getRelatedToolsForArticle(payloadArticle.title)

    const articleLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: payloadArticle.title,
      description: payloadArticle.description ?? '',
      datePublished: payloadArticle.publishedAt,
      dateModified: payloadArticle.updatedAt ?? payloadArticle.publishedAt,
      author: { '@type': 'Organization', name: 'Диджитал Паб', url: 'https://d-pub.ru' },
      publisher: {
        '@type': 'Organization',
        name: 'Диджитал Паб',
        logo: { '@type': 'ImageObject', url: 'https://d-pub.ru/logo.png' },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `https://d-pub.ru/articles/${slug}` },
      ...(payloadArticle.image?.url && {
        image: {
          '@type': 'ImageObject',
          url: payloadArticle.image.url,
          width: payloadArticle.image.width ?? 1200,
          height: payloadArticle.image.height ?? 630,
        },
      }),
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
          name: payloadArticle.title,
          item: `https://d-pub.ru/articles/${slug}`,
        },
      ],
    }

    return (
      <PageShellWrapper>
        <JsonLd data={articleLd} />
        <JsonLd data={breadcrumbLd} />
        <div className="max-w-wrap mx-auto px-4 pt-6 pb-12">
          <div className="flex items-center gap-1.5 text-sm text-text-muted mb-5">
            <Link
              href="/"
              className="text-text-muted no-underline hover:text-accent transition-colors"
            >
              Главная
            </Link>
            <span className="text-text-light">&rsaquo;</span>
            <Link
              href="/articles"
              className="text-text-muted no-underline hover:text-accent transition-colors"
            >
              Статьи
            </Link>
            <span className="text-text-light">&rsaquo;</span>
            <span className="text-text-light truncate">{payloadArticle.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
            <article className="bg-bg-card border border-border rounded-xl p-7 transition-colors duration-200">
              {coverImageUrl && (
                <Image
                  src={coverImageUrl}
                  alt={payloadArticle.title}
                  width={1200}
                  height={630}
                  className="w-full h-auto rounded-lg mb-5"
                />
              )}
              <h1 className="text-2xl font-bold text-text tracking-tight leading-snug mb-3">
                {payloadArticle.title}
              </h1>
              <div className="flex items-center gap-3 mb-6">
                {payloadArticle.publishedAt && (
                  <span className="text-sm text-text-light">
                    {formatArticleDate(payloadArticle.publishedAt)}
                  </span>
                )}
              </div>
              <div
                className="prose prose-sm max-w-none text-text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-text [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_li]:text-sm [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text-muted [&_blockquote]:my-4 [&_strong]:font-semibold [&_strong]:text-text [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-sm [&_table]:my-4 [&_th]:bg-border-light [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-text [&_th]:border [&_th]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-border [&_td]:text-text-muted"
                dangerouslySetInnerHTML={{ __html: payloadArticle.content }}
              />
              <RelatedVacanciesBlock categories={relatedCategories} />
            </article>

            <aside className="hidden lg:block">
              <div className="sticky top-[68px] flex flex-col gap-4">
                <RelatedCategoriesBlock categories={relatedCategories} />
                <RelatedToolsBlock tools={relatedTools} />
                {related.length > 0 && (
                  <div className="bg-bg-card border border-border rounded-xl p-4">
                    <div className="s-lbl mb-3">Другие статьи</div>
                    {related.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/articles/${r.slug}`}
                        className="block py-2.5 border-b border-border-light last:border-none last:pb-0 no-underline group"
                      >
                        <div className="text-[12.5px] text-text font-medium leading-snug mb-0.5 group-hover:text-accent transition-colors">
                          {r.title}
                        </div>
                        <div className="text-[11px] text-text-light">
                          {formatArticleDate(r.publishedAt)}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </PageShellWrapper>
    )
  }

  // Fallback: MDX article
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  const allArticles = getArticles()
  const related = allArticles.filter((a) => a.slug !== article.slug).slice(0, 3)
  const relatedCategories = getRelatedCategoriesForTitleAndTags(article.title, article.tags)
  const relatedTools = getRelatedToolsForArticle(article.title, article.tags)

  // Schema.org Article — prefer schemaJsonLd from MDX frontmatter (has Wordstat keywords)
  const articleImageUrl = payloadImageUrl ?? article.imageUrl ?? null
  const articleLd: Record<string, unknown> = article.schemaJsonLd
    ? ((() => {
        try {
          const parsed = JSON.parse(article.schemaJsonLd) as Record<string, unknown>
          // Enrich with image if available and not already set
          if (articleImageUrl && !parsed.image) {
            parsed.image = { '@type': 'ImageObject', url: articleImageUrl }
          }
          return parsed
        } catch {
          return null
        }
      })() ?? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: article.publishedAt,
        author: { '@type': 'Organization', name: 'Диджитал Паб', url: 'https://d-pub.ru' },
        publisher: {
          '@type': 'Organization',
          name: 'Диджитал Паб',
          logo: { '@type': 'ImageObject', url: 'https://d-pub.ru/logo.png' },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `https://d-pub.ru/articles/${slug}` },
        keywords: article.tags.join(', '),
        ...(articleImageUrl && { image: { '@type': 'ImageObject', url: articleImageUrl } }),
      })
    : {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: article.publishedAt,
        author: { '@type': 'Organization', name: 'Диджитал Паб', url: 'https://d-pub.ru' },
        publisher: {
          '@type': 'Organization',
          name: 'Диджитал Паб',
          logo: { '@type': 'ImageObject', url: 'https://d-pub.ru/logo.png' },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `https://d-pub.ru/articles/${slug}` },
        keywords: article.tags.join(', '),
        ...(articleImageUrl && { image: { '@type': 'ImageObject', url: articleImageUrl } }),
      }

  // BreadcrumbList
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://d-pub.ru' },
      { '@type': 'ListItem', position: 2, name: 'Статьи', item: 'https://d-pub.ru/articles' },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: `https://d-pub.ru/articles/${slug}`,
      },
    ],
  }

  return (
    <PageShellWrapper>
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <div className="max-w-wrap mx-auto px-4 pt-6 pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-text-muted mb-5">
          <Link
            href="/"
            className="text-text-muted no-underline hover:text-accent transition-colors"
          >
            Главная
          </Link>
          <span className="text-text-light">&rsaquo;</span>
          <Link
            href="/articles"
            className="text-text-muted no-underline hover:text-accent transition-colors"
          >
            Статьи
          </Link>
          <span className="text-text-light">&rsaquo;</span>
          <span className="text-text-light truncate">{article.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
          {/* Main */}
          <article className="bg-bg-card border border-border rounded-xl p-7 transition-colors duration-200">
            {(payloadImageUrl ?? article.imageUrl) && (
              <Image
                src={(payloadImageUrl ?? article.imageUrl)!}
                alt={article.title}
                width={1200}
                height={1200}
                className="w-full h-auto rounded-lg mb-5"
              />
            )}
            <h1 className="text-2xl font-bold text-text tracking-tight leading-snug mb-3">
              {article.title}
            </h1>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm text-text-light">
                {formatArticleDate(article.publishedAt)}
              </span>
            </div>

            {/* MDX content with safe component allowlist */}
            <div className="prose prose-sm max-w-none text-text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-text [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_li]:text-sm [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text-muted [&_blockquote]:my-4 [&_strong]:font-semibold [&_strong]:text-text [&_code]:bg-border-light [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-sm [&_table]:my-4 [&_th]:bg-border-light [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-text [&_th]:border [&_th]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-border [&_td]:text-text-muted">
              <MDXRemote
                source={article.content}
                options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
                components={mdxComponents}
              />
            </div>
            <RelatedVacanciesBlock categories={relatedCategories} />
          </article>

          {/* Sidebar — desktop only */}
          <aside className="hidden lg:block">
            <div className="sticky top-[68px] flex flex-col gap-4">
              <RelatedCategoriesBlock categories={relatedCategories} />
              <RelatedToolsBlock tools={relatedTools} />
              {related.length > 0 && (
                <div className="bg-bg-card border border-border rounded-xl p-4">
                  <div className="s-lbl mb-3">Другие статьи</div>
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/articles/${r.slug}`}
                      className="block py-2.5 border-b border-border-light last:border-none last:pb-0 no-underline group"
                    >
                      <div className="text-[12.5px] text-text font-medium leading-snug mb-0.5 group-hover:text-accent transition-colors">
                        {r.title}
                      </div>
                      <div className="text-[11px] text-text-light">
                        {formatArticleDate(r.publishedAt)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Mobile: internal links below article (hidden on desktop where sidebar is shown) */}
        <div className="lg:hidden mt-6 space-y-4">
          <RelatedCategoriesBlock categories={relatedCategories} />
          <RelatedToolsBlock tools={relatedTools} />
          <RelatedArticlesBlock articles={related} />
        </div>
      </div>
    </PageShellWrapper>
  )
}
