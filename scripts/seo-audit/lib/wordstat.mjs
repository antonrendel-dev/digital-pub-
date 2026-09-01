/**
 * Частотность ключей для гейта: спрашиваем Вордстат, ответы копим в файле.
 *
 * Кэш нужен не ради скорости, а ради лимита: сто запросов в час на весь
 * проект, и SEO-крон делит его с контент-заводом. Ключи между прогонами
 * повторяются почти целиком, так что второй прогон обычно не тратит ничего.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(dirname(fileURLToPath(import.meta.url)))
const CACHE = join(DIR, 'data', 'volumes.json')

/** Через сколько дней перезамерить: спрос живой, но не настолько. */
const TTL_DAYS = 30
const PAUSE_MS = 400

function load() {
  if (!existsSync(CACHE)) return {}
  try {
    return JSON.parse(readFileSync(CACHE, 'utf8'))
  } catch {
    return {}
  }
}

function fresh(entry, now) {
  if (!entry?.at) return false
  return (now - Date.parse(entry.at)) / 86400000 < TTL_DAYS
}

async function ask(phrase) {
  const res = await fetch('https://searchapi.api.cloud.yandex.net/v2/wordstat/topRequests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Api-Key ${process.env.YANDEX_SEARCH_API_KEY}`,
      'X-Folder-Id': process.env.YANDEX_FOLDER_ID,
    },
    body: JSON.stringify({ phrase, num_phrases: 1 }),
  })
  if (!res.ok) throw new Error(`Wordstat HTTP ${res.status}`)
  const d = await res.json()
  if (d.totalCount) return Number(d.totalCount)
  return d.results?.[0] ? Number(d.results[0].count) : 0
}

/**
 * Частотность по списку ключей. Ключ, который не удалось замерить, в ответе
 * отсутствует — гейт такие пропускает, а не режет.
 */
export async function fetchVolumes(keys) {
  const cache = load()
  const now = Date.now()
  const out = {}
  const misses = []

  for (const k of keys) {
    if (fresh(cache[k], now)) out[k] = cache[k].volume
    else misses.push(k)
  }

  if (!process.env.YANDEX_SEARCH_API_KEY || !process.env.YANDEX_FOLDER_ID) {
    console.log(`[volume-gate] Нет ключей Вордстата — гейт пропускает ${misses.length} находок`)
    return out
  }

  let failed = 0
  for (const k of misses) {
    try {
      const volume = await ask(k)
      out[k] = volume
      cache[k] = { volume, at: new Date(now).toISOString() }
    } catch (e) {
      failed++
      console.log(`[volume-gate] Не замерен «${k}»: ${e.message}`)
    }
    await new Promise((r) => setTimeout(r, PAUSE_MS))
  }

  mkdirSync(dirname(CACHE), { recursive: true })
  writeFileSync(CACHE, JSON.stringify(cache, null, 1))
  console.log(
    `[volume-gate] Частотность: из кэша ${keys.length - misses.length}, ` +
      `замерено ${misses.length - failed}, не удалось ${failed}`
  )
  return out
}
