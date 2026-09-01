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
  describeGroup,
  groupFindings,
  groupTitle,
  matchesGroup,
  describeFinding,
  matchesFinding,
  mergeNote,
} from './task-format.compiled.mjs'
import { MIN_VOLUME, applyVolumeGate, keysToMeasure } from './volume-gate.compiled.mjs'
import { escapeHtml, sendLongMessage } from './lib/telegram.mjs'
import { fetchVolumes } from './lib/wordstat.mjs'
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

export function renderReport({ created, merged, deferred, dropped = [], from, to }) {
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
  // Отсев по частотности показываем поимённо: иначе «крон ничего не нашёл»
  // и «крон нашёл, но отбросил» выглядят одинаково, а это разные вещи.
  if (dropped.length) {
    lines.push(`🔇 <b>Отсеяно по частотности (порог ${MIN_VOLUME}/мес): ${dropped.length}</b>`)
    dropped.forEach(({ finding, volume }) =>
      lines.push(`• ${escapeHtml(finding.key)} — ${volume}/мес`)
    )
    lines.push('')
    lines.push('Позиция по запросу, который не набирают, не значит ничего.')
    lines.push('')
  }
  if (!created.length && !merged.length && !deferred.length && !dropped.length) {
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
  const raw = buildFindings(
    JSON.parse(readFileSync(prevPath, 'utf8')),
    JSON.parse(readFileSync(currPath, 'utf8'))
  )

  // Гейт частотности: позиция по запросу, который никто не набирает, не значит
  // ничего. До 01.09.2026 такие находки шли на доску наравне с настоящими —
  // из двадцати четырёх ключей трёх пачек настоящими оказались шесть.
  const volumes = await fetchVolumes(keysToMeasure(raw))
  const { kept: findings, dropped } = applyVolumeGate(raw, volumes)
  if (dropped.length) {
    console.log(`[volume-gate] Отсеяно по частотности: ${dropped.length}`)
    for (const d of dropped) console.log(`  ${String(d.volume).padStart(5)}/мес  ${d.finding.key}`)
  }

  const token = loadToken()
  const tasks = await listOpenTasks(token)
  const today = new Date().toISOString().split('T')[0]

  const created = []
  const merged = []
  const deferred = []

  // Однотипные находки идут одной задачей: двенадцать карточек «ключ на дожим»
  // — это одна работа списком, а не двенадцать поводов открыть доску.
  for (const g of groupFindings(findings)) {
    // Уже разобранные находки внутри пачки повторно не тащим.
    const fresh = g.findings.filter((f) => !tasks.some((t) => matchesFinding(f, t) === 'mark'))
    if (!fresh.length) continue

    // Заведённая руками задача про тот же ключ — дописываем наблюдение в неё.
    const byText = fresh
      .map((f) => ({ f, hit: tasks.find((t) => matchesFinding(f, t) === 'text') }))
      .filter((x) => x.hit)
    for (const { f, hit } of byText) {
      await appendToTask(token, hit.id, mergeNote(f, today))
      hit.description = `${hit.description || ''}${mergeNote(f, today)}`
      merged.push({ finding: f.title, task: hit.content })
    }
    const rest = fresh.filter((f) => !byText.some((x) => x.f === f))
    if (!rest.length) continue

    // Пачка этого типа уже висит на доске — дописываем в неё, а не плодим вторую.
    const groupTask = tasks.find((t) => matchesGroup(g.type, t))
    if (groupTask) {
      for (const f of rest) {
        await appendToTask(token, groupTask.id, mergeNote(f, today))
        groupTask.description = `${groupTask.description || ''}${mergeNote(f, today)}`
        merged.push({ finding: f.title, task: groupTask.content })
      }
      continue
    }

    if (created.length >= MAX_NEW_TASKS_PER_RUN) {
      deferred.push(g.title)
      continue
    }
    // Часть находок пачки могла уже разойтись по задачам — заголовок считаем
    // по тому, что реально попадёт внутрь, иначе «14 ключей» окажется тремя.
    const payload = {
      ...g,
      findings: rest,
      title: rest.length > 1 ? groupTitle(g.type, rest.length) : rest[0].title,
    }
    const description = describeGroup(payload)
    const t = await createTask(token, { content: payload.title, description })
    // Свежая задача попадает в тот же список: находки одного типа внутри
    // прогона должны лечь в неё, а не породить второй тикет.
    tasks.push({ id: t.id, content: payload.title, description })
    created.push(payload.title)
  }

  const stat = `создано ${created.length}, дописано ${merged.length}, отложено ${deferred.length}`
  console.log(`[sync-tasks] Находок ${findings.length}: ${stat}`)

  if (created.length || merged.length || deferred.length || dropped.length) {
    await sendLongMessage(
      renderReport({
        created,
        merged,
        deferred,
        dropped,
        from: prevPath.split('/').pop(),
        to: currPath.split('/').pop(),
      })
    )
  }
  return { created, merged, deferred, dropped }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await syncTasks()
}
