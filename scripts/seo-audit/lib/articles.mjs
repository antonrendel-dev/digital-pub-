// Длина статей — знаменатель для глубины чтения. Считается по исходникам,
// потому что в базе Payload лежит только часть статей, а в репозитории все.
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ARTICLES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'content', 'articles')

/**
 * Сколько знаков текста в каждой статье.
 *
 * Из подсчёта убираются шапка с метаданными и разметка: читатель их не видит,
 * а на ожидаемое время они бы повлияли.
 */
export function readArticleLengths() {
  const lengths = new Map()
  let files = []
  try {
    files = readdirSync(ARTICLES_DIR)
  } catch {
    return lengths
  }
  for (const file of files) {
    if (!file.endsWith('.mdx')) continue
    try {
      const raw = readFileSync(join(ARTICLES_DIR, file), 'utf8')
      const body = raw.replace(/^---[\s\S]*?---/, '').replace(/<[^>]+>/g, ' ')
      lengths.set(file.replace(/\.mdx$/, ''), body.trim().length)
    } catch {
      // Нечитаемый файл просто не попадёт в знаменатель — статья выпадет
      // из отчёта, но остальные посчитаются.
    }
  }
  return lengths
}
