'use client'

/**
 * Admin list action: "Дублировать пост"
 * Appears in the Posts collection list view as a button in the admin toolbar.
 * On click, duplicates the selected post, clearing unique fields to avoid constraint violation.
 */

import React, { useState } from 'react'

type Post = {
  id: string
  type: string
  title: string
  slug: string | null
  description: string | null
  company: string | null
  salary: string | null
  status: string
  source: string
  imageUrl: string | null
  telegramMessageId: string | null
  channelUsername: string | null
  tags: string[]
}

export const DuplicatePostAction: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleDuplicate = async () => {
    const selected = document.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"][name="select"]:checked'
    )

    if (selected.length === 0) {
      setMessage('Выберите хотя бы один пост для дублирования')
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setIsLoading(true)
    setMessage(null)

    let duplicated = 0
    let failed = 0

    for (const checkbox of Array.from(selected)) {
      const row = checkbox.closest('tr')
      const idCell = row?.querySelector('[data-column-name="id"]')
      const postId = idCell?.textContent?.trim() || checkbox.value

      if (!postId) continue

      try {
        // Fetch the original post
        const getRes = await fetch(`/api/posts/${postId}`)
        if (!getRes.ok) {
          failed++
          continue
        }
        const original: Post = await getRes.json()

        // Build duplicate data — clear unique-constrained fields
        const duplicateData = {
          type: original.type,
          title: `[Копия] ${original.title}`,
          slug: null, // must be null — avoids unique constraint on slug
          description: original.description,
          company: original.company,
          salary: original.salary,
          status: 'pending', // safe default for duplicates
          source: original.source,
          imageUrl: original.imageUrl,
          telegramMessageId: null, // must be null — part of partial unique index
          channelUsername: null, // must be null — part of partial unique index
          tags: original.tags,
        }

        const createRes = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // send admin session cookie
          body: JSON.stringify(duplicateData),
        })

        if (createRes.ok) {
          duplicated++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }

    setIsLoading(false)

    if (duplicated > 0) {
      setMessage(
        `Дублировано: ${duplicated}${failed > 0 ? `, ошибок: ${failed}` : ''}. Обновите страницу.`
      )
    } else {
      setMessage(`Не удалось дублировать посты (ошибок: ${failed})`)
    }
    setTimeout(() => setMessage(null), 5000)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={handleDuplicate}
        disabled={isLoading}
        style={{
          padding: '8px 16px',
          borderRadius: '4px',
          border: '1px solid var(--theme-elevation-150)',
          background: 'var(--theme-elevation-50)',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
        }}
        type="button"
      >
        {isLoading ? 'Дублирование...' : 'Дублировать пост'}
      </button>
      {message && <span style={{ fontSize: '13px', color: 'var(--theme-text)' }}>{message}</span>}
    </div>
  )
}

export default DuplicatePostAction
