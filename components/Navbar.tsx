'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavbarProps {
  onSearch: (query: string) => void
  onDarkToggle: () => void
  isDark: boolean
  slogan?: string
}

export default function Navbar({ onSearch, onDarkToggle, isDark, slogan }: NavbarProps) {
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  const navCls = (href: string) => {
    const active =
      href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
    return `text-sm font-medium transition-colors ${active ? 'text-accent font-semibold' : 'text-text-muted hover:text-text'}`
  }
  const mobileCls = (href: string) => {
    const active =
      href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
    return `block py-3 px-3 text-sm font-medium rounded-lg transition-colors ${active ? 'text-accent font-semibold bg-accent/5' : 'text-text-muted hover:bg-white/60'}`
  }

  const handleSearch = () => {
    if (query.trim()) onSearch(query.trim())
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
    if (e.key === 'Escape') {
      setSearchOpen(false)
      setQuery('')
      onSearch('')
    }
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-bg-nav border-b border-border shadow-sm transition-colors duration-200">
        <div className="max-w-wrap mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo + Brand */}
          <Link href="/" className="flex items-center gap-3 no-underline">
            <Image
              src="/logo.png"
              alt="Диджитал Паб"
              width={44}
              height={44}
              className="rounded-lg"
              priority
            />
            <div>
              <div className="text-lg font-semibold text-text logo-brand">
                диджитал<em>паб</em>
              </div>
              <div className="text-xs text-text-muted hidden sm:block">
                {slogan ?? 'Место, где встречаются хорошие люди'}
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-6">
            <Link href="/" className={navCls('/')}>
              Главная
            </Link>
            <Link href="/vacancies" className={navCls('/vacancies')}>
              Вакансии
            </Link>
            <Link href="/resumes" className={navCls('/resumes')}>
              Резюме
            </Link>
            <Link href="/articles" className={navCls('/articles')}>
              Статьи
            </Link>
            <Link href="/about" className={navCls('/about')}>
              О сервисе
            </Link>
          </div>

          {/* Right: Search + Buttons */}
          <div className="flex items-center gap-2">
            {/* Expanding search - desktop */}
            <div className="hidden md:flex items-center gap-2">
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ width: searchOpen ? 220 : 0, opacity: searchOpen ? 1 : 0 }}
              >
                <input
                  type="text"
                  placeholder="Поиск вакансий и резюме..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-9 px-3 border border-border rounded-full bg-bg-card text-text text-sm outline-none focus:border-accent transition-colors"
                />
              </div>
              <button
                onClick={() => {
                  if (searchOpen && query.trim()) {
                    handleSearch()
                  } else {
                    setSearchOpen(!searchOpen)
                    if (searchOpen) {
                      setQuery('')
                      onSearch('')
                    }
                  }
                }}
                title="Поиск"
                className="flex items-center justify-center w-9 h-9 rounded-full bg-border-light hover:bg-border text-text-light hover:text-accent cursor-pointer transition-all flex-shrink-0"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>

            {/* Mobile search icon */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-border-light transition-colors"
            >
              <svg
                className="w-5 h-5 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>

            {/* Post button - desktop */}
            <a
              href="https://t.me/resume_vac_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center px-4 py-2 bg-accent hover:bg-accent-hover text-accent-text text-sm font-semibold rounded-full transition-colors whitespace-nowrap"
            >
              + Разместить
            </a>

            {/* Theme toggle */}
            <button
              onClick={onDarkToggle}
              title="Сменить тему"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-border-light hover:bg-border cursor-pointer transition-colors"
            >
              {isDark ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <circle cx="12" cy="12" r="4" fill="#FFAC33" />
                  <path
                    stroke="#FFAC33"
                    strokeWidth="2"
                    strokeLinecap="round"
                    d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#F4C44E" />
                </svg>
              )}
            </button>

            {/* Burger - mobile */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-border-light transition-colors"
            >
              <svg
                className="w-5 h-5 text-text-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                {menuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden bg-[#f9fafb] dark:bg-[#0a1530] border-t border-border px-4 py-4 space-y-1 shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
            <Link href="/" className={mobileCls('/')} onClick={() => setMenuOpen(false)}>
              Главная
            </Link>
            <Link
              href="/vacancies"
              className={mobileCls('/vacancies')}
              onClick={() => setMenuOpen(false)}
            >
              Вакансии
            </Link>
            <Link
              href="/resumes"
              className={mobileCls('/resumes')}
              onClick={() => setMenuOpen(false)}
            >
              Резюме
            </Link>
            <Link
              href="/articles"
              className={mobileCls('/articles')}
              onClick={() => setMenuOpen(false)}
            >
              Статьи
            </Link>
            <Link href="/about" className={mobileCls('/about')} onClick={() => setMenuOpen(false)}>
              О сервисе
            </Link>
            <div className="pt-3 border-t border-border mt-3">
              <a
                href="https://t.me/resume_vac_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-accent hover:bg-accent-hover text-accent-text font-semibold text-sm py-3 rounded-full transition-colors"
              >
                + Разместить
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* Descriptor bar */}
      <div className="bg-[#f9fafb] dark:bg-[#0a1530] border-b border-border transition-colors duration-200">
        <div className="max-w-wrap mx-auto px-4 py-1 text-center">
          <span style={{ fontSize: '12px', color: 'var(--text-light)', letterSpacing: '0.2px' }}>
            Вакансии и резюме из Telegram-каналов &middot; Находи быстро, откликайся легко
          </span>
        </div>
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="md:hidden fixed inset-0 z-[100] bg-bg p-4">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              placeholder="Поиск вакансий и резюме..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 h-11 px-4 border border-border rounded-lg bg-bg-card text-text text-sm outline-none focus:border-accent"
            />
            <button
              onClick={() => {
                setSearchOpen(false)
                setQuery('')
                onSearch('')
              }}
              className="text-sm text-text-muted"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </>
  )
}
