/**
 * Фаза 3: свести находки с доской Todoist.
 *
 * Крон не спрашивает разрешения. Правило простое:
 *   находка уже описана открытой задачей → дописываем в неё наблюдение;
 *   такой задачи нет → заводим тикет в Бэклог.
 *
 * Спрашивать было хуже: список поводов приходил раз в две недели, ответить на
 * него было некогда, и он протухал вместе со всей находкой.
 *
 * Что сюда попадает — только дожим уже сделанного: существующие страницы и
 * отслеживаемые ключи. Всё, чего ещё нет, ведёт ежедневный крон задач.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildFindings } from './findings.compiled.mjs'
import {
  MAX_NEW_TASKS_PER_RUN,
  describeFinding,
  matchesFinding,
  mergeNote,
} from './task-format.compiled.mjs'
import { escapeHtml, sendLongMessage } from './lib/telegram.mjs'
import { appendToTask, createTask, listOpenTasks, loadToken } from './lib/todoist.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const SNAPSHOT_DIR = join(DIR, 'data', 'snapshots')

/** Два последних снапшота по дате в имени файла. */
export function lastTwoSnapshots(dir = SNAPSHOT_DIR) {
  return readdirSync(dir)
    .filter((f) => f.startsWith('seo_') && f.endsWith('.json'))
    .sort()
    .slice(-2)
    .map((f) => join(dir, f))
}

export function renderReport({ created, merged, deferred, from, to }) {
  const lines = [`🔎 <b>SEO-крон: свёл находки с доской</b>`, `Сравнил ${from} → ${to}`, '']

  if (created.length) {
    lines.push(`🆕 <b>Заведено задач: ${created.length}</b>`)
    created.forEach((t) => lines.push(`• ${escapeHtml(t)}`))
    lines.push('')
  }
  if (merged.length) {
    lines.push(`🔗 <b>Дописано в существующие: ${merged.length}</b>`)
    merged.forEach(({ finding, task }) =>
      lines.push(`• ${escapeHtml(finding)}\n   → в задачу «${escapeHtml(task)}»`)
    )
    lines.push('')
  }
  // Молча ничего не отбрасываем: если повод не превратился в задачу, об этом
  // должно быть видно в отчёте, иначе тишина читается как «всё покрыто».
  if (deferred.length) {
    lines.push(`⏸ <b>Не завёл, порог ${MAX_NEW_TASKS_PER_RUN} за прогон: ${deferred.length}</b>`)
    deferred.forEach((t) => lines.push(`• ${escapeHtml(t)}`))
    lines.push('')
    lines.push('Вернутся на следующем прогоне, если не разберём раньше.')
  }
  if (!created.length && !merged.length && !deferred.length) {
    lines.push('Расхождений с прошлым замером нет.')
  }
  return lines.join('\n')
}

export async function syncTasks() {
  const snaps = lastTwoSnapshots()
  if (snaps.length < 2) {
    console.log('[sync-tasks] Нужны два снапшота для сравнения, есть', snaps.length)
    return { created: [], merged: [], deferred: [] }
  }

  const [prevPath, currPath] = snaps
  const findings = buildFindings(
    JSON.parse(readFileSync(prevPath, 'utf8')),
    JSON.parse(readFileSync(currPath, 'utf8'))
  )

  const token = loadToken()
  const tasks = await listOpenTasks(token)
  const today = new Date().toISOString().split('T')[0]

  const created = []
  const merged = []
  const deferred = []

  for (const f of findings) {
    const hit = tasks.find((t) => matchesFinding(f, t))
    if (hit) {
      // По метке — задача уже наша и про то же самое, второй раз не трогаем.
      // По тексту — задача заведена руками, дописываем в неё наблюдение.
      if (matchesFinding(f, hit) === 'text') {
        await appendToTask(token, hit.id, mergeNote(f, today))
        hit.description = `${hit.description || ''}${mergeNote(f, today)}`
        merged.push({ finding: f.title, task: hit.content })
      }
      continue
    }
    if (created.length >= MAX_NEW_TASKS_PER_RUN) {
      deferred.push(f.title)
      continue
    }
    const t = await createTask(token, { content: f.title, description: describeFinding(f) })
    // Свежая задача попадает в тот же список: две находки по одному ключу не
    // должны породить два тикета внутри одного прогона.
    tasks.push({ id: t.id, content: f.title, description: describeFinding(f) })
    created.push(f.title)
  }

  const stat = `создано ${created.length}, дописано ${merged.length}, отложено ${deferred.length}`
  console.log(`[sync-tasks] Находок ${findings.length}: ${stat}`)

  if (created.length || merged.length || deferred.length) {
    await sendLongMessage(
      renderReport({
        created,
        merged,
        deferred,
        from: prevPath.split('/').pop(),
        to: currPath.split('/').pop(),
      })
    )
  }
  return { created, merged, deferred }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await syncTasks()
}
