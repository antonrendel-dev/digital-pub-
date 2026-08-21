// warm-lsi-cache.ts
import fs2 from 'fs'
import path2 from 'path'

// lib/lsi-cache.ts
import fs from 'fs'
import path from 'path'
var MAX_CACHE_AGE_DAYS = 180
var normalizeKey = (s) =>
  s
    .toLowerCase()
    .replace(/ё/g, '\u0435')
    .replace(/[^а-яa-z0-9]+/g, ' ')
    .trim()
function isFresh(measuredAt, now, maxAgeDays) {
  if (!measuredAt) return false
  const at = new Date(measuredAt)
  if (Number.isNaN(at.getTime())) return false
  return (now.getTime() - at.getTime()) / 864e5 <= maxAgeDays
}
function readStore(file) {
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    console.warn(
      `[lsi-cache] \u0411\u0438\u0442\u044B\u0439 \u0444\u0430\u0439\u043B \u0437\u0430\u043C\u0435\u0440\u043E\u0432, \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u044E: ${file}`
    )
    return null
  }
}
function lookupPhrases(
  files,
  keyword,
  now = /* @__PURE__ */ new Date(),
  maxAgeDays = MAX_CACHE_AGE_DAYS
) {
  const target = normalizeKey(keyword)
  for (const file of files) {
    const store = readStore(file)
    if (!store?.seeds) continue
    const fileDate = store.updatedAt ?? store.snapshotDate
    for (const [seed, data] of Object.entries(store.seeds)) {
      if (normalizeKey(seed) !== target) continue
      const nested = (data.nested ?? []).filter((n) => n.count > 0)
      if (!nested.length) break
      if (!isFresh(data.measuredAt ?? fileDate, now, maxAgeDays)) break
      return { nested, source: path.basename(file) }
    }
  }
  return null
}
function savePhrases(file, keyword, nested, now = /* @__PURE__ */ new Date()) {
  if (!nested.length) return
  const store = readStore(file) ?? {}
  const seeds = store.seeds ?? {}
  seeds[keyword] = { nested, measuredAt: now.toISOString() }
  fs.writeFileSync(
    file,
    JSON.stringify({ ...store, seeds, updatedAt: now.toISOString() }, null, 2),
    'utf-8'
  )
}

// lib/yandex.js
var YANDEX_SEARCH_API_KEY = process.env.YANDEX_SEARCH_API_KEY || ''
var YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID || ''
var YANDEX_WEBMASTER_TOKEN = process.env.YANDEX_WEBMASTER_TOKEN || ''
var WEBMASTER_USER_ID = process.env.YANDEX_WEBMASTER_USER_ID || '1225208489'
var WEBMASTER_HOST = process.env.YANDEX_WEBMASTER_HOST || 'https:d-pub.ru:443'
async function fetchWordstatPhrase(keyword, numPhrases = 20) {
  if (!YANDEX_SEARCH_API_KEY || !YANDEX_FOLDER_ID) {
    console.log(
      '[yandex] Wordstat: YANDEX_SEARCH_API_KEY / YANDEX_FOLDER_ID \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u044B, \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u044E'
    )
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
      console.warn(
        `[yandex] Wordstat: \u043A\u0432\u043E\u0442\u0430 \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D\u0430 \u043D\u0430 "${keyword}"`
      )
      return { total: null, nested: [] }
    }
    if (!res.ok) throw new Error(`Wordstat HTTP ${res.status}`)
    const data = await res.json()
    return {
      // results[0].count — частотность вложенной фразы, а не запрошенной,
      // подставлять её вместо totalCount нельзя.
      total: data.totalCount === void 0 ? 0 : Number(data.totalCount),
      nested: (data.results ?? []).map((r) => ({ phrase: r.phrase, count: Number(r.count) })),
    }
  } catch (e) {
    console.warn(
      `[yandex] Wordstat \u0434\u043B\u044F "${keyword}" \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D:`,
      e.message
    )
    return { total: null, nested: [] }
  }
}
async function fetchWordstatKeywords(keyword, numPhrases = 20) {
  return (await fetchWordstatPhrase(keyword, numPhrases)).nested
}

// warm-lsi-cache.ts
var DATA_DIR = path2.join(import.meta.dirname, 'data')
var CACHE = path2.join(DATA_DIR, 'lsi-cache.json')
var SOURCES = [
  CACHE,
  path2.join(DATA_DIR, 'topic-pool.json'),
  path2.join(DATA_DIR, 'semantics-volumes.json'),
]
var SPACING_MS = 4e4
var topicsFile = path2.join(DATA_DIR, process.argv[2] ?? 'topics_2026-08-14.json')
var { topics: all } = JSON.parse(fs2.readFileSync(topicsFile, 'utf-8'))
var topics = all.filter((t) => t.approved !== false && !t.published)
var missing = topics.filter((t) => !lookupPhrases(SOURCES, t.keyword))
console.log(
  `[warm] \u0422\u0435\u043C \u0436\u0438\u0432\u044B\u0445: ${topics.length}, \u0443\u0436\u0435 \u0432 \u0437\u0430\u043C\u0435\u0440\u0430\u0445: ${topics.length - missing.length}`
)
console.log(
  `[warm] \u041D\u0430 \u043F\u0440\u043E\u0433\u0440\u0435\u0432: ${missing.length}, ~${Math.round((missing.length * SPACING_MS) / 6e4)} \u043C\u0438\u043D`
)
var warmed = 0
var empty = 0
var failed = 0
for (const [i, topic] of missing.entries()) {
  try {
    const nested = (await fetchWordstatKeywords(topic.keyword, 20)).filter((n) => n.count > 0)
    if (nested.length) {
      savePhrases(CACHE, topic.keyword, nested)
      warmed++
      console.log(
        `[warm] ${i + 1}/${missing.length} "${topic.keyword}" \u2014 ${nested.length} \u0444\u0440\u0430\u0437`
      )
    } else {
      empty++
      console.log(
        `[warm] ${i + 1}/${missing.length} "${topic.keyword}" \u2014 \u043F\u0443\u0441\u0442\u043E`
      )
    }
  } catch (e) {
    failed++
    const reason = e instanceof Error ? e.message : String(e)
    console.log(
      `[warm] ${i + 1}/${missing.length} "${topic.keyword}" \u2014 \u041E\u0428\u0418\u0411\u041A\u0410: ${reason}`
    )
  }
  if (i < missing.length - 1) await new Promise((r) => setTimeout(r, SPACING_MS))
}
var stillMissing = topics.filter((t) => !lookupPhrases(SOURCES, t.keyword))
console.log(`
[warm] \u0418\u0422\u041E\u0413: \u043F\u0440\u043E\u0433\u0440\u0435\u0442\u043E ${warmed}, \u043F\u0443\u0441\u0442\u043E ${empty}, \u043E\u0448\u0438\u0431\u043E\u043A ${failed}`)
console.log(
  `[warm] \u041F\u043E\u043A\u0440\u044B\u0442\u0438\u0435 \u0431\u0430\u0442\u0447\u0430: ${topics.length - stillMissing.length}/${topics.length}`
)
stillMissing.forEach((t) =>
  console.log(
    `[warm]   \u0431\u0435\u0437 \u0437\u0430\u043C\u0435\u0440\u043E\u0432: ${t.keyword}`
  )
)
var code = failed > 0 ? 1 : 0
console.log(`[warm] EXIT=${code}`)
process.exit(code)
