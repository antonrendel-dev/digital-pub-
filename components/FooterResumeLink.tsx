'use client'

import { reachGoal } from '@/lib/metrika'

interface Props {
  children: React.ReactNode
  className?: string
}

export default function FooterResumeLink({ children, className }: Props) {
  return (
    <a
      href="https://t.me/resume_vac_bot"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => reachGoal('resume_submit')}
      className={className}
    >
      {children}
    </a>
  )
}
