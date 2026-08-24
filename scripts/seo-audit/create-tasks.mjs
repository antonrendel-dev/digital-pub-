/**
 * Фаза 4: завести выбранные задачи в Todoist.
 *
 * Вызывается командой из Telegram (`/seo_tasks 1 3`), а не сразу после
 * анализа: доска быстро превращается в свалку, если крон пишет в неё без
 * спроса. Номера — из последнего предложения, лежащего в pending-tasks.json.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { PENDING_PATH } from './propose.mjs'
import { createTask, listOpenTasks, loadToken } from './lib/todoist.mjs'
import { describeFinding, extractDedupKeys, parseSelection } from './task-format.compiled.mjs'

export function readPending(path = PENDING_PATH) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return { findings: [] }
  }
}

export async function createSelected(args) {
  const pending = readPending()
  const findings = pending.findings ?? []
  if (!findings.length) return { created: [], skipped: [], reason: 'нет предложений' }

  const idx = parseSelection(args, findings.length)
  const token = loadToken()
  const known = extractDedupKeys(await listOpenTasks(token))

  const created = []
  const skipped = []
  for (const i of idx) {
    const f = findings[i]
    if (known.has(f.dedupKey)) {
      skipped.push(f.title)
      continue
    }
    await createTask(token, { content: f.title, description: describeFinding(f) })
    created.push(f.title)
  }

  // Заведённые убираем из списка: повторная команда не должна их дублировать.
  const rest = findings.filter((f) => !created.includes(f.title))
  writeFileSync(PENDING_PATH, JSON.stringify({ ...pending, findings: rest }, null, 2))

  return { created, skipped }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const res = await createSelected(process.argv.slice(2))
  console.log(JSON.stringify(res, null, 2))
}
