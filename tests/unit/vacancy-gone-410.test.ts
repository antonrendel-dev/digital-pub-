import fs from 'fs'
import path from 'path'
import { FORMAT_SLUGS, LEVEL_SLUGS } from '../../lib/spec-filter-meta'
import {
  GONE_DAYS,
  FRESH_DAYS,
  listedSince,
  isIndexable,
  isListed,
} from '../../lib/vacancy-lifecycle'

const middleware = fs.readFileSync(path.join(process.cwd(), 'middleware.ts'), 'utf8')

describe('посредник, отдающий 410', () => {
  it('знает ровно те же слаги фильтров, что и остальной код', () => {
    const declared = middleware.match(/const FILTER_SLUGS = new Set\(\[([^\]]*)\]/)
    expect(declared).not.toBeNull()
    const inMiddleware = [...declared![1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort()
    const expected = [...FORMAT_SLUGS, ...LEVEL_SLUGS].sort()
    expect(inMiddleware).toEqual(expected)
  })

  it('срез не проверяется на 410 — он не вакансия', () => {
    expect(middleware).toMatch(/if \(FILTER_SLUGS\.has\(slug\)\) return/)
  })

  it('сбой списка не отдаёт 410 никому', () => {
    // Пустой набор при недоступной базе — сознательное решение, а не случайность.
    expect(middleware).toMatch(/goneSlugs: Set<string> = new Set\(\)/)
    expect(middleware).toMatch(/catch/)
  })

  it('страница-заглушка закрыта от индексации', () => {
    expect(middleware).toMatch(/noindex, follow/)
    expect(middleware).toMatch(/status: 410/)
  })
})

describe('граница выборки для базы', () => {
  it('listedSince отстоит ровно на порог ухода', () => {
    const now = new Date('2026-08-31T00:00:00.000Z')
    const since = listedSince(now)
    const days = Math.round((now.getTime() - since.getTime()) / (24 * 60 * 60 * 1000))
    expect(days).toBe(GONE_DAYS)
  })

  it('пороги не перепутаны местами', () => {
    expect(FRESH_DAYS).toBeLessThan(GONE_DAYS)
  })

  it('на границе списка и индекса разные ответы', () => {
    const now = new Date('2026-08-31T12:00:00.000Z')
    const ago = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString()
    // 60 дней: человеку показываем, поисковику нет
    expect(isListed(ago(60), now)).toBe(true)
    expect(isIndexable(ago(60), now)).toBe(false)
  })
})
