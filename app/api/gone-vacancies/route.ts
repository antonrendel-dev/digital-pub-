import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { listedSince } from '@/lib/vacancy-lifecycle'

/**
 * Слаги вакансий, которым пора отдавать 410.
 *
 * Нужен посреднику: App Router не умеет задавать статус ответа из страницы,
 * а middleware не видит базу. Список короткий — на дату ввода это 160 слагов
 * при 1711 вакансиях — и обновляется раз в час.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
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
    const slugs = (result.docs as unknown as { slug: string | null }[])
      .map((doc) => doc.slug)
      .filter((slug): slug is string => Boolean(slug))

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
