import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getPostBySlug, getPostsByType } from '@/lib/posts'
import { getTagBySlug, getTagsWithCounts } from '@/lib/tags'
import PageShell from '@/components/PageShell'
import PostDetail from '@/components/PostDetail'
import JsonLd from '@/components/JsonLd'
import {
  buildVacancyTitle,
  buildVacancyDescription,
  buildResumeTitle,
  buildResumeDescription,
} from '@/lib/vacancy-meta'

export const revalidate = 300 // ISR: refresh every 5 minutes

interface Props {
  params: Promise<{ category: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params
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
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const [tag, related, allTags] = await Promise.all([
    getTagBySlug(category),
    getPostsByType(post.type).then((posts) => posts.filter((p) => p.id !== post.id).slice(0, 5)),
    getTagsWithCounts(),
  ])

  // Determine job location type from post tags
  const postTagSlugs = new Set(post.tags?.map((pt) => pt.slug).filter(Boolean) ?? [])
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
    ...(!post.company && {
      hiringOrganization: {
        '@type': 'Organization',
        name: 'Диджитал Паб',
        sameAs: 'https://d-pub.ru',
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
      />
    </PageShell>
  )
}
