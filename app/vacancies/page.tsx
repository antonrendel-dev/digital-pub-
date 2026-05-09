import { getPostsByType } from '@/lib/posts'
import { getTagsWithCounts, getStats } from '@/lib/tags'
import ListingPage from '@/components/ListingPage'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Вакансии маркетолога, дизайнера, SMM, аналитика',
  description: 'Актуальные вакансии в digital: маркетинг, дизайн, SMM, аналитика, контент. Удалённая работа и офис. Обновление из Telegram-каналов ежедневно.',
}

export default async function VacanciesPage() {
  const [posts, tags, stats] = await Promise.all([
    getPostsByType('vacancy'),
    getTagsWithCounts(),
    getStats(),
  ])
  return <ListingPage posts={posts} type="vacancy" tags={tags} stats={stats} />
}
