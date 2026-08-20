// Замер тем действующего батча через Вордстат.
//
// Банк Топвизора для этого не годится: там ключи, по которым нас уже видят, а темы
// батча аналитик придумывал сам — пересечение с банком нулевое, проверено 20.08.2026.
// Поэтому частотность собирается по самим темам.
//
// На каждую тему снимается текущий ключ и исходный (originalKeyword, если тему уже
// правили вслепую). Один запрос возвращает и частотность, и вложенные фразы с их
// частотами — из них потом и выбирается замена ключу, не попавшему в коридор.
//
// Квота Вордстата 100 запросов/час, спейсинг 40с. Пишет после каждого ключа.
//
// Запуск: node measure-topics.mjs [файл_тем]

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { fetchWordstatPhrase } from './lib/yandex.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(HERE, 'data')
const OUT = path.join(DATA, 'topic-pool.json')

const topicsFile =
  process.argv[2] ||
  path.join(
    DATA,
    fs
      .readdirSync(DATA)
      .filter((f) => f.startsWith('topics_') && f.endsWith('.json'))
      .sort()
      .pop()
  )

const SPACING_MS = 40_000
const RETRY_WAIT_MS = 10 * 60_000
const MAX_RETRIES = 6

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const raw = JSON.parse(fs.readFileSync(topicsFile, 'utf-8'))
const topics = (raw.topics || raw).filter((t) => t.approved && !t.published)

// Исходный ключ даёт более широкое семейство фраз, чем уже суженный текущий,
// поэтому меряем оба: выбор замены идёт по объединению вложенных.
const phrases = [...new Set(topics.flatMap((t) => [t.keyword, t.originalKeyword].filter(Boolean)))]

const state = fs.existsSync(OUT)
  ? JSON.parse(fs.readFileSync(OUT, 'utf-8'))
  : {
      source: 'wordstat',
      topicsFile: path.basename(topicsFile),
      startedAt: new Date().toISOString(),
      seeds: {},
    }

const pending = phrases.filter((p) => state.seeds[p] === undefined)
console.log(`[topics] Тем в очереди: ${topics.length}, фраз к замеру: ${pending.length}`)

for (const [i, phrase] of pending.entries()) {
  let done = false
  for (let attempt = 1; attempt <= MAX_RETRIES && !done; attempt++) {
    try {
      const { total, nested } = await fetchWordstatPhrase(phrase)
      state.seeds[phrase] = { volume: total, nested }
      state.updatedAt = new Date().toISOString()
      fs.writeFileSync(OUT, JSON.stringify(state, null, 2))
      console.log(
        `[topics] ${i + 1}/${pending.length} ✓ "${phrase}" — ${total}/мес, вложенных ${nested.length}`
      )
      done = true
    } catch (e) {
      console.error(
        `[topics] ${i + 1}/${pending.length} ✗ "${phrase}" (попытка ${attempt}/${MAX_RETRIES}): ${e.message}`
      )
      if (attempt < MAX_RETRIES) await sleep(RETRY_WAIT_MS)
    }
  }
  if (i < pending.length - 1) await sleep(SPACING_MS)
}

const inCorridor = topics.filter((t) => {
  const v = state.seeds[t.keyword]?.volume
  return typeof v === 'number' && v >= 300 && v <= 1000
}).length

console.log(
  `[topics] ВЕРДИКТ: замерено ${Object.keys(state.seeds).length} фраз, ` +
    `тем в коридоре 300-1000 по текущему ключу: ${inCorridor}/${topics.length}`
)
