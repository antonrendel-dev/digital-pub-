import { notFound } from 'next/navigation'
import { getPostBySlug, getPostsByType } from '@/lib/posts'
import { getTagBySlug } from '@/lib/tags'
import PageShell from '@/components/PageShell'
import PostDetail from '@/components/PostDetail'

export const dynamic = 'force-dynamic'

interface Props {
  params: { category: string; slug: string }
}

export default async function VacancyPage({ params }: Props) {
  const { category, slug } = params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  // Validate category exists (optional soft check — don't 404 if category mismatch, just show the post)
  const tag = await getTagBySlug(category)

  const related = (await getPostsByType(post.type)).filter((p) => p.id !== post.id).slice(0, 5)

  return (
    <PageShell>
      <PostDetail post={post} related={related} categorySlug={category} categoryName={tag?.name} />
    </PageShell>
  )
}
