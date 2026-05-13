'use client'

import { cleanDescription, formatDate, getTagColorClass, getPrimaryCategorySlug, type FeedPost } from '@/lib/postUtils'

function initials(title: string): string {
  return title.trim().charAt(0).toUpperCase()
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
  const categorySlug = getPrimaryCategorySlug(post)
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
