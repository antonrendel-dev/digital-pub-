import { notFound } from 'next/navigation'
import { getPostBySlug, getPostsByType } from '@/lib/posts'
import PageShell from '@/components/PageShell'
import PostDetail from '@/components/PostDetail'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function VacancyPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const related = (await getPostsByType(post.type)).filter((p) => p.id !== post.id).slice(0, 5)

  return (
    <PageShell>
      <PostDetail post={post} related={related} />
    </PageShell>
  )
}
