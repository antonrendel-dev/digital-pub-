import { getPostsByTypePaginated } from '@/lib/posts'
import { getTagsWithCounts, getStats } from '@/lib/tags'
import ListingPage from '@/components/ListingPage'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://d-pub.ru'
const TITLE = 'Резюме дизайнеров, маркетологов и IT-специалистов'
const DESCRIPTION =
  'Резюме digital-специалистов: дизайнеры, маркетологи, SMM, аналитики. Найдите сотрудника из Telegram-сообщества для вашего проекта.'

interface Props {
  searchParams: { page?: string }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1)
  const canonical = page === 1 ? `${BASE_URL}/resumes` : `${BASE_URL}/resumes?page=${page}`
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      title: TITLE,
      description:
        'Резюме digital-специалистов: дизайнеры, маркетологи, SMM, аналитики. Найдите сотрудника из Telegram-сообщества.',
      url: canonical,
      type: 'website',
    },
  }
}

export default async function ResumesPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1)
  const [{ posts, total, totalPages }, tags, stats] = await Promise.all([
    getPostsByTypePaginated('resume', page, 20),
    getTagsWithCounts(),
    getStats(),
  ])

  const base = `${BASE_URL}/resumes`
  const prevUrl = page > 1 ? (page === 2 ? base : `${base}?page=${page - 1}`) : null
  const nextUrl = page < totalPages ? `${base}?page=${page + 1}` : null

  return (
    <>
      {prevUrl && <link rel="prev" href={prevUrl} />}
      {nextUrl && <link rel="next" href={nextUrl} />}
      <ListingPage
        posts={posts}
        type="resume"
        tags={tags}
        stats={stats}
        currentPage={page}
        totalPages={totalPages}
        total={total}
      />
    </>
  )
}
