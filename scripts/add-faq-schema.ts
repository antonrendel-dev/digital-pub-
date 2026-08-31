/**
 * Дописывает faqSchema статьям, у которых раздел вопросов есть, а разметки нет.
 *
 * Разовая утилита для уже написанных статей: новые получают разметку сразу
 * от завода (см. buildMdxFrontmatter в scripts/content-factory/writer.ts).
 * Логика разбора общая — lib/faq-schema.
 *
 * Run:     npx tsx scripts/add-faq-schema.ts --write
 * Dry-run: npx tsx scripts/add-faq-schema.ts
 */
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { MIN_FAQ_ITEMS, parseFaq } from '../lib/faq-schema'

const DIR = path.join(process.cwd(), 'content', 'articles')
const WRITE = process.argv.includes('--write')

/**
 * Статьи эксперимента по переписке — до конца сентября не трогаем.
 * Разметка меняет сниппет, а значит и кликабельность: правка испортила бы
 * замер, ради которого эксперимент и затевался.
 */
const EXPERIMENT = new Set([
  'rezyume-kopiraytera',
  'zarplata-seo-specialista',
  'rezyume-smm-spetsialista',
  'zarplata-smm-spetsialista-realnie-dannye-iz-vakansiy',
  'zarplata-ux-ui-dizajnera',
  'rezyume-targetologa-shablon-2026',
  'zarplata-kopiraytera-2026',
  'telegram-kanaly-vakansii-smm',
  'rezume-marketologa',
  'vakansii-direktolog-yandex-direct',
])

const added: string[] = []
const skipped: string[] = []

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.mdx'))) {
  const slug = file.replace('.mdx', '')
  const full = path.join(DIR, file)
  const raw = fs.readFileSync(full, 'utf8')
  const { data, content } = matter(raw)

  if (data.faqSchema) continue
  if (EXPERIMENT.has(slug)) {
    skipped.push(`${slug}: статья эксперимента, до 30.09 не трогаем`)
    continue
  }

  const items = parseFaq(content)
  if (items.length < MIN_FAQ_ITEMS) continue

  const words = items.reduce((s, i) => s + i.answer.split(' ').length, 0)
  added.push(`${slug}: ${items.length} вопросов, ${words} слов`)

  if (WRITE) {
    // Пишем строкой в исходный файл, а не через matter.stringify: тот
    // переписал бы весь фронтматтер по-своему и создал бы шум в диффе.
    const json = JSON.stringify(items).replace(/'/g, "''")
    const marker = raw.indexOf('\n---', 4)
    fs.writeFileSync(full, raw.slice(0, marker) + `\nfaqSchema: '${json}'` + raw.slice(marker))
  }
}

console.log(added.length ? `РАЗМЕТКА СОБРАНА (${added.length}):` : 'НЕЧЕГО ДОБАВЛЯТЬ')
for (const line of added) console.log(`  ${line}`)
if (skipped.length) {
  console.log(`\nПРОПУЩЕНО (${skipped.length}):`)
  for (const line of skipped) console.log(`  ${line}`)
}
console.log(WRITE ? '\nфайлы обновлены' : '\n(сухой прогон — файлы не тронуты)')
