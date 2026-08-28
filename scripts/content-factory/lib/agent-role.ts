import fs from 'fs'
import os from 'os'
import path from 'path'

/**
 * Роль агента текстом — для CLI, у которых нет профилей.
 *
 * У Claude Code роль передаётся флагом `--agent analyst`: CLI сам подставляет
 * системный промпт из ~/.claude/agents/analyst.md и подключает перечисленные
 * там скиллы. У Codex такого механизма нет — субагенты там порождаются на лету
 * инструментом spawn_agent, файловых профилей не существует.
 *
 * До 28.08.2026 код в writer.ts и analyst.ts просто ронял `agent` в undefined,
 * если профили не поддерживаются. Флага нет — ошибки нет, а роль исчезает
 * молча: аналитик отвечает как обычная модель, писатель не читает
 * dpub-content-standard, и расхождение со стандартом всплывает только на
 * приёмке. Здесь роль вкладывается в сам промпт, чтобы потеря не была тихой.
 *
 * Скиллы так не переносятся: их подключает CLI, а не текст промпта. Поэтому
 * функция возвращает и список скиллов — вызывающий обязан либо загрузить их
 * сам, либо честно сказать в логе, чего агент недосчитался.
 */

export interface AgentRole {
  /** Тело профиля без frontmatter — то, что у Claude Code уходит системным промптом. */
  instructions: string
  /** Скиллы из frontmatter. Текстом не переносятся — только для предупреждения в логе. */
  skills: string[]
}

const AGENTS_DIR = process.env.CLAUDE_AGENTS_DIR ?? path.join(os.homedir(), '.claude', 'agents')

/** Разбирает `---`-frontmatter вручную: тащить YAML-парсер в завод незачем. */
function splitFrontmatter(raw: string): { front: string; body: string } {
  if (!raw.startsWith('---')) return { front: '', body: raw }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { front: '', body: raw }
  return { front: raw.slice(3, end), body: raw.slice(end + 4).trim() }
}

function parseSkills(front: string): string[] {
  const skills: string[] = []
  let inSkills = false
  for (const line of front.split('\n')) {
    if (/^skills:\s*$/.test(line)) {
      inSkills = true
      continue
    }
    if (inSkills) {
      const m = line.match(/^\s+-\s+(.+?)\s*$/)
      if (m) skills.push(m[1])
      else if (line.trim() !== '') break
    }
  }
  return skills
}

/**
 * Читает профиль агента. Возвращает null, если файла нет: отсутствие профиля —
 * не повод ронять прогон, но вызывающий обязан это заметить и написать в лог.
 */
export function loadAgentRole(agent: string): AgentRole | null {
  const file = path.join(AGENTS_DIR, `${agent}.md`)
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, 'utf8')
  const { front, body } = splitFrontmatter(raw)
  if (!body.trim()) return null
  return { instructions: body, skills: parseSkills(front) }
}

/**
 * Складывает роль и задачу в один промпт.
 *
 * Роль идёт первой и отделена явной границей: модель должна понимать, где
 * заканчивается «кто ты» и начинается «что сделать», иначе инструкции роли
 * смешиваются с данными задачи.
 */
export function withRole(prompt: string, role: AgentRole): string {
  return `Ты работаешь в роли, описанной ниже. Следуй ей на протяжении всего ответа.

===== РОЛЬ =====
${role.instructions}
===== КОНЕЦ РОЛИ =====

===== ЗАДАЧА =====
${prompt}`
}
