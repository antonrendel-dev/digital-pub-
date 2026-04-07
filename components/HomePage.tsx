'use client'

import { useState, useEffect } from 'react'
import Navbar from './Navbar'
import LeftSidebar from './LeftSidebar'
import Feed from './feed/Feed'
import RightSidebar from './RightSidebar'
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
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <>
      <Navbar onSearch={setSearchQuery} onDarkToggle={toggleDark} isDark={isDark} />
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
    </>
  )
}
