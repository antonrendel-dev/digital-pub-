'use client'

import { useState } from 'react'
import Navbar from './Navbar'
import LeftSidebar from './LeftSidebar'
import Feed from './feed/Feed'
import RightSidebar from './RightSidebar'
import { FeedPost } from '@/lib/posts'
import { useTheme } from '@/lib/hooks/useTheme'

interface HomePageProps {
  posts: FeedPost[]
  stats?: { vacancyCount: number; resumeCount: number; companyCount: number; newToday: number }
  articles?: { title: string; slug: string; date: string }[]
  tags?: { name: string; slug: string; tagType: string; count: number }[]
  seoHtml?: string
}

export default function HomePage({ posts, stats, articles, tags, seoHtml }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { isDark, toggleDark } = useTheme()

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onSearch={setSearchQuery} onDarkToggle={toggleDark} isDark={isDark} />
      <main className="flex-1">
        <div className="max-w-wrap mx-auto px-4 py-6">
          {/* H1 + intro */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-text tracking-tight mb-2">
              Вакансии и резюме digital-специалистов из Telegram-каналов
            </h1>
            <p className="text-sm text-text-muted leading-relaxed max-w-2xl">
              Диджитал Паб — агрегатор вакансий в маркетинге, дизайне, SMM и IT из профильных
              Telegram-каналов. Находите работу в digital или размещайте резюме — новые предложения
              поступают каждый день. Удалённая работа, офис или гибрид — все форматы в одном месте.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-layout gap-0 lg:gap-6">
            <aside className="hidden lg:block">
              <LeftSidebar stats={stats} />
            </aside>
            <Feed posts={posts} searchQuery={searchQuery} onExternalTagConsumed={() => {}} />
            <aside className="hidden lg:block">
              <RightSidebar tags={tags} articles={articles} />
            </aside>
          </div>

          {/* SEO text bottom */}
          {seoHtml && (
            <article className="mt-12 pt-8 border-t border-border">
              <div
                className="prose prose-sm max-w-none text-text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1 [&_li]:text-sm [&_a]:text-accent [&_a]:underline [&_strong]:font-semibold [&_strong]:text-text"
                dangerouslySetInnerHTML={{ __html: seoHtml }}
              />
            </article>
          )}
        </div>
      </main>
    </div>
  )
}
