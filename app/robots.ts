import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  if (process.env.PAYLOAD_PUSH_DB) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }

  return {
    rules: [
      // ?page= намеренно не закрыт: страницы пагинации отдают noindex, follow,
      // а Disallow помешал бы роботу его увидеть и пройти по ссылкам вглубь.
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/zp-redirect'],
      },
      {
        userAgent: 'YandexBot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/zp-redirect'],
      },
    ],
    sitemap: [
      'https://d-pub.ru/sitemap/0.xml',
      'https://d-pub.ru/sitemap/1.xml',
      'https://d-pub.ru/sitemap/2.xml',
    ],
  }
}
