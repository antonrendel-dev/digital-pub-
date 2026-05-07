import { getPostsByType } from '@/lib/posts'
import { getTagsWithCounts } from '@/lib/tags'
import ListingPage from '@/components/ListingPage'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Резюме — Диджитал Паб',
  description: 'Резюме специалистов в IT, дизайне, маркетинге и аналитике.',
}

export default async function ResumesPage() {
  const [posts, tags] = await Promise.all([
    getPostsByType('resume'),
    getTagsWithCounts(),
  ])
  return <ListingPage posts={posts} type="resume" tags={tags} />
}
