/**
 * Применяет снимок из measure-professions к lib/professions.ts.
 *
 * Правит только машинные поля: vacanciesAtMeasure, count у инструментов и
 * блок salary. Редакторские тексты не трогает — вместо этого перечисляет
 * фразы, где встречается устаревшее число, чтобы их переписал человек:
 * «из 142 вакансий» нельзя заменить автоматически, не испортив предложение.
 *
 * Run:     npx tsx scripts/apply-profession-measures.ts snapshot.json --write
 * Dry-run: npx tsx scripts/apply-profession-measures.ts snapshot.json
 */

import fs from 'fs'
import path from 'path'

interface ToolMeasure {
  name: string
  count: number
}
interface SalaryMeasure {
  p25: number
  median: number
  p75: number
  sample: number
}
interface Measure {
  vacancies: number
  tools: ToolMeasure[]
  salary: SalaryMeasure | null
  salarySample: number
}

const [, , snapshotPath, ...flags] = process.argv
const WRITE = flags.includes('--write')

if (!snapshotPath) {
  console.error('usage: apply-profession-measures <snapshot.json> [--write]')
  process.exit(1)
}

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as {
  measuredAt: string
  professions: Record<string, Measure>
}

const file = path.join(process.cwd(), 'lib', 'professions.ts')
let source = fs.readFileSync(file, 'utf8')

/** Границы блока профессии в исходнике — правки не должны перетекать к соседу. */
function blockOf(slug: string): { start: number; end: number } | null {
  const start = source.indexOf(`slug: '${slug}'`)
  if (start === -1) return null
  const next = source.indexOf('    slug: ', start + 10)
  return { start, end: next === -1 ? source.length : next }
}

const changes: string[] = []
const manual: string[] = []

for (const [slug, measure] of Object.entries(snapshot.professions)) {
  const block = blockOf(slug)
  if (!block) {
    manual.push(`${slug}: профессия не найдена в lib/professions.ts`)
    continue
  }
  const patch = (pattern: RegExp, replace: (m: RegExpMatchArray) => string) => {
    const chunk = source.slice(block.start, block.end)
    const found = chunk.match(pattern)
    if (!found) return
    const next = replace(found)
    if (next === found[0]) return
    source = source.slice(0, block.start) + chunk.replace(found[0], next) + source.slice(block.end)
  }

  patch(/vacanciesAtMeasure: (\d+)/, (m) => {
    if (Number(m[1]) === measure.vacancies) return m[0]
    changes.push(`${slug}: вакансий ${m[1]} → ${measure.vacancies}`)
    return `vacanciesAtMeasure: ${measure.vacancies}`
  })

  for (const tool of measure.tools) {
    const escaped = tool.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    patch(new RegExp(`\\{ name: '${escaped}', count: (\\d+)`), (m) => {
      if (Number(m[1]) === tool.count) return m[0]
      changes.push(`${slug}: ${tool.name} ${m[1]} → ${tool.count}`)
      return m[0].replace(`count: ${m[1]}`, `count: ${tool.count}`)
    })
  }

  const chunk = source.slice(block.start, block.end)
  const hasSalary = /salary: \{[^}]*\}/.test(chunk)
  if (measure.salary && hasSalary) {
    patch(/salary: \{[^}]*\}/, (m) => {
      const next = `salary: { p25: ${measure.salary!.p25}, median: ${measure.salary!.median}, p75: ${measure.salary!.p75}, sample: ${measure.salary!.sample} }`
      if (next !== m[0])
        changes.push(
          `${slug}: вилка ${m[0].slice(8, 60)}… → медиана ${measure.salary!.median}, выборка ${measure.salary!.sample}`
        )
      return next
    })
  } else if (measure.salary && !hasSalary) {
    manual.push(
      `${slug}: выборка выросла до ${measure.salarySample} — вилку можно вернуть, сейчас salary: null`
    )
  } else if (!measure.salary && hasSalary) {
    manual.push(
      `${slug}: выборка упала до ${measure.salarySample} — вилку публиковать нельзя, нужно salary: null и правка текста`
    )
  }

  // Числа, вросшие в предложения: их меняет человек, иначе ломается фраза.
  // Ищем размер выборки, а не любое число рядом со словом: «в 71% вакансий» —
  // доля, «медиана 80 000 ₽» — деньги, и ни то ни другое не устаревает от
  // пополнения базы. Устаревает счёт вида «из 55 вакансий» и «13 вакансиях».
  // Две формы счёта: «из 55 вакансий» и «13 вакансиях из 55» — во второй
  // размер выборки стоит уже после слова, и без отдельного шаблона фраза
  // выглядела бы устаревшей при верных числах.
  const COUNT_BEFORE = /(?:из\s+)?(\d{2,4})\s+ваканс[а-яё]*/g
  const COUNT_AFTER = /ваканс[а-яё]*\s+из\s+(\d{2,4})/g
  const sentences = source.slice(block.start, block.end).split(/(?<=[.!?])\s+|\n/)
  for (const line of sentences) {
    const trimmed = line.trimStart()
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('*') ||
      line.includes('vacanciesAtMeasure')
    ) {
      continue
    }
    const counts = [...line.matchAll(COUNT_BEFORE), ...line.matchAll(COUNT_AFTER)].map((m) =>
      Number(m[1])
    )
    if (counts.length && !counts.includes(measure.vacancies)) {
      manual.push(`${slug}: проверить фразу — «${line.trim().slice(0, 90)}»`)
    }
  }
}

console.log(`снимок от ${snapshot.measuredAt}`)
console.log(
  changes.length ? `\nПРАВКИ (${changes.length}):` : '\nПРАВОК НЕТ — цифры совпадают с базой'
)
for (const line of changes) console.log(`  ${line}`)
if (manual.length) {
  console.log(`\nТРЕБУЕТ ЧЕЛОВЕКА (${manual.length}):`)
  for (const line of manual) console.log(`  ${line}`)
}

if (WRITE && changes.length) {
  fs.writeFileSync(file, source)
  console.log('\nlib/professions.ts обновлён')
} else if (!WRITE) {
  console.log('\n(сухой прогон — файл не тронут)')
}
