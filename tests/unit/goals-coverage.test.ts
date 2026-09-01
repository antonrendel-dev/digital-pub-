import fs from 'fs'
import path from 'path'
import { GOALS } from '../../lib/metrika'

/**
 * Страж на цели Метрики.
 *
 * Две беды, обе случились на этом проекте:
 * 1. Цель звали строкой, строка разошлась с заведённой в счётчике — цель молча
 *    считала ноль, и обнаружилось это через месяц по пустому отчёту.
 * 2. Шаг воронки вообще не был помечен: клик по карточке в ленте не считался
 *    нигде, поэтому путь «листинг → карточка» измерить было нечем.
 */
const ROOT = process.cwd()
const SRC = ['components', 'app', 'lib']

function walk(dir: string): string[] {
  const full = path.join(ROOT, dir)
  if (!fs.existsSync(full)) return []
  return fs.readdirSync(full, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules') return []
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return walk(p)
    return /\.(ts|tsx)$/.test(e.name) ? [p] : []
  })
}

const files = SRC.flatMap(walk).filter((f) => !f.endsWith('lib/metrika.ts'))
const sources = files.map((f) => ({ f, text: fs.readFileSync(path.join(ROOT, f), 'utf8') }))

describe('цели Метрики', () => {
  it('вызовы идут через константы GOALS, а не строками', () => {
    const names = Object.values(GOALS) as string[]
    const raw = sources
      .filter(({ text }) => names.some((n) => text.includes(`reachGoal('${n}'`)))
      .map(({ f }) => f)
    expect(raw).toEqual([])
  })

  it('карточка объявления помечена целью в обоих компонентах ленты', () => {
    for (const comp of ['components/feed/TileCard.tsx', 'components/feed/JobCard.tsx']) {
      const text = fs.readFileSync(path.join(ROOT, comp), 'utf8')
      expect(text).toContain('GOALS.CARD_OPEN')
    }
  })

  it('каждая цель из GOALS где-то вызывается', () => {
    const unused = Object.entries(GOALS)
      .filter(([key]) => !sources.some(({ text }) => text.includes(`GOALS.${key}`)))
      .map(([key]) => key)
    expect(unused).toEqual([])
  })
})
