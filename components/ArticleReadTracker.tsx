'use client'

import { useEffect, useRef } from 'react'
import { GOALS, reachGoal } from '@/lib/metrika'
import { countsAsRead } from '@/lib/read-depth'

interface ArticleReadTrackerProps {
  slug: string
  chars: number
}

/**
 * Отмечает дочитывание статьи.
 *
 * Дочитыванием считаем совпадение двух условий: человек добрался до конца
 * текста И провёл на странице правдоподобное для этого время. Каждое по
 * отдельности врёт — до низа долистывают мышью за две секунды, а открытая
 * и забытая вкладка набирает любое время без единого прочитанного слова.
 *
 * Отличается от того, что уже считает SEO-отчёт: там среднее время визита по
 * Метрике, то есть «сколько в среднем провели». Здесь — сколько человек
 * действительно дочитали, и это уже поддаётся сравнению между статьями.
 */
export default function ArticleReadTracker({ slug, chars }: ArticleReadTrackerProps) {
  const fired = useRef(false)

  useEffect(() => {
    const marker = document.getElementById('article-end')
    if (!marker) return

    const openedAt = Date.now()

    const observer = new IntersectionObserver(
      (entries) => {
        if (fired.current) return
        if (!entries.some((e) => e.isIntersecting)) return
        const spent = (Date.now() - openedAt) / 1000
        if (!countsAsRead(chars, spent)) return
        fired.current = true
        reachGoal(GOALS.ARTICLE_READ, { slug, seconds: Math.round(spent) })
        observer.disconnect()
      },
      // Конец текста считается достигнутым, когда маркер вошёл в экран
      // целиком: иначе цель срабатывала бы у тех, кто едва задел низ.
      { threshold: 1 }
    )

    observer.observe(marker)
    return () => observer.disconnect()
  }, [slug, chars])

  return null
}
