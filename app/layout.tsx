import type { Metadata } from 'next'

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
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
