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
}

export default function HomePage({ posts }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [externalTag, setExternalTag] = useState<string | undefined>()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const theme = localStorage.getItem('theme')
    // Blue accent is the permanent default — apply it on mount
    document.documentElement.setAttribute('data-accent', 'blue')
    if (theme === 'dark') {
      setIsDark(true)
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [])

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    // 1. Навешиваем transitions на все элементы
    document.documentElement.classList.add('theme-switching')
    // 2. Ждём кадр, чтобы браузер применил transition-правила
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // 3. Только теперь меняем тему — transitions уже на месте
        document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
        localStorage.setItem('theme', next ? 'dark' : 'light')
        setTimeout(() => document.documentElement.classList.remove('theme-switching'), 450)
      })
    })
  }

  return (
    <div className="page-wrapper">
      <Navbar onSearch={setSearchQuery} onDarkToggle={toggleDark} isDark={isDark} />
      <main className="page-content">
        <div className="wrap layout">
          <LeftSidebar />
          <Feed
            posts={posts}
            searchQuery={searchQuery}
            externalTag={externalTag}
            onExternalTagConsumed={() => setExternalTag(undefined)}
          />
          <RightSidebar onTagClick={setExternalTag} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
