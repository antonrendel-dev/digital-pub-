'use client'

import { useState } from 'react'
import { FeedPost } from '@/lib/posts'

interface JobCardProps {
  post: FeedPost
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000 / 60 / 60)
  if (diff < 1) return 'Только что'
  if (diff < 24) return `${diff} ч. назад`
  const days = Math.floor(diff / 24)
  if (days === 1) return 'Вчера'
  if (days < 7) return `${days} дня назад`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function initials(title: string): string {
  return title.trim().charAt(0).toUpperCase()
}

function cleanDescription(text: string): string {
  return text
    .replace(/@\w+/g, '')
    .replace(/Администрация не несет ответственност[^\n]*/gi, '')
    .replace(/Смотри вакансии →[^\n]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function JobCard({ post }: JobCardProps) {
  const [saved, setSaved] = useState(false)

  const href = post.slug ? `/vacancies/${post.slug}` : `/post/${post.id}`

  return (
    <a
      href={href}
      className={`block no-underline text-inherit bg-bg-card border border-border rounded-xl p-5 transition-all duration-200 hover:border-text-light hover:shadow-md ${
        post.type === 'resume' ? 'border-l-4 border-l-blue-400' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-[15px] font-semibold text-text leading-tight tracking-tight">
          {post.title}
          {post.isNew && (
            <span className="inline-block ml-2 px-2 py-0.5 bg-brand-yellow text-[#111] text-[9px] font-bold rounded align-middle">
              Новое
            </span>
          )}
        </h3>
        <span className="text-xs text-text-light ml-3 flex-shrink-0 pt-0.5" suppressHydrationWarning>
          {formatDate(post.createdAt)}
        </span>
      </div>

      {post.company && (
        <div className="text-sm text-text-light mb-1.5">{post.company}</div>
      )}

      {post.salary && (
        <div className="text-sm font-bold text-brand-green mb-2">{post.salary}</div>
      )}

      {post.description && (
        <p className="text-sm text-text-muted line-clamp-2 mb-2.5">
          {cleanDescription(post.description)}
        </p>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {post.tags.map((tag) => (
            <span
              key={tag.id}
              className="text-[11px] px-2 py-0.5 rounded border border-tag-tp-border bg-tag-tp-bg text-tag-tp-color"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border-light">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-border-light rounded-md flex items-center justify-center text-[10px] font-bold text-text-light flex-shrink-0">
            {initials(post.title)}
          </div>
          <span className="text-xs text-text-light">
            {post.type === 'vacancy' ? 'Вакансия' : 'Резюме'}
          </span>
        </div>
        <button
          className="text-xs text-text-light hover:text-accent bg-transparent border-none cursor-pointer transition-colors"
          onClick={(e) => { e.preventDefault(); setSaved(!saved) }}
        >
          {saved ? '\u2665 Сохранено' : '\u2661 Сохранить'}
        </button>
      </div>
    </a>
  )
}
