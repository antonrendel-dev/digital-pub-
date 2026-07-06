import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
})

export async function generateMetadata(): Promise<Metadata> {
  return {
    robots: {
      index: !process.env.PAYLOAD_PUSH_DB,
      follow: !process.env.PAYLOAD_PUSH_DB,
    },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://mc.yandex.ru" />
        <link rel="dns-prefetch" href="https://mc.yandex.ru" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body>{children}</body>
    </html>
  )
}
