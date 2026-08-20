// Разовый прогон банка семантики Топвизора через Вордстат.
//
// Берёт ключи, по которым мы не ранжируемся (вне топ-100), и снимает по каждому
// частотность плюс вложенные фразы с их частотами. Один запрос даёт и то, и другое,
// поэтому 582 ключа превращаются в пул на несколько тысяч фраз с готовыми цифрами.
//
// Аналитик потом выбирает темы из этого пула, а не выдумывает ключи и не проверяет
// их постфактум — попадание в коридор 300-1000 становится свойством выборки.
//
// Квота Вордстата 100 запросов/час, спейсинг 40с — прогон идёт около 6.5 часов.
// Пишет результат после каждого ключа: при обрыве снятое не теряется.
//
// Запуск: node measure-semantics.mjs [--all]
//   без флага — только ключи вне топ-100 (582)
//   --all     — все 687, включая ранжирующиеся

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { fetchWordstatPhrase } from './lib/yandex.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SEMANTICS = path.join(HERE, 'data', 'topvisor-semantics.json')
const OUT = path.join(HERE, 'data', 'semantics-volumes.json')

const ALL = process.argv.includes('--all')
const SPACING_MS = 40_000 // 90 запросов/час — с запасом под квоту 100/час
const RETRY_WAIT_MS = 10 * 60_000
const MAX_RETRIES = 6

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const semantics = JSON.parse(fs.readFileSync(SEMANTICS, 'utf-8'))
// Ранжирующиеся идут первыми: только у них есть посадочная, и только они попадают
// в STOP-лист и в цели дожима, то есть нужны ТЗ уже сегодня. Остальные — база под
// будущие темы, они могут подождать хвоста прогона.
const targets = semantics.keywords
  .filter((k) => ALL || k.position === null)
  .sort((a, b) => (a.position === null ? 1 : 0) - (b.position === null ? 1 : 0))

// Уже снятое подхватываем — прогон можно продолжить после обрыва.
const state = fs.existsSync(OUT)
  ? JSON.parse(fs.readFileSync(OUT, 'utf-8'))
  : { source: 'wordstat', snapshotDate: semantics.snapshotDate, startedAt: new Date().toISOString(), seeds: {} }

const pending = targets.filter((k) => state.seeds[k.keyword] === undefined)
console.log(
  `[volumes] Затравок всего ${targets.length}, уже снято ${targets.length - pending.length}, ` +
    `к замеру ${pending.length}. Ожидание ~${Math.round((pending.length * SPACING_MS) / 3_600_000)} ч`
)

let done = 0
let failed = 0
let phrases = 0

for (const [i, target] of pending.entries()) {
  let res = await fetchWordstatPhrase(target.keyword)

  // Квота сбрасывается скользящим окном — ждём, а не выбрасываем затравку.
  for (let attempt = 1; res.total === null && attempt <= MAX_RETRIES; attempt++) {
    console.log(`[volumes] Пауза ${RETRY_WAIT_MS / 60000} мин (попытка ${attempt}) — похоже на квоту`)
    await sleep(RETRY_WAIT_MS)
    res = await fetchWordstatPhrase(target.keyword)
  }

  if (res.total === null) {
    failed++
    console.log(`[volumes] ${i + 1}/${pending.length} ✗ "${target.keyword}" — замер не удался`)
  } else {
    state.seeds[target.keyword] = {
      volume: res.total,
      position: target.position,
      relevantUrl: target.relevantUrl,
      nested: res.nested,
    }
    state.updatedAt = new Date().toISOString()
    fs.writeFileSync(OUT, JSON.stringify(state, null, 2) + '\n')
    done++
    phrases += res.nested.length
    console.log(
      `[volumes] ${i + 1}/${pending.length} ✓ "${target.keyword}" — ${res.total}/мес, вложенных ${res.nested.length}`
    )
  }

  if (i < pending.length - 1) await sleep(SPACING_MS)
}

// Сколько всего фраз попало в коридор — ради этой цифры прогон и делается.
const MIN = 300
const MAX = 1000
const pool = new Map()
for (const [seed, data] of Object.entries(state.seeds)) {
  if (data.volume >= MIN && data.volume <= MAX) pool.set(seed, data.volume)
  for (const n of data.nested) {
    if (n.count >= MIN && n.count <= MAX) pool.set(n.phrase, n.count)
  }
}

console.log(
  `[volumes] ВЕРДИКТ: снято ${done}, не удалось ${failed}, вложенных фраз собрано ${phrases}.\n` +
    `[volumes] В коридоре ${MIN}-${MAX}: ${pool.size} уникальных фраз → ${path.relative(HERE, OUT)}`
)
