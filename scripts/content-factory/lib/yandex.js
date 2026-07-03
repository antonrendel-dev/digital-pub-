// lib/yandex.ts
var YANDEX_SEARCH_API_KEY = process.env.YANDEX_SEARCH_API_KEY || ''
var YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID || ''
var YANDEX_WEBMASTER_TOKEN = process.env.YANDEX_WEBMASTER_TOKEN || ''
var WEBMASTER_USER_ID = process.env.YANDEX_WEBMASTER_USER_ID || '1225208489'
var WEBMASTER_HOST = process.env.YANDEX_WEBMASTER_HOST || 'https:d-pub.ru:443'
async function fetchWordstatKeywords(keyword, numPhrases = 20) {
  if (!YANDEX_SEARCH_API_KEY || !YANDEX_FOLDER_ID) {
    console.log(
      '[yandex] Wordstat: YANDEX_SEARCH_API_KEY / YANDEX_FOLDER_ID \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u044B, \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u044E'
    )
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
    console.warn(
      '[yandex] Wordstat \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D:',
      e.message
    )
    return []
  }
}
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
    console.warn(
      `[yandex] Wordstat volume \u0434\u043B\u044F "${keyword}" \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D:`,
      e.message
    )
    return 0
  }
}
async function fetchWebmasterQueries(limit = 100) {
  if (!YANDEX_WEBMASTER_TOKEN) {
    console.log(
      '[yandex] Webmaster: YANDEX_WEBMASTER_TOKEN \u043D\u0435 \u0437\u0430\u0434\u0430\u043D, \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u044E'
    )
    return []
  }
  try {
    const url = `https://api.webmaster.yandex.net/v4/user/${WEBMASTER_USER_ID}/hosts/${WEBMASTER_HOST}/search-queries/popular?order_by=TOTAL_SHOWS&query_indicator=TOTAL_SHOWS&query_indicator=TOTAL_CLICKS&limit=${limit}`
    const res = await fetch(url, { headers: { Authorization: `OAuth ${YANDEX_WEBMASTER_TOKEN}` } })
    if (!res.ok) throw new Error(`Webmaster HTTP ${res.status}`)
    const data = await res.json()
    return (data.queries ?? []).map((q) => ({
      query: q.query_text,
      shows: q.indicators.TOTAL_SHOWS ?? 0,
      clicks: q.indicators.TOTAL_CLICKS ?? 0,
    }))
  } catch (e) {
    console.warn(
      '[yandex] Webmaster \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D:',
      e.message
    )
    return []
  }
}
var RELEVANT_TERMS = [
  '\u0432\u0430\u043A\u0430\u043D',
  '\u0440\u0430\u0431\u043E\u0442',
  '\u0443\u0434\u0430\u043B',
  '\u0437\u0430\u0440\u043F\u043B\u0430\u0442',
  '\u0440\u0435\u0437\u044E\u043C\u0435',
  '\u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E',
  '\u0444\u0440\u0438\u043B\u0430\u043D\u0441',
  '\u043D\u0430\u0439\u043C',
  '\u043D\u0430\u043D\u044F',
  '\u0441\u043E\u0438\u0441\u043A\u0430\u0442',
  '\u0432\u0430\u043A\u0430\u043D\u0441',
  'digital',
  '\u0434\u0438\u0434\u0436\u0438\u0442\u0430\u043B',
  '\u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433',
  '\u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433',
  '\u0434\u0438\u0437\u0430\u0439\u043D',
  'smm',
  '\u0441\u043C\u043C',
  '\u0442\u0430\u0440\u0433\u0435\u0442',
  '\u043A\u043E\u043F\u0438\u0440\u0430\u0439\u0442',
  '\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A',
  '\u043A\u043E\u043D\u0442\u0435\u043D\u0442',
  '\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442',
  '\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440',
  '\u0434\u0438\u0440\u0435\u043A\u0442',
]
var DOMAIN_SPAM = /https?:|www\.|\S+\.(ru|su|com|net|org|io|me|ai|рф)\b/i
function isRelevantQuery(q) {
  if (DOMAIN_SPAM.test(q)) return false
  const lower = q.toLowerCase()
  return RELEVANT_TERMS.some((t) => lower.includes(t))
}
async function fetchWebmasterOpportunities(topN = 20) {
  const all = await fetchWebmasterQueries(100)
  return all
    .filter((q) => q.shows > 0 && isRelevantQuery(q.query))
    .sort((a, b) => {
      const gapA = a.shows - a.clicks * 5
      const gapB = b.shows - b.clicks * 5
      return gapB - gapA
    })
    .slice(0, topN)
}
export {
  fetchWebmasterOpportunities,
  fetchWebmasterQueries,
  fetchWordstatKeywords,
  fetchWordstatVolume,
}
