'use client'

import { useState } from 'react'
import Hero from './Hero'
import LeftSidebar from './LeftSidebar'
import Feed from './feed/Feed'
import RightSidebar from './RightSidebar'

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [externalTag, setExternalTag] = useState<string | undefined>()

  return (
    <>
      <Hero onSearch={setSearchQuery} />
      <div className="wrap layout">
        <LeftSidebar />
        <Feed
          searchQuery={searchQuery}
          externalTag={externalTag}
          onExternalTagConsumed={() => setExternalTag(undefined)}
        />
        <RightSidebar onTagClick={setExternalTag} />
      </div>
    </>
  )
}
