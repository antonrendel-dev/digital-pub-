// Локальный кэш вложенных фраз Вордстата для утренней публикации.
//
// Писатель бил в Вордстат живьём в 08:00, а при пустом ответе уезжал на LSI,
// выдуманные Клодом, — и подавал их в промпт под заголовком «реальные данные,
// не выдумка». Квота 100/час, 403 по биллингу и просто сетевой сбой превращали
// утренний прогон в лотерею.
//
// Здесь фразы берутся из уже снятых замеров, а живой запрос остаётся резервом.
// Ответ живого запроса дописывается в кэш: следующая статья по этому ключу и
// все будущие прогоны получают его бесплатно.

import fs from 'fs'
import path from 'path'
import type { Phrase } from './lsi.js'

// Спрос на профессии сезонный, и цифра полугодовой давности — уже не замер.
// По истечении срока ключ меряется заново, даже если в кэше что-то лежит.
export const MAX_CACHE_AGE_DAYS = 180

interface Seed {
  volume?: number | null
  nested?: Phrase[]
  measuredAt?: string
}

interface Store {
  snapshotDate?: string
  updatedAt?: string
  seeds?: Record<string, Seed>
}

export interface CachedPhrases {
  nested: Phrase[]
  source: string
}

export const normalizeKey = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9]+/g, ' ')
    .trim()

export function isFresh(measuredAt: string | undefined, now: Date, maxAgeDays: number): boolean {
  if (!measuredAt) return false
  const at = new Date(measuredAt)
  if (Number.isNaN(at.getTime())) return false
  return (now.getTime() - at.getTime()) / 86_400_000 <= maxAgeDays
}

function readStore(file: string): Store | null {
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as Store
  } catch {
    console.warn(`[lsi-cache] Битый файл замеров, пропускаю: ${file}`)
    return null
  }
}

/**
 * Первое свежее попадание по ключу среди файлов замеров. Порядок files — это
 * приоритет: свой кэш писателя идёт раньше общих банков.
 * Дата берётся из записи, а если её нет — из даты всего файла: банки снимались
 * одним прогоном, поэтому возраст у их записей общий.
 */
export function lookupPhrases(
  files: string[],
  keyword: string,
  now: Date = new Date(),
  maxAgeDays: number = MAX_CACHE_AGE_DAYS
): CachedPhrases | null {
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

export function savePhrases(
  file: string,
  keyword: string,
  nested: Phrase[],
  now = new Date()
): void {
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
