'use client'

import { useState } from 'react'
import Image from 'next/image'

interface NavbarProps {
  onSearch: (query: string) => void
  onDarkToggle: () => void
  isDark: boolean
}

const CATEGORIES = ['Разработка', 'Маркетинг', 'Дизайн', 'Продажи', 'Аналитика', 'Финансы', 'HR']

export default function Navbar({ onSearch, onDarkToggle, isDark }: NavbarProps) {
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

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
    <nav className="nav-main">
      {/* Left: logo + brand name + slogan under name */}
      <div className="nav-brand">
        <Image src="/logo.png" alt="Диджитал Паб" width={45} height={45} className="nav-logo-img" />
        <div className="nav-brand-text">
          <div className="logo">
            диджитал<em>паб</em>
          </div>
          <div className="nav-brand-slogan">Место, где встречаются хорошие люди</div>
        </div>
      </div>

      {/* Sub-slogan — between brand block and nav links */}
      <div className="nav-slogan-block">
        <div className="nav-slogan-sub">Вакансии и резюме из Telegram-каналов.</div>
        <div className="nav-slogan-sub">Находи быстро, откликайся легко.</div>
      </div>

      {/* Center: nav links */}
      <div className="nav-center">
        <div className="nav-links">
          <a href="/" className="on">
            Главная
          </a>

          <div className="nav-dropdown">
            <a href="/vacancies">
              Вакансии <span className="nav-arrow">▾</span>
            </a>
            <div className="dropdown-menu">
              {CATEGORIES.map((cat) => (
                <a key={cat} href={`/vacancies?cat=${cat}`} className="dropdown-item">
                  {cat}
                </a>
              ))}
            </div>
          </div>

          <div className="nav-dropdown">
            <a href="/resumes">
              Резюме <span className="nav-arrow">▾</span>
            </a>
            <div className="dropdown-menu">
              {CATEGORIES.map((cat) => (
                <a key={cat} href={`/resumes?cat=${cat}`} className="dropdown-item">
                  {cat}
                </a>
              ))}
            </div>
          </div>

          <a href="/reviews">Отзывы</a>
          <a href="/articles">Статьи</a>
          <a href="/courses">Курсы</a>
          <a href="/useful">Полезное</a>
        </div>
      </div>

      {/* Right: search + buttons + theme toggle */}
      <div className="nav-right">
        <div className={`nav-search-wrap ${searchOpen ? 'open' : ''}`}>
          <div className="nav-search-field">
            <input
              type="text"
              placeholder="Поиск вакансий и резюме..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            className="nav-search-icon"
            onClick={() => {
              if (searchOpen && query.trim()) {
                handleSearch()
              } else {
                setSearchOpen(!searchOpen)
                if (searchOpen) { setQuery(''); onSearch(''); }
              }
            }}
            title="Поиск"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
        <button className="btn-g">Войти</button>
        <button className="btn-b">+ Разместить</button>
        <button className="btn-theme" onClick={onDarkToggle} title="Сменить тему">
          {isDark ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <circle cx="12" cy="12" r="4" fill="#FFAC33" />
              <path stroke="#FFAC33" strokeWidth="2" strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#F4C44E" />
            </svg>
          )}
        </button>
      </div>
    </nav>
  )
}
