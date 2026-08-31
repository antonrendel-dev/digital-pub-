import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Вакансии старше девяноста дней отвечают 410 Gone.
 *
 * App Router не даёт задать статус ответа из страницы, поэтому решение
 * принимается здесь. База отсюда не видна, зато виден собственный эндпоинт
 * со списком слагов — он короткий и обновляется раз в час, так что проверка
 * стоит одно обращение к множеству в памяти.
 *
 * Любая осечка на стороне списка означает «никого не отсеиваем»: неверно
 * отданный 410 стоит дороже, чем не отданный вовремя.
 */
const GONE_TTL_MS = 60 * 60 * 1000
const VACANCY_PATH = /^\/vacancies\/[^/]+\/([^/]+)\/?$/

/**
 * По этому же адресу живут срезы «специализация × фильтр» — они не вакансии
 * и проверять их незачем. Список короткий и меняется вместе с FORMAT_SLUGS
 * и LEVEL_SLUGS в lib/spec-filter-meta; страж держит их в согласии.
 */
const FILTER_SLUGS = new Set(['udalyonka', 'ofis', 'gibrid', 'junior', 'middle', 'senior'])

let goneSlugs: Set<string> = new Set()
let fetchedAt = 0
let inFlight: Promise<void> | null = null
let lastError = 'none'

async function refreshGoneSlugs(origin: string): Promise<void> {
  if (Date.now() - fetchedAt < GONE_TTL_MS) return
  if (inFlight) return inFlight
  inFlight = (async () => {
    // За прокси nextUrl.origin — это внутренний адрес контейнера, и запрос
    // по нему до приложения не доходит. Берём публичный адрес из окружения,
    // origin оставляем запасным вариантом для локальной разработки.
    const base = process.env.NEXT_PUBLIC_SERVER_URL || origin
    try {
      const res = await fetch(`${base}/api/gone-vacancies`, { cache: 'no-store' })
      if (!res.ok) {
        lastError = `http-${res.status}`
        return
      }
      const data = (await res.json()) as { slugs?: string[] }
      goneSlugs = new Set(data.slugs ?? [])
      fetchedAt = Date.now()
      lastError = 'none'
    } catch (err) {
      lastError = err instanceof Error ? err.name : 'unknown'
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

export async function middleware(request: NextRequest) {
  const match = VACANCY_PATH.exec(request.nextUrl.pathname)
  if (match) {
    const slug = decodeURIComponent(match[1])
    if (FILTER_SLUGS.has(slug)) return withPushHeader(NextResponse.next())
    await refreshGoneSlugs(request.nextUrl.origin)
    if (!goneSlugs.has(slug)) {
      // Диагностика: без неё непонятно, дошёл ли запрос до посредника и
      // добрался ли тот до списка. Заголовок дешёвый и не виден посетителю.
      const response = NextResponse.next()
      response.headers.set('X-Gone-Check', `${goneSlugs.size}/${lastError}`)
      return withPushHeader(response)
    }
    {
      return new NextResponse(
        `<!doctype html><html lang="ru"><head><meta charset="utf-8">` +
          `<meta name="robots" content="noindex, follow">` +
          `<title>Вакансия снята с публикации — Диджитал Паб</title></head>` +
          `<body><h1>Вакансия снята с публикации</h1>` +
          `<p>Объявление старше трёх месяцев и больше не актуально. ` +
          `<a href="/vacancies">Смотреть свежие вакансии</a>.</p></body></html>`,
        {
          status: 410,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Robots-Tag': 'noindex, follow',
            'Cache-Control': 'public, max-age=3600',
          },
        }
      )
    }
  }

  return withPushHeader(NextResponse.next())
}

/** Заливка боевой базы из админки не должна попадать в индекс. */
function withPushHeader(response: NextResponse): NextResponse {
  if (process.env.PAYLOAD_PUSH_DB) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
