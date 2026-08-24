/**
 * Фаза 3: сравнить свежий снапшот с предыдущим и предложить задачи.
 *
 * Задачи НЕ заводятся сразу: крон присылает пронумерованный список и ждёт
 * команду. Тони отвечает «/seo_tasks 1 3» — заводятся только первая и третья.
 * Так же устроено одобрение тем в контент-заводе, и по той же причине:
 * автоматическая запись в доску без спроса быстро превращает её в свалку.
 *
 * Что попадает в предложения — только дожим уже сделанного: позиции, показы,
 * существующие страницы. Всё, чего ещё нет, ведёт ежедневный крон задач.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildFindings, filterKnown } from './findings.compiled.mjs'
import { escapeHtml, sendLongMessage } from './lib/telegram.mjs'
import { listOpenTasks, loadToken } from './lib/todoist.mjs'
import { extractDedupKeys } from './task-format.compiled.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const SNAPSHOT_DIR = join(DIR, 'data', 'snapshots')
export const PENDING_PATH = join(DIR, 'data', 'pending-tasks.json')

/** Два последних снапшота по дате в имени файла. */
export function lastTwoSnapshots(dir = SNAPSHOT_DIR) {
  const files = readdirSync(dir)
    .filter((f) => f.startsWith('seo_') && f.endsWith('.json'))
    .sort()
  return files.slice(-2).map((f) => join(dir, f))
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function renderProposal(findings) {
  const lines = [
    `🔎 <b>SEO-крон: нашёл ${findings.length} повод(ов) для задач</b>`,
    '',
    'Это дожим уже сделанного — существующие страницы и отслеживаемые ключи.',
    '',
  ]
  findings.forEach((f, i) => {
    lines.push(`<b>${i + 1}. ${escapeHtml(f.title)}</b>`)
    lines.push(`   ${escapeHtml(f.detail)}`)
    lines.push(`   Балл: ${f.score.total}/100`)
    lines.push('')
  })
  lines.push('Завести тикеты: <code>/seo_tasks 1 3</code> или <code>/seo_tasks all</code>')
  lines.push('Ничего не делать — просто не отвечай, список протухнет к следующему прогону.')
  return lines.join('\n')
}

export async function propose() {
  const snaps = lastTwoSnapshots()
  if (snaps.length < 2) {
    console.log('[propose] Нужны два снапшота для сравнения, есть', snaps.length)
    return { findings: [], reason: 'мало снапшотов' }
  }

  const [prevPath, currPath] = snaps
  const findings = buildFindings(readJson(prevPath), readJson(currPath))

  // Уже заведённые поводы не предлагаем повторно: иначе каждый прогон
  // дублирует одни и те же задачи, и доска перестаёт быть читаемой.
  const token = loadToken()
  const known = extractDedupKeys(await listOpenTasks(token))
  const fresh = filterKnown(findings, known)

  console.log(
    `[propose] Сравнил ${prevPath.split('/').pop()} → ${currPath.split('/').pop()}: ` +
      `находок ${findings.length}, из них новых ${fresh.length}`
  )

  mkdirSync(dirname(PENDING_PATH), { recursive: true })
  writeFileSync(
    PENDING_PATH,
    JSON.stringify({ createdAt: new Date().toISOString(), findings: fresh }, null, 2)
  )

  if (fresh.length) await sendLongMessage(renderProposal(fresh))
  else console.log('[propose] Новых поводов нет, сообщение не отправляю')

  return { findings: fresh }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await propose()
}
