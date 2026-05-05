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
  'Директ',
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
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        next.add(tag)
      }
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
    filtered = filtered.filter((p) =>
      [...activeFilters].some(
        (f) =>
          p.title.toLowerCase().includes(f.toLowerCase()) ||
          (p.description?.toLowerCase().includes(f.toLowerCase()) ?? false)
      )
    )
  }

  const vacancies = filtered.filter((p) => p.type === 'vacancy')
  const resumes = filtered.filter((p) => p.type === 'resume')
  const sorted = [...vacancies, ...resumes] // vacancies first

  return (
    <div className="feed-col">
      {pageTitle && <h1 className="feed-page-title">{pageTitle}</h1>}
      <div className="feed-top">
        <span className="feed-count">
          {searchQuery
            ? `${sorted.length} результатов`
            : pageTitle
              ? `${sorted.length} объявлений`
              : `${vacancies.length} вакансий · ${resumes.length} резюме`}
        </span>
      </div>

      {/* Filter chips */}
      <div className="filters">
        {FILTER_CHIPS.map((chip) => (
          <span
            key={chip}
            className={`chip ${activeFilters.has(chip) ? 'on' : ''}`}
            onClick={() => toggleChip(chip)}
          >
            {chip}
          </span>
        ))}
      </div>

      {/* Active filter pills */}
      {activeFilters.size > 0 && (
        <div className="af-bar">
          {[...activeFilters].map((f) => (
            <span key={f} className="af-pill" onClick={() => removeFilter(f)}>
              {f} ×
            </span>
          ))}
          <button className="af-clr" onClick={clearAll}>
            Сбросить всё
          </button>
        </div>
      )}

      {/* Posts */}
      {sorted.length === 0 ? (
        <div className="empty-state">По вашему запросу ничего не найдено</div>
      ) : (
        <>
          {sorted.slice(0, visible).map((post) => (
            <JobCard key={post.id} post={post} />
          ))}
          {visible < sorted.length && (
            <button className="load-btn" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Показать ещё
            </button>
          )}
        </>
      )}
    </div>
  )
}
