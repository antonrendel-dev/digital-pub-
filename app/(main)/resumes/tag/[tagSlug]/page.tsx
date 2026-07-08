import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { getTagBySlug, getPostsByTag, getTagsWithCountsByType } from '@/lib/tags'
import TagsSidebar from '@/components/TagsSidebar'
import { RESUME_TAG_TITLE, RESUME_TAG_H1, RESUME_TAG_DESCRIPTION } from '@/lib/tagH1'
import { sanitizeSeoHtml } from '@/lib/sanitize'
import { getResumeTagFaq } from '@/lib/resume-tag-faq'
import PageShell from '@/components/PageShell'
import JobCard from '@/components/feed/JobCard'
import JsonLd from '@/components/JsonLd'

interface Props {
  params: Promise<{ tagSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tagSlug } = await params
  const tag = await getTagBySlug(tagSlug)
  if (!tag) return { title: 'Тег не найден' }

  const title = RESUME_TAG_TITLE[tagSlug] ?? `Резюме специалистов: ${tag.name}`
  const description =
    RESUME_TAG_DESCRIPTION[tagSlug] ??
    `Резюме ${tag.name}-специалистов из Telegram-сообщества. База кандидатов в digital-сфере на Диджитал Паб.`
  const url = `https://d-pub.ru/resumes/tag/${tagSlug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [
        { url: 'https://d-pub.ru/og-image.png', width: 1200, height: 630, alt: 'Диджитал Паб' },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function TagPage({ params }: Props) {
  const { tagSlug } = await params
  const tag = await getTagBySlug(tagSlug)
  if (!tag) notFound()

  const posts = (await getPostsByTag(tagSlug)).filter((p) => p.type === 'resume')
  const resumeTags = await getTagsWithCountsByType('resume')
  const faqItems = getResumeTagFaq(tagSlug)

  // BreadcrumbList Schema.org
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://d-pub.ru' },
      { '@type': 'ListItem', position: 2, name: 'Резюме', item: 'https://d-pub.ru/resumes' },
      {
        '@type': 'ListItem',
        position: 3,
        name: tag.name,
        item: `https://d-pub.ru/resumes/tag/${tagSlug}`,
      },
    ],
  }

  // FAQPage Schema
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  // ItemList of resumes in this tag
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Резюме: ${tag.name}`,
    numberOfItems: posts.length,
    itemListElement: posts.slice(0, 20).map((post, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://d-pub.ru/post/${post.id}`,
      name: post.title,
    })),
  }

  return (
    <PageShell>
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={itemListLd} />
      <JsonLd data={faqLd} />
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
            href="/resumes"
            className="text-text-muted no-underline hover:text-accent transition-colors"
          >
            Резюме
          </Link>
          <span className="text-text-light">&rsaquo;</span>
          <span className="text-text-light">{tag.name}</span>
        </div>

        <h1 className="text-2xl font-bold text-text tracking-tight mb-2">
          {RESUME_TAG_H1[tagSlug] ?? `Резюме: ${tag.name}`}
        </h1>
        <p className="text-sm text-text-muted mb-6">
          {posts.length} резюме по тегу {tag.name}
        </p>

        {/* Resume tags — mobile/tablet only */}
        <div className="lg:hidden mb-6">
          <TagsSidebar
            tags={resumeTags}
            activeSlug={tagSlug}
            heading="Резюме по категориям"
            hrefFn={(s) => `/resumes/tag/${s}`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <div>
            {posts.length === 0 ? (
              <div className="py-9 text-center text-text-light text-sm border border-dashed border-border rounded-lg">
                Пока нет резюме с тегом {tag.name}
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <JobCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>

          <aside className="hidden lg:flex flex-col gap-4">
            <TagsSidebar
              tags={resumeTags}
              activeSlug={tagSlug}
              heading="Резюме по категориям"
              hrefFn={(s) => `/resumes/tag/${s}`}
            />
          </aside>
        </div>

        {tag.seoText && (
          <div className="mt-8 pt-6 border-t border-border-light">
            <div
              className="prose prose-sm max-w-none text-text-muted [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-text [&_h1]:mb-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1 [&_li]:text-sm [&_strong]:font-semibold [&_strong]:text-text"
              dangerouslySetInnerHTML={{ __html: sanitizeSeoHtml(tag.seoText) }}
            />
          </div>
        )}

        {/* FAQ block */}
        <section className="mt-12 pt-8 border-t border-border">
          <h2 className="text-xl font-bold text-text mb-6">
            Часто задаваемые вопросы о резюме {tag.name}
          </h2>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <details key={i} className="group border border-border rounded-lg overflow-hidden">
                <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer text-sm font-medium text-text hover:bg-bg-card transition-colors list-none">
                  <span>{item.question}</span>
                  <span className="text-text-muted shrink-0 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <div className="px-4 pb-4 pt-2 text-sm text-text-muted leading-relaxed border-t border-border">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  )
}
