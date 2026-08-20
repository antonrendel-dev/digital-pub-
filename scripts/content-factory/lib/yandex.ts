// Shared Yandex Cloud API helpers — Wordstat v2 (Cloud SearchAPI) + Webmaster v4
// Wordstat: реальная частотность запросов для приоритизации тем и подбора LSI
// Webmaster: обратная связь — запросы, где сайт уже показывается, но не в топе

const YANDEX_SEARCH_API_KEY = process.env.YANDEX_SEARCH_API_KEY || ''
const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID || ''
const YANDEX_WEBMASTER_TOKEN = process.env.YANDEX_WEBMASTER_TOKEN || ''
const WEBMASTER_USER_ID = process.env.YANDEX_WEBMASTER_USER_ID || '1225208489'
const WEBMASTER_HOST = process.env.YANDEX_WEBMASTER_HOST || 'https:d-pub.ru:443'

// ─── Wordstat v2 ──────────────────────────────────────────────────────────────

export interface WordstatEntry {
  phrase: string
  count: number
}

export interface WordstatPhrase {
  // Суммарная частотность запрошенной фразы (broad match).
  // null — Вордстат не ответил (квота, сеть). 0 — ответил, спроса нет.
  total: number | null
  // Вложенные фразы с собственными частотами: «резюме таргетолога» →
  // «резюме таргетолога образец», «резюме таргетолога без опыта» и так далее.
  nested: WordstatEntry[]
}

// Один запрос отдаёт и частотность самой фразы, и до 20 вложенных с частотами.
// Квота 100 запросов/час, поэтому брать оба ответа за один вызов — не оптимизация,
// а условие, при котором сбор пула вообще укладывается в разумное время.
export async function fetchWordstatPhrase(
  keyword: string,
  numPhrases = 20
): Promise<WordstatPhrase> {
  if (!YANDEX_SEARCH_API_KEY || !YANDEX_FOLDER_ID) {
    console.log('[yandex] Wordstat: YANDEX_SEARCH_API_KEY / YANDEX_FOLDER_ID не заданы, пропускаю')
    return { total: null, nested: [] }
  }
  try {
    const res = await fetch('https://searchapi.api.cloud.yandex.net/v2/wordstat/topRequests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Api-Key ${YANDEX_SEARCH_API_KEY}`,
        'X-Folder-Id': YANDEX_FOLDER_ID,
      },
      body: JSON.stringify({ phrase: keyword, num_phrases: numPhrases }),
    })
    if (res.status === 429) {
      console.warn(`[yandex] Wordstat: квота исчерпана на "${keyword}"`)
      return { total: null, nested: [] }
    }
    if (!res.ok) throw new Error(`Wordstat HTTP ${res.status}`)
    const data = (await res.json()) as {
      totalCount?: string
      results?: { phrase: string; count: string }[]
    }
    return {
      // results[0].count — частотность вложенной фразы, а не запрошенной,
      // подставлять её вместо totalCount нельзя.
      total: data.totalCount === undefined ? 0 : Number(data.totalCount),
      nested: (data.results ?? []).map((r) => ({ phrase: r.phrase, count: Number(r.count) })),
    }
  } catch (e) {
    console.warn(`[yandex] Wordstat для "${keyword}" недоступен:`, (e as Error).message)
    return { total: null, nested: [] }
  }
}

export async function fetchWordstatKeywords(
  keyword: string,
  numPhrases = 20
): Promise<WordstatEntry[]> {
  return (await fetchWordstatPhrase(keyword, numPhrases)).nested
}

export async function fetchWordstatVolume(keyword: string): Promise<number | null> {
  return (await fetchWordstatPhrase(keyword, 1)).total
}

// ─── Webmaster v4 ─────────────────────────────────────────────────────────────

export interface QueryStat {
  query: string
  shows: number
  clicks: number
}

// Популярные запросы, по которым сайт уже показывается в выдаче Яндекса
export async function fetchWebmasterQueries(limit = 100): Promise<QueryStat[]> {
  if (!YANDEX_WEBMASTER_TOKEN) {
    console.log('[yandex] Webmaster: YANDEX_WEBMASTER_TOKEN не задан, пропускаю')
    return []
  }
  try {
    const url =
      `https://api.webmaster.yandex.net/v4/user/${WEBMASTER_USER_ID}/hosts/${WEBMASTER_HOST}` +
      `/search-queries/popular?order_by=TOTAL_SHOWS` +
      `&query_indicator=TOTAL_SHOWS&query_indicator=TOTAL_CLICKS&limit=${limit}`
    const res = await fetch(url, { headers: { Authorization: `OAuth ${YANDEX_WEBMASTER_TOKEN}` } })
    if (!res.ok) throw new Error(`Webmaster HTTP ${res.status}`)
    const data = (await res.json()) as {
      queries?: { query_text: string; indicators: Record<string, number> }[]
    }
    return (data.queries ?? []).map((q) => ({
      query: q.query_text,
      shows: q.indicators.TOTAL_SHOWS ?? 0,
      clicks: q.indicators.TOTAL_CLICKS ?? 0,
    }))
  } catch (e) {
    console.warn('[yandex] Webmaster недоступен:', (e as Error).message)
    return []
  }
}

// Целевые термины job board — отсекаем поисковый шум (vpn, chatgpt, url-мусор)
const RELEVANT_TERMS = [
  'вакан',
  'работ',
  'удал',
  'зарплат',
  'резюме',
  'портфолио',
  'фриланс',
  'найм',
  'наня',
  'соискат',
  'ваканс',
  'digital',
  'диджитал',
  'маркетолог',
  'маркетинг',
  'дизайн',
  'smm',
  'смм',
  'таргет',
  'копирайт',
  'аналитик',
  'контент',
  'специалист',
  'менеджер',
  'директ',
]

// Домены и url-мусор в поисковых запросах — не наши целевые интенты
const DOMAIN_SPAM = /https?:|www\.|\S+\.(ru|su|com|net|org|io|me|ai|рф)\b/i

function isRelevantQuery(q: string): boolean {
  if (DOMAIN_SPAM.test(q)) return false
  const lower = q.toLowerCase()
  return RELEVANT_TERMS.some((t) => lower.includes(t))
}

// Запросы-возможности: сайт показывается (shows > 0), но кликов мало/нет → писать под них
export async function fetchWebmasterOpportunities(topN = 20): Promise<QueryStat[]> {
  const all = await fetchWebmasterQueries(100)
  return all
    .filter((q) => q.shows > 0 && isRelevantQuery(q.query))
    .sort((a, b) => {
      // приоритет: много показов + мало кликов = недобранный трафик
      const gapA = a.shows - a.clicks * 5
      const gapB = b.shows - b.clicks * 5
      return gapB - gapA
    })
    .slice(0, topN)
}
