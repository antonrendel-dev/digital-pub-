'use client'

import { useState, useEffect } from 'react'
import Navbar from './Navbar'

export default function PageShell({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', 'blue')
    const theme = localStorage.getItem('theme')
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
      <Navbar onSearch={() => {}} onDarkToggle={toggleDark} isDark={isDark} />
      {children}
    </>
  )
}
