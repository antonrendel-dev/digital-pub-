import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  if (process.env.PAYLOAD_PUSH_DB) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        userAgent: 'YandexBot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/*?page='],
      },
    ],
    sitemap: [
      'https://d-pub.ru/sitemap/0.xml',
      'https://d-pub.ru/sitemap/1.xml',
      'https://d-pub.ru/sitemap/2.xml',
    ],
  }
}
