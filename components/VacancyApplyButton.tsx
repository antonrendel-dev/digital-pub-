'use client'

import { reachGoal } from '@/lib/metrika'

interface Props {
  href: string
}

export default function VacancyApplyButton({ href }: Props) {
  function handleClick() {
    reachGoal('vacancy_click')
    reachGoal('telegram_click')
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="inline-flex items-center justify-center bg-accent hover:bg-accent-hover text-gray-900 font-semibold text-sm px-6 py-3 rounded-full no-underline transition-colors min-h-[44px]"
    >
      Откликнуться в Telegram
      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  )
}
