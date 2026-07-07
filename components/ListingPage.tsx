'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from './Navbar'
import LeftSidebar from './LeftSidebar'
import RightSidebar from './RightSidebar'
import TagsSidebar from './TagsSidebar'
import Feed from './feed/Feed'
import { FeedPost } from '@/lib/posts'
import { useTheme } from '@/lib/hooks/useTheme'

interface ListingPageProps {
  posts: FeedPost[]
  type: 'vacancy' | 'resume'
  tags?: { name: string; slug: string; tagType: string; count: number }[]
  stats?: { vacancyCount: number; resumeCount: number; companyCount: number; newToday: number }
  currentPage?: number
  totalPages?: number
  total?: number
  seoHtml?: string
}

export default function ListingPage({
  posts,
  type,
  tags,
  stats,
  currentPage = 1,
  totalPages = 1,
  total,
  seoHtml,
}: ListingPageProps) {
  const { isDark, toggleDark } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')

  const pageTitle =
    type === 'vacancy'
      ? 'Вакансии маркетологов, дизайнеров, SMM и digital-специалистов'
      : 'Резюме digital-специалистов: маркетинг, дизайн, SMM, аналитика'
  const basePath = type === 'vacancy' ? '/vacancies' : '/resumes'

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onSearch={setSearchQuery} onDarkToggle={toggleDark} isDark={isDark} />
      <main className="flex-1">
        <div className="max-w-wrap mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-layout gap-0 lg:gap-6">
            <aside className="hidden lg:block">
              <LeftSidebar stats={stats} />
            </aside>
            <div>
              {/* Tags rubricator — mobile/tablet only (desktop: right sidebar) */}
              {tags && tags.length > 0 && (
                <div className="lg:hidden mb-4">
                  {type === 'resume' ? (
                    <TagsSidebar
                      tags={tags}
                      heading="Резюме по категориям"
                      hrefFn={(s) => `/resumes/tag/${s}`}
                    />
                  ) : (
                    <TagsSidebar tags={tags} />
                  )}
                </div>
              )}
              <Feed
                posts={posts}
                searchQuery={searchQuery}
                onExternalTagConsumed={() => {}}
                pageTitle={pageTitle}
              />

              {/* Server-side pagination */}
              {totalPages > 1 && (
                <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Пагинация">
                  {currentPage > 1 && (
                    <Link
                      href={`${basePath}?page=${currentPage - 1}`}
                      className="px-4 py-2 text-sm font-medium text-text-muted bg-bg-card border border-border rounded-full no-underline hover:border-accent hover:text-text transition-all"
                    >
                      &larr; Назад
                    </Link>
                  )}

                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 7) {
                      pageNum = i + 1
                    } else if (currentPage <= 4) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i
                    } else {
                      pageNum = currentPage - 3 + i
                    }
                    return (
                      <Link
                        key={pageNum}
                        href={`${basePath}?page=${pageNum}`}
                        className={`w-9 h-9 flex items-center justify-center text-sm font-medium rounded-full no-underline transition-all ${
                          pageNum === currentPage
                            ? 'bg-accent text-accent-text'
                            : 'text-text-muted bg-bg-card border border-border hover:border-accent hover:text-text'
                        }`}
                      >
                        {pageNum}
                      </Link>
                    )
                  })}

                  {currentPage < totalPages && (
                    <Link
                      href={`${basePath}?page=${currentPage + 1}`}
                      className="px-4 py-2 text-sm font-medium text-text-muted bg-bg-card border border-border rounded-full no-underline hover:border-accent hover:text-text transition-all"
                    >
                      Вперёд &rarr;
                    </Link>
                  )}
                </nav>
              )}

              {total !== undefined && (
                <div className="mt-3 text-center text-xs text-text-light">
                  Страница {currentPage} из {totalPages} ({total}{' '}
                  {type === 'vacancy' ? 'вакансий' : 'резюме'})
                </div>
              )}

              {seoHtml && (
                <article className="mt-12 pt-8 border-t border-border">
                  <div
                    className="prose prose-sm max-w-none text-text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1 [&_li]:text-sm [&_a]:text-accent [&_a]:underline [&_strong]:font-semibold [&_strong]:text-text"
                    dangerouslySetInnerHTML={{ __html: seoHtml }}
                  />
                </article>
              )}
            </div>
            <aside className="hidden lg:block">
              {type === 'resume' ? (
                <TagsSidebar
                  tags={tags ?? []}
                  heading="Резюме по категориям"
                  hrefFn={(s) => `/resumes/tag/${s}`}
                />
              ) : (
                <RightSidebar tags={tags} />
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
