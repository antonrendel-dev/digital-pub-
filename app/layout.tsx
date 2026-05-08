import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Диджитал Паб — место, где встречаются хорошие люди',
  description:
    'Вакансии и резюме в сфере IT, дизайна, маркетинга и аналитики. Агрегатор из Telegram-каналов.',
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
