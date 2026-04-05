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
  const [isBlue, setIsBlue] = useState(false)

  useEffect(() => {
    const theme = localStorage.getItem('theme')
    const accent = localStorage.getItem('accent')
    if (theme === 'dark') {
      setIsDark(true)
      document.documentElement.setAttribute('data-theme', 'dark')
    }
    if (accent === 'blue') {
      setIsBlue(true)
      document.documentElement.setAttribute('data-accent', 'blue')
    }
  }, [])

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const toggleAccent = () => {
    const next = !isBlue
    setIsBlue(next)
    document.documentElement.setAttribute('data-accent', next ? 'blue' : 'yellow')
    localStorage.setItem('accent', next ? 'blue' : 'yellow')
  }

  return (
    <>
      <Navbar
        onSearch={setSearchQuery}
        onDarkToggle={toggleDark}
        isDark={isDark}
        onAccentToggle={toggleAccent}
        isBlue={isBlue}
      />
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
