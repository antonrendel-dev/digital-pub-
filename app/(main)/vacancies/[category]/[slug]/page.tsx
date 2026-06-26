import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { getPostBySlug, getPostsByType } from '@/lib/posts'
import { getTagBySlug, getTagsWithCounts, getCategoryStats, getPostsByTwoTags } from '@/lib/tags'
import { getRoleDescription } from '@/lib/role-description'
import { getInterviewQuestions } from '@/lib/interview-questions'
import PageShell from '@/components/PageShell'
import PostDetail from '@/components/PostDetail'
import VacancyGrid from '@/components/VacancyGrid'
import TagsSidebar from '@/components/TagsSidebar'
import JsonLd from '@/components/JsonLd'
import {
  buildVacancyTitle,
  buildVacancyDescription,
  buildResumeTitle,
  buildResumeDescription,
} from '@/lib/vacancy-meta'
import {
  isFilterSlug,
  getSpecFilterH1,
  getSpecFilterTitle,
  getSpecFilterDescription,
  getSpecFilterBreadcrumb,
  getSpecNominative,
  getAllFilterCombinations,
} from '@/lib/spec-filter-meta'
import { getSpecFilterSeo } from '@/lib/spec-filter-seo'

export const revalidate = 300 // ISR: refresh every 5 minutes

interface Props {
  params: Promise<{ category: string; slug: string }>
}

export async function generateStaticParams() {
  return getAllFilterCombinations()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params

  if (isFilterSlug(slug)) {
    const title = getSpecFilterTitle(category, slug)
    const description = getSpecFilterDescription(category, slug)
    const url = `https://d-pub.ru/vacancies/${category}/${slug}`
    const filterPosts = await getPostsByTwoTags(category, slug)
    const hasVacancies = filterPosts.length > 0
    return {
      title,
      description,
      alternates: { canonical: url },
      ...(!hasVacancies && { robots: { index: false, follow: true } }),
      openGraph: { title, description, url, type: 'website' },
      twitter: { card: 'summary_large_image', title, description },
    }
  }

  const post = await getPostBySlug(slug)
  if (!post) return { title: 'Вакансия не найдена' }

  const isResume = post.type === 'resume'
  const titleBase = isResume ? buildResumeTitle(post) : buildVacancyTitle(post)
  const desc = isResume ? buildResumeDescription(post) : buildVacancyDescription(post)

  const url = `https://d-pub.ru/vacancies/${category}/${slug}`

  return {
    title: titleBase,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: titleBase,
      description: desc,
      url,
      type: 'website',
      images: post.imageUrl ? [{ url: post.imageUrl, alt: post.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: titleBase,
      description: desc,
    },
  }
}

export default async function VacancyPage({ params }: Props) {
  const { category, slug } = await params

  if (isFilterSlug(slug)) {
    const [posts, allTags] = await Promise.all([
      getPostsByTwoTags(category, slug),
      getTagsWithCounts(),
    ])
    const h1 = getSpecFilterH1(category, slug)
    const specName = getSpecNominative(category)
    const breadcrumbLabel = getSpecFilterBreadcrumb(category, slug)
    const seoContent = getSpecFilterSeo(category, slug)

    const breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://d-pub.ru' },
        { '@type': 'ListItem', position: 2, name: 'Вакансии', item: 'https://d-pub.ru/vacancies' },
        {
          '@type': 'ListItem',
          position: 3,
          name: specName,
          item: `https://d-pub.ru/vacancies/${category}`,
        },
        { '@type': 'ListItem', position: 4, name: h1 },
      ],
    }

    const faqLd = seoContent?.faqItems?.length
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: seoContent.faqItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
          })),
        }
      : null

    return (
      <PageShell>
        <JsonLd data={breadcrumbLd} />
        {faqLd && <JsonLd data={faqLd} />}
        <div className="max-w-wrap mx-auto px-4 pt-6 pb-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-text-muted mb-6 flex-wrap">
            <Link href="/" className="no-underline hover:text-text transition-colors">
              Главная
            </Link>
            <span>&#8250;</span>
            <Link href="/vacancies" className="no-underline hover:text-text transition-colors">
              Вакансии
            </Link>
            <span>&#8250;</span>
            <Link
              href={`/vacancies/${category}`}
              className="no-underline hover:text-text transition-colors"
            >
              {specName}
            </Link>
            <span>&#8250;</span>
            <span className="text-text">{h1}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">{h1}</h1>
              <p className="text-text-muted mb-6 text-sm">
                {getSpecFilterDescription(category, slug)}
              </p>

              {/* Mobile tags */}
              <div className="lg:hidden mb-6">
                <TagsSidebar tags={allTags} activeSlug={category} />
              </div>

              <div className="flex items-center justify-between mb-5">
                <span className="text-sm text-text-muted">
                  Найдено <strong className="text-text">{posts.length}</strong> вакансий
                </span>
              </div>

              {posts.length === 0 ? (
                <div className="py-9 text-center text-text-light text-sm border border-dashed border-border rounded-lg">
                  Пока нет вакансий по этому фильтру
                </div>
              ) : (
                <VacancyGrid posts={posts} />
              )}

              {/* SEO text */}
              {seoContent?.seoText && (
                <article className="mt-12 pt-8 border-t border-border">
                  <div
                    className="prose prose-sm max-w-none text-text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1 [&_li]:text-sm [&_strong]:font-semibold [&_strong]:text-text"
                    dangerouslySetInnerHTML={{ __html: seoContent.seoText }}
                  />
                </article>
              )}

              {/* FAQ accordion */}
              {seoContent?.faqItems && seoContent.faqItems.length > 0 && (
                <section className="mt-12 pt-8 border-t border-border">
                  <h2 className="text-xl font-bold text-text mb-6">Частые вопросы</h2>
                  <div className="space-y-3">
                    {seoContent.faqItems.map((item, i) => (
                      <details
                        key={i}
                        className="group border border-border rounded-lg overflow-hidden"
                      >
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
              )}
            </div>

            <aside className="hidden lg:block space-y-6">
              <TagsSidebar tags={allTags} activeSlug={category} />
            </aside>
          </div>
        </div>
      </PageShell>
    )
  }

  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const postTagSlugsArr = (post.tags?.map((pt) => pt.slug).filter(Boolean) ?? []) as string[]

  const [tag, related, allTags, categoryStats] = await Promise.all([
    getTagBySlug(category),
    getPostsByType(post.type).then((posts) => posts.filter((p) => p.id !== post.id).slice(0, 5)),
    getTagsWithCounts(),
    getCategoryStats(category),
  ])

  const roleDescription = getRoleDescription(postTagSlugsArr)
  const interviewQuestions = getInterviewQuestions(postTagSlugsArr)

  // Determine job location type from post tags
  const postTagSlugs = new Set(postTagSlugsArr)
  const jobLocationType = postTagSlugs.has('udalyonka')
    ? 'TELECOMMUTE'
    : postTagSlugs.has('gibrid')
      ? 'TELECOMMUTE'
      : postTagSlugs.has('ofis')
        ? 'INPERSON'
        : undefined

  // validThrough: 30 days after posting
  const validThrough = new Date(
    new Date(post.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000
  ).toISOString()

  // Infer employmentType from tags
  const levelSlugs: Record<string, string> = {
    junior: 'INTERN',
    middle: 'FULL_TIME',
    senior: 'FULL_TIME',
  }
  const employmentType = postTagSlugs.has('freelance')
    ? 'CONTRACTOR'
    : postTagSlugs.has('part-time')
      ? 'PART_TIME'
      : 'FULL_TIME'
  void levelSlugs

  // Schema.org JobPosting
  const jobPostingLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: post.title,
    description: post.description || post.title,
    datePosted: post.createdAt,
    validThrough,
    employmentType,
    ...(jobLocationType && { jobLocationType }),
    ...(jobLocationType === 'TELECOMMUTE' && {
      applicantLocationRequirements: { '@type': 'Country', name: 'RU' },
    }),
    ...(post.company && {
      hiringOrganization: {
        '@type': 'Organization',
        name: post.company,
        sameAs: `https://d-pub.ru/vacancies/${category}`,
      },
    }),
    ...(post.salary && {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: 'RUB',
        value: {
          '@type': 'QuantitativeValue',
          value: post.salary,
        },
      },
    }),
  }

  // BreadcrumbList
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://d-pub.ru' },
      { '@type': 'ListItem', position: 2, name: 'Вакансии', item: 'https://d-pub.ru/vacancies' },
      ...(tag
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: tag.name,
              item: `https://d-pub.ru/vacancies/${category}`,
            },
          ]
        : []),
      { '@type': 'ListItem', position: tag ? 4 : 3, name: post.title },
    ],
  }

  return (
    <PageShell>
      <JsonLd data={jobPostingLd} />
      <JsonLd data={breadcrumbLd} />
      <PostDetail
        post={post}
        related={related}
        categorySlug={category}
        categoryName={tag?.name}
        allTags={allTags}
        categoryStats={categoryStats}
        roleDescription={roleDescription}
        interviewQuestions={interviewQuestions}
      />
    </PageShell>
  )
}
