import { renderSitemapIndex } from '@/lib/sitemap/shards'

// Тот же цикл, что у самих шардов: индекс не должен обещать свежесть,
// которой у шардов нет.
export const revalidate = 600

export async function GET() {
  return new Response(renderSitemapIndex(new Date()), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
