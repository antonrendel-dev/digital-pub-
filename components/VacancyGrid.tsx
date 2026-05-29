'use client'

import { useState } from 'react'
import TileCard from './feed/TileCard'
import type { FeedPost } from '@/lib/posts'

const PAGE_SIZE = 20

export default function VacancyGrid({ posts }: { posts: FeedPost[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE)

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {posts.slice(0, visible).map((post) => (
          <TileCard key={post.id} post={post} />
        ))}
      </div>
      {visible < posts.length && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded-full cursor-pointer transition border-none"
          >
            Показать ещё ({posts.length - visible})
          </button>
        </div>
      )}
    </>
  )
}
