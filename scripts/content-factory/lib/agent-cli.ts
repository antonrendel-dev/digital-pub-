/**
 * Какой CLI-агент запускает завод.
 *
 * До 26.08.2026 имя `claude` было зашито в четырёх местах: writer, analyst,
 * regen и reformulate-batch. Смена агента ломала завод молча — `spawn` падал
 * с ENOENT уже внутри крона, в логе, который никто не читает до алерта.
 *
 * Теперь имя и раскладка аргументов живут здесь. Профиль выбирается
 * переменной CONTENT_FACTORY_CLI; по умолчанию claude, то есть без настройки
 * поведение прежнее.
 *
 * Профиль codex добавлен как заготовка: раскладка аргументов у него другая,
 * и проверить её на живом запуске пока не на чем. Если синтаксис разойдётся
 * с реальностью — правится одна строка здесь, а не четыре файла.
 */

import { spawnSync } from 'child_process'
import { existsSync } from 'fs'
import os from 'os'
import path from 'path'

export interface AgentInvocation {
  cmd: string
  args: string[]
}

export interface AgentOptions {
  /** Модель, если CLI умеет её принимать. */
  model?: string
  /** Профиль агента из ~/.claude/agents — только для claude. */
  agent?: string
  /** Список разрешённых инструментов — только для claude. */
  allowedTools?: string
  /**
   * Промпт уйдёт через stdin, а не аргументом.
   *
   * Так работают writer и analyst: контент-план и три черновика не помещаются
   * в argv и роняют spawn с E2BIG. Передавайте true и пишите промпт в stdin
   * дочернего процесса.
   */
  promptViaStdin?: boolean
}

type Profile = (prompt: string, opts: AgentOptions) => AgentInvocation

/** Инструменты Claude Code, способные изменить файлы или выполнить команду. */
const WRITING_TOOLS = ['write', 'edit', 'bash', 'notebookedit']

/**
 * Во что превращается белый список инструментов на CLI с песочницей.
 *
 * Список вида `Read,Skill,Glob,Grep` — это «смотреть можно, трогать нельзя»,
 * и ровно это выражает read-only. Появится в списке Write, Edit или Bash —
 * агенту нужна запись, и песочница расширяется до рабочей директории.
 */
export function sandboxFor(allowedTools: string): 'read-only' | 'workspace-write' {
  const tools = allowedTools
    .toLowerCase()
    .split(',')
    .map((t) => t.trim())
  return tools.some((t) => WRITING_TOOLS.includes(t)) ? 'workspace-write' : 'read-only'
}

const PROFILES: Record<string, Profile> = {
  claude(prompt, { model, agent, allowedTools, promptViaStdin }) {
    const args = ['-p']
    if (model) args.push('--model', model)
    if (agent) {
      // --allowedTools обязателен рядом с --agent: без него скилл не грузится
      // и агент честно отвечает «доступ не выдан». Проверено живым прогоном.
      args.push('--agent', agent)
      if (allowedTools) args.push('--allowedTools', allowedTools)
    }
    if (!promptViaStdin) args.push(prompt)
    return { cmd: 'claude', args }
  },

  codex(prompt, { model, agent, allowedTools, promptViaStdin }) {
    // Роль у Codex задаётся профилем корневой сессии: --profile <name> читает
    // $CODEX_HOME/<name>.config.toml с полем developer_instructions. Это прямой
    // аналог `claude --agent`: инструкции уходят системным слоем, а не
    // приклеиваются к промпту. Проверено живьём 28.08.2026 — субагент с
    // agent_type=writer назвал скилл из карты задач профиля.
    //
    // Файлы профилей генерируются из тех же ~/.claude/agents/*.md скриптом
    // /home/claude/tools/codex-parity/sync-agents.py, чтобы источник правды
    // остался один.
    //
    // --allowedTools аналога не имеет: у Codex разрешения задаются песочницей
    // и политикой одобрения, а не белым списком инструментов.
    const args = ['exec']
    if (model) args.push('--model', model)
    if (agent) args.push('--profile', agent)
    // Аналог --allowedTools. У Codex белого списка инструментов нет, но цель
    // была не в списке: агенту незачем править репозиторий посреди генерации
    // статьи. Песочница закрывает это надёжнее — запись блокирует система, а
    // не готовность модели соблюдать ограничение.
    //
    // Проверено 28.08.2026: под read-only агент отказывается создавать файл
    // («ЗАПРЕЩЕНО», файла нет), при этом читает исходники и видит свои скиллы.
    if (allowedTools) args.push('--sandbox', sandboxFor(allowedTools))
    if (!promptViaStdin) args.push(prompt)
    return { cmd: process.env.CONTENT_FACTORY_CLI_BIN || 'codex', args }
  },
}

/**
 * Порядок автовыбора, когда CONTENT_FACTORY_CLI не задан.
 *
 * Claude первым не по симпатии, а по функционалу: только у него есть профили
 * агентов (`--agent`) и белые списки инструментов. У Codex роль приходится
 * вкладывать в текст промпта — см. lib/agent-role.ts, — и это заведомо слабее.
 */
const CLI_PREFERENCE = ['claude', 'codex'] as const

/** Установлен ли бинарник. Дешевле, чем узнать об этом из ENOENT внутри крона. */
function cliInstalled(name: string): boolean {
  const bin = name === 'codex' ? process.env.CONTENT_FACTORY_CLI_BIN || 'codex' : name
  const res = spawnSync('sh', ['-c', `command -v ${bin}`], { stdio: 'ignore' })
  return res.status === 0
}

/**
 * Какой CLI брать.
 *
 * Явная настройка выигрывает всегда: если Тони поставил в .env конкретный
 * профиль, подменять его молча нельзя. Без настройки берём первый
 * установленный из CLI_PREFERENCE.
 */
export function resolveAgentCli(): string {
  const explicit = process.env.CONTENT_FACTORY_CLI
  if (explicit) return explicit
  for (const name of CLI_PREFERENCE) {
    if (cliInstalled(name)) return name
  }
  return 'claude'
}

export const AGENT_CLI = resolveAgentCli()

/**
 * Похожа ли ошибка на «этот CLI вообще не может выполнить запуск».
 *
 * 28.08.2026 завод встал целиком: в .env стояла модель gpt-5.6-sol, а
 * установленный codex-cli 0.130.0 ответил 400 «requires a newer version of
 * Codex». Статья за день не вышла. Автономность означает, что на такой отказ
 * завод обязан переехать на второй CLI и опубликовать, а не умереть.
 *
 * Список намеренно узкий. Отказ по существу задачи — модель не справилась,
 * упёрлась в лимит — под откат не подпадает: там второй CLI даст то же самое,
 * а мы потратим второй прогон и скроем настоящую причину.
 */
export function isCliLevelFailure(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('requires a newer version') ||
    m.includes('unknown model') ||
    m.includes('model not found') ||
    m.includes('unsupported model') ||
    m.includes('enoent') ||
    m.includes('command not found') ||
    m.includes('not recognized')
  )
}

/** Второй CLI на случай отката. null, если запасного нет или он не установлен. */
export function fallbackCli(current: string): string | null {
  const other = CLI_PREFERENCE.find((n) => n !== current)
  if (!other) return null
  return cliInstalled(other) ? other : null
}

/**
 * Собирает команду запуска. Неизвестный профиль — сразу ошибка, а не тихий
 * запуск не того бинарника: молчаливая подмена агента однажды уже стоила нам
 * суток работы завода.
 */
export function buildAgentCommand(
  prompt: string,
  opts: AgentOptions = {},
  cli: string = AGENT_CLI
): AgentInvocation {
  const profile = PROFILES[cli]
  if (!profile) {
    throw new Error(
      `Неизвестный CONTENT_FACTORY_CLI=«${cli}». Доступные: ${Object.keys(PROFILES).join(', ')}`
    )
  }
  return profile(prompt, opts)
}

/**
 * Умеет ли CLI взять роль файлом, а не текстом в промпте.
 *
 * У Claude Code это `--agent <name>` и профиль ~/.claude/agents/<name>.md.
 * У Codex — `--profile <name>` и $CODEX_HOME/<name>.config.toml; файлы для
 * него генерируются из тех же профилей Claude, см. sync-agents.py.
 *
 * Для Codex проверяем файл на диске: если синхронизация не отработала, честнее
 * вложить роль в текст промпта (lib/agent-role.ts), чем запустить агента
 * с флагом на несуществующий профиль и получить сессию без роли.
 */
export function supportsAgentProfiles(cli: string = AGENT_CLI, agent?: string): boolean {
  if (cli === 'claude') return true
  if (cli === 'codex') {
    if (!agent) return true
    const home = process.env.CODEX_HOME || path.join(os.homedir(), '.codex')
    return existsSync(path.join(home, `${agent}.config.toml`))
  }
  return false
}
