'use client'

import { GOALS, reachGoal } from '@/lib/metrika'

interface SocialLinkProps {
  platform: string
  url: string
  className?: string
  children: React.ReactNode
}

/**
 * Ссылка на наш канал в соцсети — с отметкой в Метрике.
 *
 * Живёт отдельным клиентским компонентом, потому что подвал серверный:
 * обработчик клика туда не поставить, а переводить в клиентские весь подвал
 * ради трёх иконок — терять серверный рендер остального.
 */
export default function SocialLink({ platform, url, className, children }: SocialLinkProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={platform}
      className={className}
      onClick={() => reachGoal(GOALS.SOCIAL_CLICK, { platform })}
    >
      {children}
    </a>
  )
}
