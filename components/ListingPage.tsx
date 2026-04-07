'use client'

import { useState, useEffect } from 'react'
import Navbar from './Navbar'
import LeftSidebar from './LeftSidebar'
import RightSidebar from './RightSidebar'
import Feed from './feed/Feed'
import { FeedPost } from '@/lib/posts'

const CATEGORIES = ['Разработка', 'Маркетинг', 'Дизайн', 'Продажи', 'Аналитика', 'Финансы', 'HR']

interface ListingPageProps {
  posts: FeedPost[]
  type: 'vacancy' | 'resume'
}

export default function ListingPage({ posts, type }: ListingPageProps) {
  const [isDark, setIsDark] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', 'blue')
    const theme = localStorage.getItem('theme')
    if (theme === 'dark') {
      setIsDark(true)
      document.documentElement.setAttribute('data-theme', 'dark')
    }
    // Read category from URL
    const params = new URLSearchParams(window.location.search)
    const cat = params.get('cat')
    if (cat) setActiveCategory(cat)
  }, [])

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  // Filter by category (simple text match in title/description)
  const filtered = activeCategory
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(activeCategory.toLowerCase()) ||
          (p.description?.toLowerCase().includes(activeCategory.toLowerCase()) ?? false)
      )
    : posts

  const pageTitle = type === 'vacancy' ? 'Вакансии' : 'Резюме'

  return (
    <>
      <Navbar onSearch={setSearchQuery} onDarkToggle={toggleDark} isDark={isDark} />

      {/* Category tabs */}
      <div className="listing-cats wrap">
        <button
          className={`listing-cat ${!activeCategory ? 'on' : ''}`}
          onClick={() => setActiveCategory(null)}
        >
          Все
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`listing-cat ${activeCategory === cat ? 'on' : ''}`}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="wrap layout">
        <LeftSidebar />
        <Feed
          posts={filtered}
          searchQuery={searchQuery}
          onExternalTagConsumed={() => {}}
          pageTitle={pageTitle}
        />
        <RightSidebar onTagClick={() => {}} />
      </div>
    </>
  )
}
