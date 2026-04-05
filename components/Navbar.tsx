'use client'

import { useState } from 'react'
import Image from 'next/image'

interface NavbarProps {
  onSearch: (query: string) => void
  onDarkToggle: () => void
  isDark: boolean
  onAccentToggle: () => void
  isBlue: boolean
}

const CATEGORIES = ['Разработка', 'Маркетинг', 'Дизайн', 'Продажи', 'Аналитика', 'Финансы', 'HR']

export default function Navbar({
  onSearch,
  onDarkToggle,
  isDark,
  onAccentToggle,
  isBlue,
}: NavbarProps) {
  const [query, setQuery] = useState('')

  const handleSearch = () => onSearch(query.trim())
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <nav className="nav-main">
      {/* Left: logo image + text */}
      <div className="nav-brand">
        <Image src="/logo.png" alt="Диджитал Паб" width={36} height={36} className="nav-logo-img" />
        <div className="logo">
          диджитал<em>паб</em>
        </div>
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

          <a href="/articles">Статьи</a>
        </div>
      </div>

      {/* Right: search + buttons + theme toggle */}
      <div className="nav-right">
        <div className="sbar nav-sbar">
          <input
            type="text"
            placeholder="Поиск..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSearch}>Найти</button>
        </div>
        <button className="btn-g">Войти</button>
        <button className="btn-b">+ Разместить</button>
        <button
          className="btn-theme"
          onClick={onAccentToggle}
          title={isBlue ? 'Переключить на жёлтый' : 'Переключить на синий'}
          style={{ fontSize: 14 }}
        >
          {isBlue ? '🟡' : '🔵'}
        </button>
        <button className="btn-theme" onClick={onDarkToggle} title="Сменить тему">
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  )
}
