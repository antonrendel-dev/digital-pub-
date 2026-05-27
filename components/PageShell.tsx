'use client'

import Navbar from './Navbar'
import { useTheme } from '@/lib/hooks/useTheme'

interface PageShellProps {
  children: React.ReactNode
  /** Slogan text passed from server (NavbarServer equivalent for pages using PageShell) */
  slogan?: string
}

export default function PageShell({ children, slogan }: PageShellProps) {
  const { isDark, toggleDark } = useTheme()

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onSearch={() => {}} onDarkToggle={toggleDark} isDark={isDark} slogan={slogan} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
