import { getPostsByType } from '@/lib/posts'
import { getTagsWithCounts, getStats } from '@/lib/tags'
import ListingPage from '@/components/ListingPage'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Вакансии — Диджитал Паб',
  description: 'Актуальные вакансии в IT, дизайне, маркетинге и аналитике из Telegram-каналов.',
}

export default async function VacanciesPage() {
  const [posts, tags, stats] = await Promise.all([
    getPostsByType('vacancy'),
    getTagsWithCounts(),
    getStats(),
  ])
  return <ListingPage posts={posts} type="vacancy" tags={tags} stats={stats} />
}
