'use client'

import { FeedPost } from '@/lib/posts'

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

const FORMAT_TAGS = ['Удалёнка', 'Офис', 'Гибрид', 'Фриланс', 'Удалённо']
const LEVEL_TAGS = ['Junior', 'Middle', 'Senior', 'Junior / Middle', 'Middle+']

function getTagColorClass(tagName: string): string {
  if (FORMAT_TAGS.some(t => tagName.toLowerCase().includes(t.toLowerCase()))) return 'tag-blue'
  if (LEVEL_TAGS.some(t => tagName.toLowerCase() === t.toLowerCase())) return 'tag-green'
  return 'tag-orange'
}

const AVATAR_COLORS = [
  'bg-purple-100 text-purple-700',
  'bg-blue-100 text-blue-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-green-100 text-green-700',
  'bg-indigo-100 text-indigo-700',
]

interface TileCardProps {
  post: FeedPost
}

export default function TileCard({ post }: TileCardProps) {
  const categorySlug = post.tags?.find(t => t.tagType === 'specialization')?.slug || post.tags?.[0]?.slug || 'other'
  const href = post.slug ? `/vacancies/${categorySlug}/${post.slug}` : `/post/${post.id}`
  const colorIdx = post.title.charCodeAt(0) % AVATAR_COLORS.length

  return (
    <a
      href={href}
      className="tile-card bg-bg-card border border-border rounded-xl p-4 block no-underline text-inherit"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 ${AVATAR_COLORS[colorIdx]} rounded-full flex items-center justify-center text-xs font-semibold`}>
          {initials(post.title)}
        </div>
        {post.isNew && (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded-full">
            Новое
          </span>
        )}
      </div>
      <h2 className="text-sm font-semibold text-text mb-1 line-clamp-2 leading-snug">
        {post.title}
      </h2>
      {post.company && (
        <div className="text-xs text-text-muted mb-1.5">{post.company}</div>
      )}
      {post.salary && (
        <div className="text-sm font-semibold text-amber-600 mb-2">{post.salary}</div>
      )}
      {post.description && (
        <p className="text-xs text-text-muted line-clamp-2 mb-2">
          {cleanDescription(post.description)}
        </p>
      )}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {post.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getTagColorClass(tag.name)}`}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
      <div className="text-[10px] text-text-light" suppressHydrationWarning>
        {formatDate(post.createdAt)}
      </div>
    </a>
  )
}
