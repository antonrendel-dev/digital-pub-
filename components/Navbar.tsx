'use client'

import { useState } from 'react'

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
      {/* Left: logo + tagline */}
      <div className="nav-brand">
        <div className="logo">
          диджитал<em>паб</em>
        </div>
        <div className="nav-tagline">Место, где встречаются хорошие люди</div>
      </div>

      {/* Center: search */}
      <div className="nav-search">
        <div className="sbar">
          <input
            type="text"
            placeholder="Должность, компания или навык..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSearch}>Найти</button>
        </div>
      </div>

      {/* Right: nav links + buttons */}
      <div className="nav-right">
        <div className="nav-links">
          <a href="/" className="on">
            Главная
          </a>

          {/* Вакансии dropdown */}
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

          {/* Резюме dropdown */}
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

        <div className="nav-r">
          <button className="btn-g">Войти</button>
          <button className="btn-b">+ Разместить</button>
          <button className="btn-theme" onClick={onDarkToggle} title="Сменить тему">
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  )
}
