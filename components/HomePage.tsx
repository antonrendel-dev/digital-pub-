'use client'

import { useState, useEffect } from 'react'
import Navbar from './Navbar'
import Hero from './Hero'
import LeftSidebar from './LeftSidebar'
import Feed from './feed/Feed'
import RightSidebar from './RightSidebar'

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [externalTag, setExternalTag] = useState<string | undefined>()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') {
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
      <Hero />
      <div className="wrap layout">
        <LeftSidebar />
        <Feed
          searchQuery={searchQuery}
          externalTag={externalTag}
          onExternalTagConsumed={() => setExternalTag(undefined)}
        />
        <RightSidebar onTagClick={setExternalTag} />
      </div>
    </>
  )
}
