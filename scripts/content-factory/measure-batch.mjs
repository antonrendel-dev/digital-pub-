// Разовый замер частотности Вордстата по темам активного батча.
// Пишет wordstatVolume прямо в topics_*.json после каждого ответа — прогон
// длинный (квота 100 запросов/час), при обрыве уже снятое не теряется.
// Запуск: node measure-batch.mjs data/topics_2026-08-14.json

import fs from 'fs'
import { fetchWordstatVolume } from './lib/yandex.js'

const file = process.argv[2]
const SPACING_MS = 40_000 // 90 запросов/час — с запасом под квоту 100/час
const RETRY_WAIT_MS = 10 * 60_000
const MAX_RETRIES = 6

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const load = () => JSON.parse(fs.readFileSync(file, 'utf-8'))

const pending = load().topics.filter(
  (t) => t.approved && !t.published && typeof t.wordstatVolume !== 'number'
)
console.log(`[measure] К замеру: ${pending.length} тем`)

let done = 0
let failed = 0

for (const [i, target] of pending.entries()) {
  let volume = await fetchWordstatVolume(target.keyword)

  // Квота 100 запросов/час сбрасывается скользящим окном — ждём столько,
  // сколько нужно, а не отбраковываем тему из-за чужого прогона.
  for (let attempt = 1; volume === null && attempt <= MAX_RETRIES; attempt++) {
    console.log(`[measure] Пауза ${RETRY_WAIT_MS / 60000} мин (попытка ${attempt}) — похоже на квоту`)
    await sleep(RETRY_WAIT_MS)
    volume = await fetchWordstatVolume(target.keyword)
  }

  if (volume === null) {
    failed++
    console.log(`[measure] ${i + 1}/${pending.length} ✗ "${target.keyword}" — замер не удался`)
  } else {
    // Перечитываем файл перед записью: контент-завод по крону меняет published.
    const data = load()
    const row = data.topics.find((t) => t.id === target.id)
    if (row) row.wordstatVolume = volume
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
    done++
    console.log(`[measure] ${i + 1}/${pending.length} ✓ "${target.keyword}" — ${volume}/мес`)
  }

  if (i < pending.length - 1) await sleep(SPACING_MS)
}

console.log(`[measure] ВЕРДИКТ: снято ${done}, не удалось ${failed}, всего ${pending.length}`)
