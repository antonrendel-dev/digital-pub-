import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { z } from 'zod'
import { getPostById, getPostsByType } from '@/lib/posts'
import { getTagsWithCounts } from '@/lib/tags'
import { getPrimaryCategorySlug } from '@/lib/postUtils'
import PageShell from '@/components/PageShell'
import PostDetail from '@/components/PostDetail'

const idSchema = z.string().regex(/^\d{1,10}$/)

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { title: 'Запись не найдена' }

  const post = await getPostById(parseInt(parsed.data, 10))
  if (!post) return { title: 'Запись не найдена' }

  const typeLabel = post.type === 'vacancy' ? 'вакансия' : 'резюме'
  const rawTitle = `${post.title}${post.salary ? ` (${post.salary})` : ''} — ${typeLabel}`
  const title = rawTitle.length > 60 ? rawTitle.slice(0, 57) + '...' : rawTitle

  const rawDesc = `${post.company ? post.company + ': ' : ''}${post.title}.${post.salary ? ' Зарплата: ' + post.salary + '.' : ''} Смотреть на Диджитал Паб.`
  const description = rawDesc.length > 155 ? rawDesc.slice(0, 152) + '...' : rawDesc

  const cat = getPrimaryCategorySlug(post)
  const realPath = post.slug
    ? post.type === 'vacancy'
      ? `/vacancies/${cat}/${post.slug}`
      : `/resumes/${cat}/${post.slug}`
    : `/post/${id}`
  const canonicalUrl = `https://d-pub.ru${realPath}`

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      images: post.imageUrl
        ? [{ url: post.imageUrl, alt: post.title }]
        : [{ url: 'https://d-pub.ru/og-image.png', width: 1200, height: 630, alt: 'Диджитал Паб' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function PostPage({ params }: Props) {
  const { id: rawId } = await params
  const parsed = idSchema.safeParse(rawId)
  if (!parsed.success) notFound()
  const id = parseInt(parsed.data, 10)

  const post = await getPostById(id)
  if (!post) notFound()

  const [related, allTags] = await Promise.all([
    getPostsByType(post.type).then((posts) => posts.filter((p) => p.id !== post.id).slice(0, 5)),
    getTagsWithCounts(),
  ])

  return (
    <PageShell>
      <PostDetail post={post} related={related} allTags={allTags} />
    </PageShell>
  )
}
