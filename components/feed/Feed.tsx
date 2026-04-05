'use client'

import { useState, useCallback, useEffect } from 'react'
import { JOBS, filterJobs, sortJobs, SortOrder } from '@/lib/data'
import JobCard from './JobCard'

const FILTER_CHIPS = [
  'Полная занятость',
  'Частичная',
  'Удалённо',
  'Офис',
  'Гибрид',
  'IT',
  'Дизайн',
  'Маркетинг',
  'Финансы',
  'Аналитика',
]

const PAGE_SIZE = 5

interface FeedProps {
  searchQuery: string
  externalTag?: string
  onExternalTagConsumed: () => void
}

export default function Feed({ searchQuery, externalTag, onExternalTagConsumed }: FeedProps) {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [sortOrder, setSortOrder] = useState<SortOrder>('date')
  const [visible, setVisible] = useState(PAGE_SIZE)

  // Consume external tag clicks (from tag cloud / job card tags)
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

  // Apply search → filter → sort
  let jobs = JOBS

  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    jobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.co.toLowerCase().includes(q) ||
        j.tags.some((t) => t.t.toLowerCase().includes(q))
    )
  }

  jobs = filterJobs(jobs, activeFilters)
  jobs = sortJobs(jobs, sortOrder)

  const handleTagClick = useCallback((tag: string) => {
    setActiveFilters((prev) => new Set([...prev, tag]))
    setVisible(PAGE_SIZE)
  }, [])

  return (
    <div className="feed-col">
      <div className="feed-top">
        <span className="feed-count">
          {searchQuery ? `${jobs.length} результатов` : `${jobs.length} актуальных вакансий`}
        </span>
        <select
          className="sort-sel"
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value as SortOrder)
            setVisible(PAGE_SIZE)
          }}
        >
          <option value="date">Сначала новые</option>
          <option value="salary">По зарплате</option>
          <option value="az">По названию А–Я</option>
        </select>
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

      {/* Job cards */}
      {jobs.length === 0 ? (
        <div className="empty-state">По вашему запросу ничего не найдено</div>
      ) : (
        <>
          {jobs.slice(0, visible).map((job) => (
            <JobCard key={job.id} job={job} onTagClick={handleTagClick} />
          ))}

          {visible < jobs.length && (
            <button className="load-btn" onClick={() => setVisible((v) => v + 4)}>
              Показать ещё вакансии
            </button>
          )}
        </>
      )}
    </div>
  )
}
