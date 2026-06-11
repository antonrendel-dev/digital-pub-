'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FeedPost } from '@/lib/posts'
import { FILTER_CHIPS } from '@/lib/config'
import JobCard from './JobCard'

const PAGE_SIZE = 10

const CHIP_SLUGS: Record<string, string> = {
  Удалёнка: 'udalyonka',
  SMM: 'smm',
  SEO: 'seo',
  Дизайн: 'dizajn',
  Маркетинг: 'marketing',
  Менеджер: 'menedzher',
  Таргет: 'target',
}

interface FeedProps {
  posts: FeedPost[]
  searchQuery: string
  pageTitle?: string
  stats?: { vacancyCount: number; resumeCount: number }
}

export default function Feed({ posts, searchQuery, pageTitle, stats }: FeedProps) {
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [searchQuery])

  let filtered = posts

  if (searchQuery) {
    const words = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean)
    filtered = filtered.filter((p) => {
      const haystack = [p.title, p.description, p.company].filter(Boolean).join(' ').toLowerCase()
      return words.every((word) => haystack.includes(word))
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
              : `${stats?.vacancyCount ?? vacancies.length} вакансий · ${stats?.resumeCount ?? resumes.length} резюме`}
        </span>
      </div>

      {/* Filter chips — navigate to category pages */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTER_CHIPS.map((chip) => (
          <Link
            key={chip}
            href={`/vacancies/${CHIP_SLUGS[chip] ?? chip.toLowerCase()}`}
            className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all bg-bg-card text-text-muted border border-border hover:border-text-light hover:text-text no-underline"
          >
            {chip}
          </Link>
        ))}
      </div>

      {/* Posts */}
      {sorted.length === 0 ? (
        <div className="py-9 text-center text-text-light text-sm border border-dashed border-border rounded-lg">
          По вашему запросу ничего не найдено
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {sorted.slice(0, visible).map((post) => (
              <JobCard key={post.id} post={post} />
            ))}
          </div>
          {visible < sorted.length && (
            <div className="mt-6 text-center">
              <button
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-full cursor-pointer transition border-none"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                Показать ещё
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
