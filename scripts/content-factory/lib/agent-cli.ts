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

  codex(prompt, { model, promptViaStdin }) {
    // Заготовка. Codex не принимает --agent и --allowedTools — профили агентов
    // и белые списки инструментов относятся к Claude Code, аналога у него нет.
    const args = ['exec']
    if (model) args.push('--model', model)
    if (!promptViaStdin) args.push(prompt)
    return { cmd: process.env.CONTENT_FACTORY_CLI_BIN || 'codex', args }
  },
}

export const AGENT_CLI = process.env.CONTENT_FACTORY_CLI || 'claude'

/**
 * Собирает команду запуска. Неизвестный профиль — сразу ошибка, а не тихий
 * запуск не того бинарника: молчаливая подмена агента однажды уже стоила нам
 * суток работы завода.
 */
export function buildAgentCommand(prompt: string, opts: AgentOptions = {}): AgentInvocation {
  const profile = PROFILES[AGENT_CLI]
  if (!profile) {
    throw new Error(
      `Неизвестный CONTENT_FACTORY_CLI=«${AGENT_CLI}». Доступные: ${Object.keys(PROFILES).join(', ')}`
    )
  }
  return profile(prompt, opts)
}

/** Поддерживает ли текущий профиль профили агентов и белые списки инструментов. */
export function supportsAgentProfiles(): boolean {
  return AGENT_CLI === 'claude'
}
