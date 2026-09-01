'use client'

import { GOALS, reachGoal } from '@/lib/metrika'
import { botLink } from '@/lib/bot-link'

interface Props {
  children: React.ReactNode
  className?: string
}

export default function FooterResumeLink({ children, className }: Props) {
  return (
    <a
      href={botLink('footer')}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => reachGoal(GOALS.RESUME_SUBMIT)}
      className={className}
    >
      {children}
    </a>
  )
}
