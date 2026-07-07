'use client'

import { useState } from 'react'
import {
  cleanDescription,
  formatDate,
  getTagColorClass,
  getPrimaryCategorySlug,
  type FeedPost,
} from '@/lib/postUtils'

interface JobCardProps {
  post: FeedPost
}

function initials(title: string): string {
  return title.trim().charAt(0).toUpperCase()
}

export default function JobCard({ post }: JobCardProps) {
  const [saved, setSaved] = useState(false)

  const categorySlug = getPrimaryCategorySlug(post)
  const baseUrl = post.type === 'resume' ? 'resumes' : 'vacancies'
  const href = post.slug ? `/${baseUrl}/${categorySlug}/${post.slug}` : `/post/${post.id}`

  return (
    <a
      href={href}
      className={`block no-underline text-inherit bg-bg-card border border-border rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
        post.type === 'resume' ? 'border-l-4 border-l-blue-400' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-[15px] font-semibold text-text leading-tight tracking-tight">
          {post.title}
          {post.isNew && (
            <span className="inline-block ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full align-middle">
              Новое
            </span>
          )}
        </h3>
        <span
          className="text-xs text-text-light ml-3 flex-shrink-0 pt-0.5"
          suppressHydrationWarning
        >
          {formatDate(post.createdAt)}
        </span>
      </div>

      {post.company && <div className="text-sm text-text-light mb-1.5">{post.company}</div>}

      {post.salary && (
        <div className="text-sm font-semibold text-amber-600 mb-2">{post.salary}</div>
      )}

      {post.description && (
        <p className="text-sm text-text-muted line-clamp-2 mb-2.5">
          {cleanDescription(post.description)}
        </p>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {post.tags.map((tag) => (
            <span
              key={tag.id}
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTagColorClass(tag.name)}`}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-semibold">
            {initials(post.title)}
          </div>
          <span className="text-xs text-text-muted">
            {post.type === 'vacancy' ? 'Вакансия' : 'Резюме'}
          </span>
        </div>
        <button
          className="text-xs text-text-light hover:text-red-400 bg-transparent border-none cursor-pointer transition-colors"
          onClick={(e) => {
            e.preventDefault()
            setSaved(!saved)
          }}
        >
          {saved ? '\u2665 Сохранено' : '\u2661 Сохранить'}
        </button>
      </div>
    </a>
  )
}
