/**
 * Минимальный клиент Todoist для крона: прочитать открытые задачи и завести
 * новые. Токен берётся оттуда же, где его держит MCP-сервер, — отдельной
 * копии в .env не заводим, чтобы не расходился при ротации.
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PROJECT_ID = '6grWxWfJVfg6rcwh'
const SECTION_BACKLOG = '6grWxXRp2mx5hHH9'

/**
 * Раздел «Готово». В этой доске закрытые задачи не отмечают галочкой, а
 * переносят сюда, поэтому API отдаёт их наравне с живыми. Дописывать
 * наблюдение в уже закрытую задачу бессмысленно: её никто не откроет.
 */
const SECTION_DONE = '6grWxXVqjwQ7c8wh'
const API = 'https://api.todoist.com/api/v1'

export function loadToken() {
  const fromEnv = process.env.TODOIST_API_TOKEN
  if (fromEnv) return fromEnv
  const settings = JSON.parse(readFileSync(join(homedir(), '.claude', 'settings.json'), 'utf8'))
  const token = settings?.mcpServers?.todoist?.env?.TODOIST_API_TOKEN
  if (!token) throw new Error('TODOIST_API_TOKEN не найден ни в окружении, ни в settings.json')
  return token
}

async function call(token, path, { method = 'GET', body } = {}) {
  // Todoist изредка отвечает 500/502 на ровном месте — при однократном
  // запуске раз в две недели тихо потерять задачи дороже, чем подождать.
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(API + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.ok) {
      const text = await res.text()
      return text.trim() ? JSON.parse(text) : {}
    }
    if (![429, 500, 502, 503].includes(res.status) || attempt === 4) {
      throw new Error(`Todoist HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
    }
    await new Promise((r) => setTimeout(r, 4000 * attempt))
  }
}

/** Живые задачи проекта: без отмеченных и без лежащих в «Готово». */
export async function listOpenTasks(token) {
  const out = []
  let cursor = null
  do {
    const q = `?project_id=${PROJECT_ID}&limit=200${cursor ? `&cursor=${cursor}` : ''}`
    const page = await call(token, `/tasks${q}`)
    out.push(...page.results)
    cursor = page.next_cursor
  } while (cursor)
  return out.filter((t) => !t.checked && t.section_id !== SECTION_DONE)
}

export async function createTask(token, { content, description, priority = 2 }) {
  return call(token, '/tasks', {
    method: 'POST',
    body: { content, description, project_id: PROJECT_ID, section_id: SECTION_BACKLOG, priority },
  })
}

/** Дописать блок в конец описания задачи, ничего не затирая. */
export async function appendToTask(token, taskId, note) {
  const task = await call(token, `/tasks/${taskId}`)
  return call(token, `/tasks/${taskId}`, {
    method: 'POST',
    body: { description: `${task.description || ''}${note}` },
  })
}

/** Заменить описание задачи целиком. */
export async function updateDescription(token, taskId, description) {
  return call(token, `/tasks/${taskId}`, { method: 'POST', body: { description } })
}
