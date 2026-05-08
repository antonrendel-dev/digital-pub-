import { getPostsByType } from '@/lib/posts'
import { getTagsWithCounts, getStats } from '@/lib/tags'
import ListingPage from '@/components/ListingPage'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Резюме — Диджитал Паб',
  description: 'Резюме специалистов в IT, дизайне, маркетинге и аналитике.',
}

export default async function ResumesPage() {
  const [posts, tags, stats] = await Promise.all([
    getPostsByType('resume'),
    getTagsWithCounts(),
    getStats(),
  ])
  return <ListingPage posts={posts} type="resume" tags={tags} stats={stats} />
}
