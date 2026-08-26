import { buildAgentCommand, supportsAgentProfiles } from '../../scripts/content-factory/lib/agent-cli'

/**
 * Завод не должен ломаться от смены агента.
 *
 * До 26.08.2026 имя `claude` было зашито в четырёх файлах, и переключение
 * агента уронило бы spawn с ENOENT прямо в кроне — в логе, который читают
 * только после алерта. Проверки ниже держат две вещи: поведение по умолчанию
 * не изменилось, и неизвестный профиль падает сразу, а не запускает не тот
 * бинарник молча.
 */
describe('выбор CLI-агента', () => {
  const ORIGINAL = process.env.CONTENT_FACTORY_CLI

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.CONTENT_FACTORY_CLI
    else process.env.CONTENT_FACTORY_CLI = ORIGINAL
    jest.resetModules()
  })

  it('без настройки собирает ровно ту команду, что была до правки', () => {
    // Прежний вызов analyst: ['-p', '--model', M, '--agent', A, '--allowedTools', T]
    // с промптом через stdin. Любое расхождение здесь — регрессия завода.
    const { cmd, args } = buildAgentCommand('', {
      model: 'claude-opus-5',
      agent: 'analyst',
      allowedTools: 'Read,Bash',
      promptViaStdin: true,
    })
    expect(cmd).toBe('claude')
    expect(args).toEqual([
      '-p',
      '--model',
      'claude-opus-5',
      '--agent',
      'analyst',
      '--allowedTools',
      'Read,Bash',
    ])
  })

  it('без stdin промпт уходит последним аргументом — как в regen', () => {
    const { cmd, args } = buildAgentCommand('текст промпта', { model: 'claude-opus-5' })
    expect(cmd).toBe('claude')
    expect(args).toEqual(['-p', '--model', 'claude-opus-5', 'текст промпта'])
  })

  it('промпт через stdin не попадает в аргументы', () => {
    // Иначе длинный контент-план упрётся в ARG_MAX и spawn упадёт с E2BIG.
    const { args } = buildAgentCommand('очень длинный промпт', {
      model: 'm',
      promptViaStdin: true,
    })
    expect(args).not.toContain('очень длинный промпт')
  })

  it('профили агентов доступны только у claude', () => {
    // У codex нет ни --agent, ни --allowedTools: это механизм Claude Code.
    expect(supportsAgentProfiles()).toBe(true)
  })

  it('неизвестный профиль падает сразу, а не запускает чужой бинарник', () => {
    jest.resetModules()
    process.env.CONTENT_FACTORY_CLI = 'нет-такого'
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../scripts/content-factory/lib/agent-cli')
    expect(() => mod.buildAgentCommand('x', {})).toThrow(/нет-такого/)
  })

  it('профиль codex собирается и не тащит claude-only флаги', () => {
    jest.resetModules()
    process.env.CONTENT_FACTORY_CLI = 'codex'
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../scripts/content-factory/lib/agent-cli')
    const { cmd, args } = mod.buildAgentCommand('промпт', {
      model: 'm',
      agent: 'analyst',
      allowedTools: 'Read',
    })
    expect(cmd).toBe('codex')
    expect(args).not.toContain('--agent')
    expect(args).not.toContain('--allowedTools')
    expect(args[0]).toBe('exec')
  })
})
