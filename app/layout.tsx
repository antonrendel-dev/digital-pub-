import { headers } from 'next/headers'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    return children as React.ReactElement
  }

  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
