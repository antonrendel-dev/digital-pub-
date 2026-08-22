import type { MetadataRoute } from 'next'
import { SITEMAP_BASE_URL } from '@/lib/sitemap/shards'

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
    // Один вход вместо перечня шардов: список живёт в lib/sitemap/shards.ts,
    // и добавление шарда больше не требует правки robots.
    sitemap: `${SITEMAP_BASE_URL}/sitemap_index.xml`,
  }
}
