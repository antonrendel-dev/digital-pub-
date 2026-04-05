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

  const handleSearch = () => onSearch(query.trim())
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
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
        <div className="nav-slogan-sub">
          Вакансии и резюме из Telegram-каналов.&nbsp;Находи быстро, откликайся легко.
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
            placeholder="Поиск вакансий и резюме..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSearch}>Найти</button>
        </div>
        <button className="btn-g">Войти</button>
        <button className="btn-b">+ Разместить</button>
        <button className="btn-theme" onClick={onDarkToggle} title="Сменить тему">
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  )
}
