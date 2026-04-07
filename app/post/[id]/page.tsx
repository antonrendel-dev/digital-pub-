import { notFound } from 'next/navigation'
import { getPostById, getPostsByType } from '@/lib/posts'
import PageShell from '@/components/PageShell'
import PostDetail from '@/components/PostDetail'

interface Props {
  params: { id: string }
}

export default async function PostPage({ params }: Props) {
  const id = parseInt(params.id, 10)
  if (isNaN(id)) notFound()

  const post = await getPostById(id)
  if (!post) notFound()

  // Related posts: same type, excluding current
  const related = (await getPostsByType(post.type)).filter((p) => p.id !== post.id).slice(0, 5)

  return (
    <PageShell>
      <PostDetail post={post} related={related} />
    </PageShell>
  )
}
