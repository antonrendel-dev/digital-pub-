'use client'

import { useState, useEffect } from 'react'
import Navbar from './Navbar'
import LeftSidebar from './LeftSidebar'
import RightSidebar from './RightSidebar'
import Feed from './feed/Feed'
import Footer from './Footer'
import { FeedPost } from '@/lib/posts'

interface ListingPageProps {
  posts: FeedPost[]
  type: 'vacancy' | 'resume'
  tags?: { name: string; slug: string; tagType: string; count: number }[]
  stats?: { vacancyCount: number; resumeCount: number; companyCount: number; newToday: number }
}

export default function ListingPage({ posts, type, tags, stats }: ListingPageProps) {
  const [isDark, setIsDark] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // accent is always yellow per mockups
    const theme = localStorage.getItem('theme')
    if (theme === 'dark') {
      setIsDark(true)
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [])

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.add('theme-switching')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
        localStorage.setItem('theme', next ? 'dark' : 'light')
        setTimeout(() => document.documentElement.classList.remove('theme-switching'), 450)
      })
    })
  }

  const pageTitle = type === 'vacancy' ? 'Вакансии' : 'Резюме'

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onSearch={setSearchQuery} onDarkToggle={toggleDark} isDark={isDark} />
      <main className="flex-1">
        <div className="max-w-wrap mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-layout gap-0 lg:gap-6">
            <aside className="hidden lg:block">
              <LeftSidebar stats={stats} />
            </aside>
            <Feed
              posts={posts}
              searchQuery={searchQuery}
              onExternalTagConsumed={() => {}}
              pageTitle={pageTitle}
            />
            <aside className="hidden lg:block">
              <RightSidebar tags={tags} />
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
