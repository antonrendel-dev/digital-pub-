import type { Metadata } from 'next'
import HomePage from '@/components/HomePage'
import { getPublishedPosts } from '@/lib/posts'
import { getStats, getTagsWithCounts } from '@/lib/tags'
import { getArticles, formatArticleDate } from '@/lib/articles'

export const metadata: Metadata = {
  title: 'Вакансии в маркетинге, дизайне и IT — Диджитал Паб',
  description: 'Агрегатор вакансий и резюме digital-специалистов из Telegram-каналов. SMM, аналитика, дизайн, маркетинг — новые предложения каждый день.',
}

export const dynamic = 'force-dynamic'

export default async function Page() {
  const [posts, stats, tags] = await Promise.all([
    getPublishedPosts(),
    getStats(),
    getTagsWithCounts(),
  ])
  const articlesMeta = getArticles()
  const articles = articlesMeta.map((a) => ({
    title: a.title,
    slug: a.slug,
    date: formatArticleDate(a.publishedAt),
  }))
  return <HomePage posts={posts} stats={stats} articles={articles} tags={tags} />
}
