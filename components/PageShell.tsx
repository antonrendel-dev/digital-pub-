'use client'

import Navbar from './Navbar'
import { useTheme } from '@/lib/hooks/useTheme'

interface PageShellProps {
  children: React.ReactNode
  /** Slogan text passed from server (PageShellWrapper reads Payload Global) */
  slogan?: string
}

export default function PageShell({ children, slogan }: PageShellProps) {
  const { isDark, toggleDark } = useTheme()

  return (
    <div className="flex flex-col flex-1">
      <Navbar onSearch={() => {}} onDarkToggle={toggleDark} isDark={isDark} slogan={slogan} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
