import { getPostsByTypePaginated } from '@/lib/posts'
import { getTagsWithCounts, getStats } from '@/lib/tags'
import ListingPage from '@/components/ListingPage'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Вакансии маркетолога, дизайнера, SMM, аналитика',
  description:
    'Актуальные вакансии в digital: маркетинг, дизайн, SMM, аналитика, контент. Удалённая работа и офис. Обновление из Telegram-каналов ежедневно.',
  alternates: { canonical: 'https://d-pub.ru/vacancies' },
  openGraph: {
    title: 'Вакансии маркетолога, дизайнера, SMM, аналитика',
    description:
      'Актуальные вакансии в digital: маркетинг, дизайн, SMM, аналитика, контент. Удалённая работа и офис.',
    url: 'https://d-pub.ru/vacancies',
    type: 'website',
  },
}

interface Props {
  searchParams: { page?: string }
}

export default async function VacanciesPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1)
  const [{ posts, total, totalPages }, tags, stats] = await Promise.all([
    getPostsByTypePaginated('vacancy', page, 20),
    getTagsWithCounts(),
    getStats(),
  ])
  return (
    <ListingPage
      posts={posts}
      type="vacancy"
      tags={tags}
      stats={stats}
      currentPage={page}
      totalPages={totalPages}
      total={total}
    />
  )
}
