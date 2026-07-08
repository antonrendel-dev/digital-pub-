import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getPostBySlug, getPostsByType } from '@/lib/posts'
import { getTagBySlug, getTagsWithCountsByType, getCategoryStats } from '@/lib/tags'
import { getRoleDescription } from '@/lib/role-description'
import { getInterviewQuestions } from '@/lib/interview-questions'
import { buildResumeTitle, buildResumeDescription } from '@/lib/vacancy-meta'
import PageShell from '@/components/PageShell'
import PostDetail from '@/components/PostDetail'
import JsonLd from '@/components/JsonLd'

export const revalidate = 300

interface Props {
  params: Promise<{ category: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return { title: 'Резюме не найдено' }

  const titleBase = buildResumeTitle(post)
  const desc = buildResumeDescription(post)
  const url = `https://d-pub.ru/resumes/${category}/${slug}`

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
    twitter: { card: 'summary_large_image', title: titleBase, description: desc },
  }
}

export default async function ResumePage({ params }: Props) {
  const { category, slug } = await params

  const post = await getPostBySlug(slug)
  if (!post) notFound()
  if (post.type !== 'resume') redirect(`/vacancies/${category}/${slug}`)

  const postTagSlugsArr = (post.tags?.map((pt) => pt.slug).filter(Boolean) ?? []) as string[]

  const [tag, related, allTags, categoryStats] = await Promise.all([
    getTagBySlug(category),
    getPostsByType('resume').then((posts) => posts.filter((p) => p.id !== post.id).slice(0, 5)),
    getTagsWithCountsByType('resume'),
    getCategoryStats(category),
  ])

  const roleDescription = getRoleDescription(postTagSlugsArr)
  const interviewQuestions = getInterviewQuestions(postTagSlugsArr)

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://d-pub.ru' },
      { '@type': 'ListItem', position: 2, name: 'Резюме', item: 'https://d-pub.ru/resumes' },
      ...(tag
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: tag.name,
              item: `https://d-pub.ru/resumes/tag/${category}`,
            },
          ]
        : []),
      { '@type': 'ListItem', position: tag ? 4 : 3, name: post.title },
    ],
  }

  const profilePageLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `https://d-pub.ru/resumes/${category}/${slug}#profilepage`,
    datePublished: post.createdAt,
    dateModified: post.createdAt,
    breadcrumb: { '@id': `https://d-pub.ru/resumes/${category}/${slug}#breadcrumb` },
    mainEntity: {
      '@type': 'Person',
      name: post.title,
      description: post.description
        ? post.description.slice(0, 200).replace(/\n/g, ' ')
        : undefined,
      ...(post.salary ? { seeks: { '@type': 'JobPosting', baseSalary: post.salary } } : {}),
    },
  }

  return (
    <PageShell>
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={profilePageLd} />
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
