'use client'

import { useState, useEffect } from 'react'
import Navbar from './Navbar'
import LeftSidebar from './LeftSidebar'
import Feed from './feed/Feed'
import RightSidebar from './RightSidebar'
import Footer from './Footer'
import { FeedPost } from '@/lib/posts'

interface HomePageProps {
  posts: FeedPost[]
  stats?: { vacancyCount: number; resumeCount: number; companyCount: number; newToday: number }
  articles?: { title: string; slug: string; date: string }[]
  tags?: { name: string; slug: string; tagType: string; count: number }[]
}

export default function HomePage({ posts, stats, articles, tags }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const theme = localStorage.getItem('theme')
    // accent is always yellow per mockups
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
            />
            <aside className="hidden lg:block">
              <RightSidebar tags={tags} articles={articles} />
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
