'use client'

import Navbar from './Navbar'
import Footer from './Footer'
import { useTheme } from '@/lib/hooks/useTheme'

export default function PageShell({ children }: { children: React.ReactNode }) {
  const { isDark, toggleDark } = useTheme()

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onSearch={() => {}} onDarkToggle={toggleDark} isDark={isDark} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
