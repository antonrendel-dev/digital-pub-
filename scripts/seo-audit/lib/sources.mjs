// Сбор SEO-данных d-pub.ru напрямую из API (Топвизор, Вебмастер, Метрика).
// Ключи берём из .env скилла seo-data-sources — там же, где их читают ручные скрипты.
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const ENV_PATH = join(homedir(), '.claude', 'skills', 'seo-data-sources', '.env')
const TIMEOUT_MS = 30_000

export function loadEnv() {
  const out = {}
  for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

// Каждый источник возвращает {ok, data} либо {ok: false, error} — один упавший
// источник не должен отменять весь отчёт.
async function guard(fn) {
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

const TOPVISOR_USER_ID = '503425'
const TOPVISOR_PROJECT_ID = 29110027
const TOPVISOR_REGION_INDEX = 5 // Яндекс Москва

async function topvisorCall(env, method, body) {
  const data = await fetchJson(`https://api.topvisor.com/v2/json/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `bearer ${env.TOPVISOR_API_KEY}`,
      'User-Id': TOPVISOR_USER_ID,
    },
    body: JSON.stringify(body),
  })
  if (data.errors?.length) throw new Error(JSON.stringify(data.errors[0]))
  return data.result
}

export function collectTopvisor(env) {
  return guard(async () => {
    const summary = await topvisorCall(env, 'get/positions_2/summary', {
      project_id: TOPVISOR_PROJECT_ID,
      region_index: TOPVISOR_REGION_INDEX,
      dates: ['2025-01-01', new Date().toISOString().split('T')[0]],
    })
    const checkDate = summary?.dates?.at(-1)
    if (!checkDate) throw new Error('нет снятых позиций в проекте')

    const history = await topvisorCall(env, 'get/positions_2/history', {
      project_id: TOPVISOR_PROJECT_ID,
      regions_indexes: [TOPVISOR_REGION_INDEX],
      date1: checkDate,
      date2: checkDate,
    })

    const positions = {}
    for (const k of history.keywords ?? []) {
      let pos = null
      for (const v of Object.values(k.positionsData ?? {})) {
        const raw = v?.position
        if (raw && raw !== '--') pos = parseInt(raw)
      }
      positions[k.name] = pos
    }

    // Целевой URL — наша гипотеза «какая страница должна отвечать». Без неё
    // расхождение с выдачей увидеть нечем: 30.08.2026 так и выяснилось, что
    // срезы «спец × удалёнка» проигрывают родительским категориям.
    const keywords = await topvisorCall(env, 'get/keywords_2/keywords', {
      project_id: TOPVISOR_PROJECT_ID,
      fields: ['id', 'name', 'target'],
      limit: 2000,
    })
    const targets = {}
    for (const k of keywords ?? []) {
      if (k.target) targets[k.name] = k.target
    }

    const all = Object.values(positions)
    const within = (n) => all.filter((p) => p !== null && p <= n).length
    return {
      checkDate,
      targets,
      total: all.length,
      top3: within(3),
      top10: within(10),
      top30: within(30),
      top100: within(100),
      positions,
    }
  })
}

const WEBMASTER_USER_ID = '1225208489'
const WEBMASTER_HOST = 'https:d-pub.ru:443'

export function collectWebmaster(env) {
  return guard(async () => {
    const url =
      `https://api.webmaster.yandex.net/v4/user/${WEBMASTER_USER_ID}/hosts/${WEBMASTER_HOST}` +
      `/search-queries/popular?order_by=TOTAL_SHOWS` +
      `&query_indicator=TOTAL_SHOWS&query_indicator=TOTAL_CLICKS&limit=100`
    const data = await fetchJson(url, {
      headers: { Authorization: `OAuth ${env.YANDEX_WEBMASTER_TOKEN}` },
    })
    const queries = (data.queries ?? []).map((q) => ({
      query: q.query_text,
      shows: q.indicators.TOTAL_SHOWS ?? 0,
      clicks: q.indicators.TOTAL_CLICKS ?? 0,
    }))
    // Какую страницу Яндекс считает ответом на запрос. Отдаёт только POST
    // query-analytics/list с text_indicator QUERY — URL приходит в
    // popular_complementary_indicator. GET search-queries/popular страниц не даёт.
    const pages = {}
    try {
      for (let offset = 0; ; offset += 500) {
        const res = await fetch(
          `https://api.webmaster.yandex.net/v4/user/${WEBMASTER_USER_ID}/hosts/${WEBMASTER_HOST}/query-analytics/list`,
          {
            method: 'POST',
            headers: {
              Authorization: `OAuth ${env.YANDEX_WEBMASTER_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              offset,
              limit: 500,
              device_type_indicator: 'ALL',
              text_indicator: 'QUERY',
            }),
          }
        )
        const d = await res.json()
        const rows = d.text_indicator_to_statistics ?? []
        for (const row of rows) {
          const q = row.text_indicator?.value
          const url = row.popular_complementary_indicator?.value
          if (!q || !url) continue
          const shows = (row.statistics ?? [])
            .filter((x) => x.field === 'IMPRESSIONS')
            .reduce((a, x) => a + x.value, 0)
          pages[q] = { url, shows: Math.round(shows) }
        }
        if (rows.length < 500 || offset + 500 >= (d.count ?? 0)) break
      }
    } catch {
      // Связки — приятное дополнение, а не основа отчёта: без них аудит
      // отработает по остальным сигналам, а не свалится целиком.
    }

    return {
      queries,
      pages,
      totalShows: queries.reduce((s, q) => s + q.shows, 0),
      totalClicks: queries.reduce((s, q) => s + q.clicks, 0),
    }
  })
}

const METRIKA_COUNTER = '109131123'

async function metrikaReport(env, days, params) {
  const url = new URL('https://api-metrika.yandex.net/stat/v1/data')
  url.searchParams.set('ids', METRIKA_COUNTER)
  url.searchParams.set('date1', `${days}daysAgo`)
  url.searchParams.set('date2', 'today')
  url.searchParams.set('accuracy', 'full')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return fetchJson(url, { headers: { Authorization: `OAuth ${env.YANDEX_METRIKA_TOKEN}` } })
}

/**
 * Статьи: как их читают и где они стоят.
 *
 * Два окна намеренно разные. Позиции живут в общем окне отчёта — они меняются
 * быстро. Чтение считается за девяносто дней: за две недели у статьи набегает
 * два-три визита, и вердикт «не читают» описывал бы двух случайных людей,
 * а не статью.
 *
 * Глубина чтения — доля от времени, которое нужно на прочтение. Само по себе
 * время бесполезно: две минуты на статье в пять тысяч знаков и в двадцать
 * тысяч означают противоположное.
 */
const READ_WINDOW_DAYS = 90
const MIN_VISITS = 5
/** Знаков в минуту при беглом чтении русского текста средней сложности. */
const CHARS_PER_MINUTE = 1200
/** Ниже этого времени читать нечего при любой длине статьи. */
const NOT_READ_SECONDS = 30

/**
 * Лучшая позиция каждой статьи: у страницы обычно несколько ключей, и важен
 * тот, по которому она стоит выше всего, — именно он приводит людей.
 */
export function bestPositionByPage(topvisor) {
  const best = new Map()
  if (!topvisor?.positions || !topvisor?.targets) return best
  for (const [keyword, position] of Object.entries(topvisor.positions)) {
    if (position === null) continue
    const target = topvisor.targets[keyword]
    if (!target) continue
    const path = String(target).replace('https://d-pub.ru', '').replace(/\/$/, '')
    const current = best.get(path)
    if (current === undefined || position < current) best.set(path, position)
  }
  return best
}

export function collectArticles(env, articleLengths, articlePositions) {
  return guard(async () => {
    const report = await metrikaReport(env, READ_WINDOW_DAYS, {
      metrics: 'ym:s:visits,ym:s:avgVisitDurationSeconds',
      dimensions: 'ym:s:startURLPathFull',
      filters: "ym:s:startURLPathFull=@'/articles/'",
      limit: '200',
      sort: '-ym:s:visits',
    })

    const rows = []
    for (const row of report.data ?? []) {
      const slug = String(row.dimensions[0].name).replace('/articles/', '').replace(/\/$/, '')
      const chars = articleLengths.get(slug)
      if (!chars) continue
      const [visits, seconds] = row.metrics
      if (visits < MIN_VISITS) continue

      const expected = (chars / CHARS_PER_MINUTE) * 60
      const share = expected > 0 ? seconds / expected : 0
      const position = articlePositions.get(`/articles/${slug}`) ?? null
      rows.push({
        slug,
        visits,
        seconds: Math.round(seconds),
        expectedSeconds: Math.round(expected),
        share,
        position,
        // Доля выше единицы означает, что человек ушёл со статьи дальше по
        // сайту: считается время визита, а не страницы. Эталоном такое брать
        // нельзя, поэтому помечаем отдельно.
        leftPage: share > 1,
      })
    }

    return {
      windowDays: READ_WINDOW_DAYS,
      minVisits: MIN_VISITS,
      notReadSeconds: NOT_READ_SECONDS,
      rows,
    }
  })
}

export function collectMetrika(env, days) {
  return guard(async () => {
    const totals = await metrikaReport(env, days, {
      metrics: 'ym:s:visits,ym:s:users,ym:s:pageviews,ym:s:bounceRate,ym:s:avgVisitDurationSeconds',
    })
    const t = Array.isArray(totals.totals?.[0]) ? totals.totals[0] : totals.totals
    const [visits, users, pageviews, bounceRate, avgDuration] = t ?? []

    const sources = await metrikaReport(env, days, {
      metrics: 'ym:s:visits,ym:s:bounceRate',
      dimensions: 'ym:s:lastTrafficSource',
      sort: '-ym:s:visits',
    })
    const bySource = (sources.data ?? []).map((r) => ({
      source: r.dimensions[0].name,
      visits: r.metrics[0],
      bounceRate: r.metrics[1],
    }))
    const search = bySource.find((s) => /search engine/i.test(s.source))

    const pages = await metrikaReport(env, days, {
      metrics: 'ym:pv:pageviews',
      dimensions: 'ym:pv:URLPath',
      limit: '30',
      sort: '-ym:pv:pageviews',
    })

    return {
      days,
      visits,
      users,
      pageviews,
      bounceRate,
      avgDuration,
      searchVisits: search?.visits ?? 0,
      searchBounceRate: search?.bounceRate ?? null,
      sources: bySource,
      topPages: (pages.data ?? []).map((r) => ({
        path: r.dimensions[0].name,
        pageviews: r.metrics[0],
      })),
    }
  })
}
