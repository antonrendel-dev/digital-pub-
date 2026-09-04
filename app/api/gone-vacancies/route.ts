import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { listedSince } from '@/lib/vacancy-lifecycle'
import { cachedShard } from '@/lib/sitemap/cache'

/** Список меняется раз в сутки, а эндпоинт публичный: минута кэша снимает нагрузку с базы. */
const CACHE_TTL_MS = 60 * 1000

/**
 * Слаги вакансий, которым пора отдавать 410.
 *
 * Нужен посреднику: App Router не умеет задавать статус ответа из страницы,
 * а middleware не видит базу. Список короткий — на дату ввода это 160 слагов
 * при 1711 вакансиях — и обновляется раз в час.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function loadGoneSlugs(): Promise<string[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'posts',
    where: {
      status: { equals: 'published' },
      type: { equals: 'vacancy' },
      createdAt: { less_than: listedSince().toISOString() },
    },
    limit: 5000,
    depth: 0,
    select: { slug: true },
  })
  return (result.docs as unknown as { slug: string | null }[])
    .map((doc) => doc.slug)
    .filter((slug): slug is string => Boolean(slug))
}

export async function GET() {
  try {
    // Публичный маршрут без кэша в приложении — усилитель нагрузки на Postgres:
    // каждый хит был запросом с limit 5000. cachedShard при сбое базы отдаёт
    // прошлый удачный список, а не пустоту.
    const slugs = await cachedShard('gone-vacancies', loadGoneSlugs, CACHE_TTL_MS)

    return NextResponse.json(
      { slugs },
      { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } }
    )
  } catch {
    // Пустой список безопаснее ошибки: посредник просто никого не отсеет,
    // и сайт продолжит отвечать как раньше.
    console.warn('[gone-vacancies] DB unavailable')
    return NextResponse.json({ slugs: [] }, { status: 200 })
  }
}
