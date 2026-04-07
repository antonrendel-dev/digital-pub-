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

export default function JobCard({ post }: JobCardProps) {
  const [saved, setSaved] = useState(false)

  const source = post.channelUsername ? `@${post.channelUsername}` : null

  return (
    <div className="jcard">
      <div className="jcard-head">
        <div className="jtitle">
          {post.title}
          {post.isNew && <span className="nbadge">Новое</span>}
        </div>
        <div className="jdate" suppressHydrationWarning>
          {formatDate(post.createdAt)}
        </div>
      </div>

      {(post.company || source) && (
        <div className="jmeta">
          {post.company ?? source}
          {post.company && source && (
            <>
              <span className="dot" />
              {source}
            </>
          )}
        </div>
      )}

      {post.salary && <div className="jsalary">{post.salary}</div>}

      {post.description && <div className="jdesc">{post.description}</div>}

      <div className="jcard-foot">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="jco-logo">{initials(post.title)}</div>
          <span className="jco-name">{post.type === 'vacancy' ? 'Вакансия' : 'Резюме'}</span>
        </div>
        <button className="jsave" onClick={() => setSaved(!saved)}>
          {saved ? '♥ Сохранено' : '♡ Сохранить'}
        </button>
      </div>
    </div>
  )
}
