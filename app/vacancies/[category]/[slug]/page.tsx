import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getPostBySlug, getPostsByType } from '@/lib/posts'
import { getTagBySlug, getTagsWithCounts } from '@/lib/tags'
import PageShell from '@/components/PageShell'
import PostDetail from '@/components/PostDetail'

export const dynamic = 'force-dynamic'

interface Props {
  params: { category: string; slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPostBySlug(params.slug)
  if (!post) return { title: 'Вакансия не найдена' }

  const rawTitle = `${post.title}${post.salary ? ` (${post.salary})` : ''} — вакансия`
  const title = rawTitle.length > 60 ? rawTitle.slice(0, 57) + '...' : rawTitle

  const rawDesc = `${post.company ? post.company + ': ' : ''}${post.title}.${post.salary ? ' Зарплата: ' + post.salary + '.' : ''} Смотреть на Диджитал Паб.`
  const description = rawDesc.length > 155 ? rawDesc.slice(0, 152) + '...' : rawDesc

  return { title, description }
}

export default async function VacancyPage({ params }: Props) {
  const { category, slug } = params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const [tag, related, allTags] = await Promise.all([
    getTagBySlug(category),
    getPostsByType(post.type).then((posts) => posts.filter((p) => p.id !== post.id).slice(0, 5)),
    getTagsWithCounts(),
  ])

  return (
    <PageShell>
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
