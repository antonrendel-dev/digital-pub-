import { notFound } from 'next/navigation'
import { z } from 'zod'
import { getPostById, getPostsByType } from '@/lib/posts'
import PageShell from '@/components/PageShell'
import PostDetail from '@/components/PostDetail'

const idSchema = z.string().regex(/^\d{1,10}$/)

interface Props {
  params: { id: string }
}

export default async function PostPage({ params }: Props) {
  const { id: rawId } = params
  const parsed = idSchema.safeParse(rawId)
  if (!parsed.success) notFound()
  const id = parseInt(parsed.data, 10)

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
