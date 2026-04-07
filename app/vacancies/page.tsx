import { getPostsByType } from '@/lib/posts'
import ListingPage from '@/components/ListingPage'
import type { Metadata } from 'next'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Вакансии — Диджитал Паб',
  description: 'Актуальные вакансии в IT, дизайне, маркетинге и аналитике из Telegram-каналов.',
}

export default async function VacanciesPage() {
  const posts = await getPostsByType('vacancy')
  return <ListingPage posts={posts} type="vacancy" />
}
