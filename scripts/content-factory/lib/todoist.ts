import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Закрытие подзадачи батча после публикации статьи.
 *
 * Завод не ходил в Todoist вообще, поэтому подзадачи тем заводились руками
 * и руками же не закрывались. На 01.09.2026 восемь подзадач висели открытыми
 * при уже опубликованных статьях — очередь на доске завышалась на единицу
 * в день, и расхождение росло само.
 *
 * Связка идёт по строке «id темы: N» в описании подзадачи — тот же id лежит
 * в topics_*.json. По заголовку сопоставлять нельзя: проверено на этих же
 * данных, нечёткий матч по названиям дал десять совпадений вместо восьми.
 */
const API = 'https://api.todoist.com/api/v1'
const PROJECT_ID = '6grWxWfJVfg6rcwh'

/** Токен берётся оттуда же, где его держит MCP-сервер — отдельной копии не заводим. */
export function loadToken(): string | null {
  if (process.env.TODOIST_API_TOKEN) return process.env.TODOIST_API_TOKEN
  try {
    const settings = JSON.parse(readFileSync(join(homedir(), '.claude', 'settings.json'), 'utf-8'))
    return settings?.mcpServers?.todoist?.env?.TODOIST_API_TOKEN ?? null
  } catch {
    return null
  }
}

interface Task {
  id: string
  content: string
  description?: string | null
}

async function call(token: string, path: string, method = 'GET'): Promise<unknown> {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Todoist HTTP ${res.status} на ${path}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function openTasks(token: string): Promise<Task[]> {
  const out: Task[] = []
  let cursor: string | null = null
  do {
    const q = `/tasks?project_id=${PROJECT_ID}&limit=200${cursor ? `&cursor=${cursor}` : ''}`
    const page = (await call(token, q)) as { results: Task[]; next_cursor: string | null }
    out.push(...page.results)
    cursor = page.next_cursor
  } while (cursor)
  return out
}

/** Подзадача темы: ищем по точной строке «id темы: N», а не по заголовку. */
export function findByTopicId(tasks: Task[], topicId: number): Task | undefined {
  const marker = new RegExp(`id темы:\\s*${topicId}\\b`)
  return tasks.find((t) => marker.test(t.description || ''))
}

/**
 * Закрыть подзадачу опубликованной темы.
 *
 * Ошибки не бросаются наружу: статья уже на сайте, и падать из-за Todoist
 * на последнем шаге — хуже, чем оставить одну незакрытую карточку.
 */
export async function closeTopicSubtask(topicId: number): Promise<string> {
  const token = loadToken()
  if (!token) return 'токен Todoist не найден — подзадача не закрыта'
  try {
    const task = findByTopicId(await openTasks(token), topicId)
    if (!task) return `подзадача темы #${topicId} не найдена среди открытых`
    await call(token, `/tasks/${task.id}/close`, 'POST')
    return `подзадача закрыта: ${task.content.slice(0, 60)}`
  } catch (e) {
    return `не удалось закрыть подзадачу: ${(e as Error).message}`
  }
}
