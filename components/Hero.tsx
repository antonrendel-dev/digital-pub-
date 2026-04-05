'use client'

import { useState } from 'react'

interface HeroProps {
  onSearch: (query: string) => void
}

export default function Hero({ onSearch }: HeroProps) {
  const [query, setQuery] = useState('')

  const handleSearch = () => {
    onSearch(query.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="hero wrap">
      <h1>
        Место, где встречаются
        <br />
        хорошие люди
      </h1>
      <p>
        Вакансии и резюме из проверенных Telegram-каналов.
        <br />
        Находи быстро, откликайся легко.
      </p>
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
  )
}
