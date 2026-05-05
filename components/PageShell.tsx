'use client'

import { useState, useEffect } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'

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
    <div className="page-wrapper">
      <Navbar onSearch={() => {}} onDarkToggle={toggleDark} isDark={isDark} />
      <main className="page-content">{children}</main>
      <Footer />
    </div>
  )
}
