import { notFound } from 'next/navigation'
import { z } from 'zod'
import { getPostById, getPostsByType } from '@/lib/posts'
import { getTagsWithCounts } from '@/lib/tags'
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
