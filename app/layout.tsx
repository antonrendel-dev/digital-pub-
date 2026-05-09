import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Диджитал Паб — вакансии и резюме в digital',
    template: '%s | Диджитал Паб',
  },
  description:
    'Агрегатор вакансий и резюме digital-специалистов из Telegram-каналов. SMM, аналитика, дизайн, маркетинг — новые предложения каждый день.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
