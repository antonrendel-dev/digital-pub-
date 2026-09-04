/**
 * CLI скоринга роботности: `npm run robot-score -- <файл|каталог> [--json out]`.
 *
 * Печатает таблицу метрик по каждой статье и итог: сколько статей с
 * нарушениями. С `--json` пишет полный отчёт — так снят baseline
 * `data/robot-score-baseline.json` по 86 статьям 04.09.2026, на нём
 * подобраны пороги в lib/robot-score.ts.
 */
import fs from 'fs'
import path from 'path'
import { NO_LEAD_RULE, scoreArticle, type RobotScore } from './lib/robot-score.js'

function collect(target: string): string[] {
  if (!fs.existsSync(target)) {
    console.error(`Нет такого файла или каталога: ${target}`)
    process.exit(2)
  }
  const st = fs.statSync(target)
  if (st.isFile()) return [target]
  return fs
    .readdirSync(target)
    .filter((f) => /\.mdx?$/.test(f))
    .sort()
    .map((f) => path.join(target, f))
}

function main() {
  const args = process.argv.slice(2)
  const jsonIdx = args.indexOf('--json')
  const jsonOut = jsonIdx !== -1 ? args[jsonIdx + 1] : null
  if (jsonIdx !== -1 && (!jsonOut || jsonOut.startsWith('--'))) {
    console.error('--json требует путь к файлу отчёта')
    process.exit(2)
  }
  const targets = args.filter((a, i) => a !== '--json' && (jsonIdx === -1 || i !== jsonIdx + 1))
  if (targets.length === 0) {
    console.error('Использование: robot-score <файл|каталог> [--json out.json]')
    process.exit(2)
  }

  const files = targets.flatMap(collect)
  const report: Record<string, RobotScore> = {}
  const header = [
    'статья'.padEnd(46),
    'слов'.padStart(5),
    'афор%'.padStart(6),
    'CV'.padStart(5),
    'шабл'.padStart(5),
    'H2?%'.padStart(5),
    'атр/250'.padStart(8),
    'лид'.padStart(4),
    '  вердикт',
  ].join(' ')
  console.log(header)
  console.log('-'.repeat(header.length))

  let noLead = 0
  let robotic = 0
  for (const file of files) {
    const md = fs.readFileSync(file, 'utf8')
    const score = scoreArticle(md)
    const name = path.basename(file).replace(/\.mdx?$/, '')
    report[name] = score
    const m = score.metrics
    const violations = score.violations.filter((v) => v.level === 'violation')
    const warnings = score.violations.filter((v) => v.level === 'warning')
    if (violations.some((v) => v.rule === NO_LEAD_RULE)) noLead++
    if (violations.some((v) => v.rule !== NO_LEAD_RULE)) robotic++
    const verdict = violations.length
      ? `✗ ${violations.map((v) => v.rule).join(', ')}`
      : warnings.length
        ? `△ ${warnings.map((v) => v.rule).join(', ')}`
        : '✓'
    console.log(
      [
        name.slice(0, 46).padEnd(46),
        String(m.words).padStart(5),
        Math.round(m.aphorismShare * 100)
          .toString()
          .padStart(6),
        m.sentenceCv.toFixed(2).padStart(5),
        String(m.templateCount).padStart(5),
        Math.round(m.questionH2Share * 100)
          .toString()
          .padStart(5),
        m.attributionsPer250.toFixed(2).padStart(8),
        (m.hasLead ? m.leadWords : '—').toString().padStart(4),
        `  ${verdict}`,
      ].join(' ')
    )
  }
  console.log('-'.repeat(header.length))
  console.log(
    `статей: ${files.length}, без лида: ${noLead}, с признаками роботности (афоризмы/шаблоны/«ключ — это»): ${robotic}`
  )

  if (jsonOut) {
    fs.writeFileSync(
      jsonOut,
      JSON.stringify({ generatedAt: new Date().toISOString(), articles: report }, null, 2) + '\n'
    )
    console.log(`отчёт: ${jsonOut}`)
  }
}

main()
