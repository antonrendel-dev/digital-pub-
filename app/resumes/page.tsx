import { getPostsByType } from '@/lib/posts'
import ListingPage from '@/components/ListingPage'
import type { Metadata } from 'next'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Резюме — Диджитал Паб',
  description: 'Резюме специалистов в IT, дизайне, маркетинге и аналитике.',
}

export default async function ResumesPage() {
  const posts = await getPostsByType('resume')
  return <ListingPage posts={posts} type="resume" />
}
