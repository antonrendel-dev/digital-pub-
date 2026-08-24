'use strict'
// Shared Yandex Cloud API helpers — Wordstat v2 (Cloud SearchAPI) + Webmaster v4
// Wordstat: реальная частотность запросов для приоритизации тем и подбора LSI
// Webmaster: обратная связь — запросы, где сайт уже показывается, но не в топе
Object.defineProperty(exports, '__esModule', { value: true })
exports.fetchWordstatKeywords = fetchWordstatKeywords
exports.fetchWordstatVolume = fetchWordstatVolume
exports.fetchWebmasterQueries = fetchWebmasterQueries
exports.fetchWebmasterOpportunities = fetchWebmasterOpportunities
const YANDEX_SEARCH_API_KEY = process.env.YANDEX_SEARCH_API_KEY || ''
const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID || ''
const YANDEX_WEBMASTER_TOKEN = process.env.YANDEX_WEBMASTER_TOKEN || ''
const WEBMASTER_USER_ID = process.env.YANDEX_WEBMASTER_USER_ID || '1225208489'
const WEBMASTER_HOST = process.env.YANDEX_WEBMASTER_HOST || 'https:d-pub.ru:443'
async function fetchWordstatKeywords(keyword, numPhrases = 20) {
  if (!YANDEX_SEARCH_API_KEY || !YANDEX_FOLDER_ID) {
    console.log('[yandex] Wordstat: YANDEX_SEARCH_API_KEY / YANDEX_FOLDER_ID не заданы, пропускаю')
    return []
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
    if (!res.ok) throw new Error(`Wordstat HTTP ${res.status}`)
    const data = await res.json()
    return (data.results ?? []).map((r) => ({ phrase: r.phrase, count: Number(r.count) }))
  } catch (e) {
    console.warn('[yandex] Wordstat недоступен:', e.message)
    return []
  }
}
// Суммарная частотность фразы (broad match) — для приоритизации тем по спросу
async function fetchWordstatVolume(keyword) {
  if (!YANDEX_SEARCH_API_KEY || !YANDEX_FOLDER_ID) return 0
  try {
    const res = await fetch('https://searchapi.api.cloud.yandex.net/v2/wordstat/topRequests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Api-Key ${YANDEX_SEARCH_API_KEY}`,
        'X-Folder-Id': YANDEX_FOLDER_ID,
      },
      body: JSON.stringify({ phrase: keyword, num_phrases: 1 }),
    })
    if (!res.ok) throw new Error(`Wordstat HTTP ${res.status}`)
    const data = await res.json()
    if (data.totalCount) return Number(data.totalCount)
    return data.results?.[0] ? Number(data.results[0].count) : 0
  } catch (e) {
    console.warn(`[yandex] Wordstat volume для "${keyword}" недоступен:`, e.message)
    return 0
  }
}
// Популярные запросы, по которым сайт уже показывается в выдаче Яндекса
async function fetchWebmasterQueries(limit = 100) {
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
    const data = await res.json()
    return (data.queries ?? []).map((q) => ({
      query: q.query_text,
      shows: q.indicators.TOTAL_SHOWS ?? 0,
      clicks: q.indicators.TOTAL_CLICKS ?? 0,
    }))
  } catch (e) {
    console.warn('[yandex] Webmaster недоступен:', e.message)
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
function isRelevantQuery(q) {
  if (DOMAIN_SPAM.test(q)) return false
  const lower = q.toLowerCase()
  return RELEVANT_TERMS.some((t) => lower.includes(t))
}
// Запросы-возможности: сайт показывается (shows > 0), но кликов мало/нет → писать под них
async function fetchWebmasterOpportunities(topN = 20) {
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
