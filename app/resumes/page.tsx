import { getPostsByTypePaginated } from '@/lib/posts'
import { getTagsWithCounts, getStats } from '@/lib/tags'
import ListingPage from '@/components/ListingPage'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Резюме дизайнеров, маркетологов и IT-специалистов',
  description:
    'Резюме digital-специалистов: дизайнеры, маркетологи, SMM, аналитики. Найдите сотрудника из Telegram-сообщества для вашего проекта.',
  alternates: { canonical: 'https://d-pub.ru/resumes' },
  openGraph: {
    title: 'Резюме дизайнеров, маркетологов и IT-специалистов',
    description:
      'Резюме digital-специалистов: дизайнеры, маркетологи, SMM, аналитики. Найдите сотрудника из Telegram-сообщества.',
    url: 'https://d-pub.ru/resumes',
    type: 'website',
  },
}

interface Props {
  searchParams: { page?: string }
}

export default async function ResumesPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1)
  const [{ posts, total, totalPages }, tags, stats] = await Promise.all([
    getPostsByTypePaginated('resume', page, 20),
    getTagsWithCounts(),
    getStats(),
  ])
  return (
    <ListingPage
      posts={posts}
      type="resume"
      tags={tags}
      stats={stats}
      currentPage={page}
      totalPages={totalPages}
      total={total}
    />
  )
}
