/**
 * Снимает актуальные цифры раздела профессий и печатает их снимком в stdout.
 *
 * Запускается там, где видно базу, — то есть на продакшене. Ничего не пишет
 * и не меняет: применяет снимок к коду отдельный скрипт, apply-profession-measures.
 *
 * Правила отбора те же, что у страницы: роль ищется в заголовке объявления
 * через roleHeadline, а не по всему тексту.
 *
 * Run: node measure-professions.compiled.js
 */

import 'dotenv/config'
import { Pool } from 'pg'
import { PROFESSIONS } from '../lib/professions'
import { roleHeadline } from '../lib/tag-matcher'

const dbUrl = process.env.DB_CONNECTION_STRING ?? process.env.DATABASE_URL
if (!dbUrl) {
  console.error('DB_CONNECTION_STRING or DATABASE_URL env var is required')
  process.exit(1)
}

/** Медиана публикуется только от такой выборки — см. tests/unit/professions.test.ts. */
const MIN_SALARY_SAMPLE = 15

interface Row {
  title: string | null
  description: string | null
  salary: string | null
}

const amount = (raw: string): number | null => {
  const digits = raw.replace(/[\s  ]/g, '').match(/(\d{4,7})/)
  if (!digits) return null
  const value = Number(digits[1])
  return value >= 10000 ? value : null
}

const quantile = (sorted: number[], fraction: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]

async function main() {
  const pool = new Pool({ connectionString: dbUrl })
  const client = await pool.connect()
  try {
    const { rows } = await client.query<Row>(
      `SELECT title, description, salary FROM posts
       WHERE status = 'published' AND type = 'vacancy' AND description IS NOT NULL`
    )

    const snapshot: Record<string, unknown> = {}
    for (const [slug, profession] of Object.entries(PROFESSIONS)) {
      const needles = (profession.phrases ?? profession.queries).map((p) => p.toLowerCase())
      const matched = rows.filter((row) => {
        const haystack = `${row.title ?? ''} ${roleHeadline(row.description ?? '')}`.toLowerCase()
        return needles.some((needle) => haystack.includes(needle))
      })

      const amounts = matched
        .map((row) => (row.salary ? amount(row.salary) : null))
        .filter((value): value is number => value !== null)
        .sort((a, b) => a - b)

      snapshot[slug] = {
        vacancies: matched.length,
        tools: profession.tools.map((tool) => ({
          name: tool.name,
          count: matched.filter((row) => new RegExp(tool.pattern, 'i').test(row.description ?? ''))
            .length,
        })),
        salary:
          amounts.length >= MIN_SALARY_SAMPLE
            ? {
                p25: quantile(amounts, 0.25),
                median: quantile(amounts, 0.5),
                p75: quantile(amounts, 0.75),
                sample: amounts.length,
              }
            : null,
        salarySample: amounts.length,
      }
    }

    console.log(
      JSON.stringify({ measuredAt: new Date().toISOString(), professions: snapshot }, null, 2)
    )
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
