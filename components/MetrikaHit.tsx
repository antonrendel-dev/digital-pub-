'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    ym?: (id: number, action: string, url: string) => void
  }
}

export default function MetrikaHit({ id }: { id: number }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    const url = pathname + (searchParams.toString() ? '?' + searchParams.toString() : '')
    window.ym?.(id, 'hit', url)
  }, [id, pathname, searchParams])

  return null
}
