import { getPostsByType } from '@/lib/posts'
import { getTagsWithCounts, getStats } from '@/lib/tags'
import ListingPage from '@/components/ListingPage'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Резюме дизайнеров, маркетологов и IT-специалистов',
  description: 'Резюме digital-специалистов: дизайнеры, маркетологи, SMM, аналитики. Найдите сотрудника из Telegram-сообщества для вашего проекта.',
}

export default async function ResumesPage() {
  const [posts, tags, stats] = await Promise.all([
    getPostsByType('resume'),
    getTagsWithCounts(),
    getStats(),
  ])
  return <ListingPage posts={posts} type="resume" tags={tags} stats={stats} />
}
