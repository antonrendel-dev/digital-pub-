// Разовый прогрев кэша фраз Вордстата под живые темы батча.
// Утренняя публикация читает кэш первым, поэтому прогретый ключ снимает
// зависимость прогона в 08:00 от живого API.
//
// Запуск: set -a && source /opt/bots/content-factory/.env && set +a
//         node warm-lsi-cache.compiled.js [файл_тем]

import fs from 'fs'
import path from 'path'
import { lookupPhrases, savePhrases } from './lib/lsi-cache.js'
import { fetchWordstatKeywords } from './lib/yandex.js'

const DATA_DIR = path.join(import.meta.dirname, 'data')
const CACHE = path.join(DATA_DIR, 'lsi-cache.json')
const SOURCES = [
  CACHE,
  path.join(DATA_DIR, 'topic-pool.json'),
  path.join(DATA_DIR, 'semantics-volumes.json'),
]

// Квота Вордстата — 100 запросов в час.
const SPACING_MS = 40_000

interface BatchTopic {
  keyword: string
  approved?: boolean
  published?: boolean
}

const topicsFile = path.join(DATA_DIR, process.argv[2] ?? 'topics_2026-08-14.json')
const { topics: all } = JSON.parse(fs.readFileSync(topicsFile, 'utf-8')) as { topics: BatchTopic[] }
const topics = all.filter((t) => t.approved !== false && !t.published)

const missing = topics.filter((t) => !lookupPhrases(SOURCES, t.keyword))
console.log(`[warm] Тем живых: ${topics.length}, уже в замерах: ${topics.length - missing.length}`)
console.log(
  `[warm] На прогрев: ${missing.length}, ~${Math.round((missing.length * SPACING_MS) / 60000)} мин`
)

let warmed = 0
let empty = 0
let failed = 0

for (const [i, topic] of missing.entries()) {
  try {
    const nested = (await fetchWordstatKeywords(topic.keyword, 20)).filter((n) => n.count > 0)
    if (nested.length) {
      savePhrases(CACHE, topic.keyword, nested)
      warmed++
      console.log(`[warm] ${i + 1}/${missing.length} "${topic.keyword}" — ${nested.length} фраз`)
    } else {
      empty++
      console.log(`[warm] ${i + 1}/${missing.length} "${topic.keyword}" — пусто`)
    }
  } catch (e) {
    failed++
    const reason = e instanceof Error ? e.message : String(e)
    console.log(`[warm] ${i + 1}/${missing.length} "${topic.keyword}" — ОШИБКА: ${reason}`)
  }
  if (i < missing.length - 1) await new Promise((r) => setTimeout(r, SPACING_MS))
}

const stillMissing = topics.filter((t) => !lookupPhrases(SOURCES, t.keyword))
console.log(`\n[warm] ИТОГ: прогрето ${warmed}, пусто ${empty}, ошибок ${failed}`)
console.log(`[warm] Покрытие батча: ${topics.length - stillMissing.length}/${topics.length}`)
stillMissing.forEach((t) => console.log(`[warm]   без замеров: ${t.keyword}`))

const code = failed > 0 ? 1 : 0
console.log(`[warm] EXIT=${code}`)
process.exit(code)
