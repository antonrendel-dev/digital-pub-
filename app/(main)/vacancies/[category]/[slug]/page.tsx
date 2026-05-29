import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getPostBySlug, getPostsByType } from '@/lib/posts'
import { getTagBySlug, getTagsWithCounts } from '@/lib/tags'
import PageShell from '@/components/PageShell'
import PostDetail from '@/components/PostDetail'
import JsonLd from '@/components/JsonLd'

export const revalidate = 300 // ISR: refresh every 5 minutes

interface Props {
  params: Promise<{ category: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return { title: 'Вакансия не найдена' }

  const isResume = post.type === 'resume'
  const tagNames = (post.tags ?? [])
    .slice(0, 2)
    .map((t: { name: string }) => t.name)
    .join(', ')

  // Title (60 chars max before template adds " | Диджитал Паб")
  let titleBase: string
  if (isResume) {
    titleBase = `Резюме: ${post.title}`
    if (titleBase.length > 50) titleBase = titleBase.slice(0, 47) + '...'
  } else {
    titleBase = post.company ? `${post.title} — ${post.company}` : post.title
    if (titleBase.length > 50)
      titleBase = post.title.length > 50 ? post.title.slice(0, 47) + '...' : post.title
  }

  // Description (160 chars max)
  let desc: string
  if (isResume) {
    desc = `Соискатель: ${post.title}`
    if (post.salary) desc += `. Ожидания: ${post.salary}`
    if (tagNames) desc += `. ${tagNames}`
    desc += '. Ищет работу в digital — d-pub.ru'
  } else {
    desc = post.company ? `${post.company} ищет ${post.title}` : `Вакансия: ${post.title}`
    if (post.salary) desc += `. Зарплата: ${post.salary}`
    if (tagNames) desc += `. ${tagNames}`
    desc += '. Смотри на d-pub.ru'
  }
  if (desc.length > 160) desc = desc.slice(0, 157) + '...'

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

  // Schema.org JobPosting
  const jobPostingLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: post.title,
    description: post.description || post.title,
    datePosted: post.createdAt,
    ...(jobLocationType && { jobLocationType }),
    ...(post.company && {
      hiringOrganization: {
        '@type': 'Organization',
        name: post.company,
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
