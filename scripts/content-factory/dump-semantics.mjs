// Выгрузка семантики Топвизора в память контент-завода.
// Агенты завода читают data/topvisor-semantics.json, а не ходят в API на каждую тему.
// Запуск после каждого съёма позиций: node dump-semantics.mjs

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(HERE, 'data', 'topvisor-semantics.json')
const ENV = '/home/claude/.claude/skills/seo-data-sources/.env'

const USER_ID = '503425'
const PROJECT_ID = 29110027
const REGION_INDEX = 5 // Яндекс Москва

const apiKey = (fs.readFileSync(ENV, 'utf8').match(/^TOPVISOR_API_KEY=(.*)$/m) || [])[1]?.trim()
if (!apiKey) {
  console.error(`[semantics] TOPVISOR_API_KEY не найден в ${ENV}`)
  process.exit(1)
}

async function tv(method, body) {
  const res = await fetch(`https://api.topvisor.com/v2/json/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `bearer ${apiKey}`,
      'User-Id': USER_ID,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.errors?.length) throw new Error(JSON.stringify(data.errors[0]))
  return data.result
}

const summary = await tv('get/positions_2/summary', {
  project_id: PROJECT_ID,
  region_index: REGION_INDEX,
  dates: ['2025-01-01', new Date().toISOString().split('T')[0]],
})
const snapshotDate = summary?.dates?.at(-1)
if (!snapshotDate) {
  console.error('[semantics] Съёмов позиций нет — topvisor.com → D-PUB → «Снять позиции»')
  process.exit(1)
}

// relevant_url приходит только если запросить его явно — без positions_fields
// Топвизор отдаёт одну позицию, и карту «ключ → своя посадочная» не собрать.
const history = await tv('get/positions_2/history', {
  project_id: PROJECT_ID,
  regions_indexes: [REGION_INDEX],
  date1: snapshotDate,
  date2: snapshotDate,
  positions_fields: ['position', 'relevant_url'],
})

const keywords = (history.keywords ?? []).map((k) => {
  let position = null
  let relevantUrl = ''
  for (const v of Object.values(k.positionsData ?? {})) {
    if (v?.position && v.position !== '--') position = parseInt(v.position)
    if (v?.relevantUrl || v?.relevant_url) relevantUrl = v.relevantUrl || v.relevant_url
  }
  return { keyword: k.name, position, relevantUrl }
})

keywords.sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999))

const ranked = keywords.filter((k) => k.position !== null)
fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      source: 'topvisor',
      projectId: PROJECT_ID,
      regionIndex: REGION_INDEX,
      snapshotDate,
      fetchedAt: new Date().toISOString(),
      total: keywords.length,
      keywords,
    },
    null,
    2
  )
)

console.log(
  `[semantics] ВЕРДИКТ: ${keywords.length} ключей на ${snapshotDate} → ${path.relative(HERE, OUT)}\n` +
    `[semantics] с позицией ≤100: ${ranked.length}, топ-30: ${ranked.filter((k) => k.position <= 30).length}, ` +
    `вне топ-100: ${keywords.length - ranked.length}`
)
