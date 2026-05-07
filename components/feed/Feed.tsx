'use client'

import { useState, useCallback, useEffect } from 'react'
import { FeedPost } from '@/lib/posts'
import JobCard from './JobCard'

const FILTER_CHIPS = [
  'Удалёнка',
  'SMM',
  'SEO',
  'Дизайн',
  'Маркетинг',
  'Менеджер',
  'Таргет',
  'WordPress',
]

const PAGE_SIZE = 10

interface FeedProps {
  posts: FeedPost[]
  searchQuery: string
  externalTag?: string
  onExternalTagConsumed: () => void
  pageTitle?: string
}

export default function Feed({
  posts,
  searchQuery,
  externalTag,
  onExternalTagConsumed,
  pageTitle,
}: FeedProps) {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => {
    if (externalTag && !activeFilters.has(externalTag)) {
      setActiveFilters((prev) => new Set([...prev, externalTag]))
      setVisible(PAGE_SIZE)
      onExternalTagConsumed()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTag])

  const toggleChip = useCallback((tag: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
    setVisible(PAGE_SIZE)
  }, [])

  const removeFilter = useCallback((tag: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      next.delete(tag)
      return next
    })
    setVisible(PAGE_SIZE)
  }, [])

  const clearAll = useCallback(() => {
    setActiveFilters(new Set())
    setVisible(PAGE_SIZE)
  }, [])

  // Search + filter
  let filtered = posts

  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        (p.company?.toLowerCase().includes(q) ?? false)
    )
  }

  if (activeFilters.size > 0) {
    filtered = filtered.filter((p) => {
      // Try tag-based filtering first
      if (p.tags && p.tags.length > 0) {
        return [...activeFilters].some((f) =>
          p.tags.some((tag) => tag.name.toLowerCase() === f.toLowerCase())
        )
      }
      // Fallback to text-based
      return [...activeFilters].some(
        (f) =>
          p.title.toLowerCase().includes(f.toLowerCase()) ||
          (p.description?.toLowerCase().includes(f.toLowerCase()) ?? false)
      )
    })
  }

  const vacancies = filtered.filter((p) => p.type === 'vacancy')
  const resumes = filtered.filter((p) => p.type === 'resume')
  const sorted = [...vacancies, ...resumes]

  return (
    <div>
      {pageTitle && (
        <h1 className="text-xl font-bold text-text tracking-tight mb-4">{pageTitle}</h1>
      )}
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-sm text-text-light">
          {searchQuery
            ? `${sorted.length} результатов`
            : pageTitle
              ? `${sorted.length} объявлений`
              : `${vacancies.length} вакансий \u00B7 ${resumes.length} резюме`}
        </span>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer select-none ${
              activeFilters.has(chip)
                ? 'bg-accent text-accent-text border border-accent'
                : 'bg-bg-card text-text-muted border border-border hover:border-text-light hover:text-text'
            }`}
            onClick={() => toggleChip(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Active filter pills */}
      {activeFilters.size > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 items-center">
          {[...activeFilters].map((f) => (
            <span
              key={f}
              className="text-xs px-2.5 py-1 rounded-full bg-accent text-accent-text cursor-pointer flex items-center gap-1 font-semibold hover:bg-accent-hover"
              onClick={() => removeFilter(f)}
            >
              {f} &times;
            </span>
          ))}
          <button
            className="text-xs text-text-light cursor-pointer underline ml-0.5 bg-transparent border-none"
            onClick={clearAll}
          >
            Сбросить все
          </button>
        </div>
      )}

      {/* Posts */}
      {sorted.length === 0 ? (
        <div className="py-9 text-center text-text-light text-sm border border-dashed border-border rounded-lg">
          По вашему запросу ничего не найдено
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {sorted.slice(0, visible).map((post) => (
              <JobCard key={post.id} post={post} />
            ))}
          </div>
          {visible < sorted.length && (
            <button
              className="w-full mt-4 py-2.5 border border-border rounded-full bg-bg-card text-sm text-text-light hover:border-text-light hover:text-text cursor-pointer transition-all"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
            >
              Показать ещё
            </button>
          )}
        </>
      )}
    </div>
  )
}
