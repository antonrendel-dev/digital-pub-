import {
  buildAgentCommand,
  supportsAgentProfiles,
} from '../../scripts/content-factory/lib/agent-cli'

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

  it('claude берёт роль файлом', () => {
    expect(supportsAgentProfiles()).toBe(true)
  })

  it('неизвестный профиль падает сразу, а не запускает чужой бинарник', () => {
    jest.resetModules()
    process.env.CONTENT_FACTORY_CLI = 'нет-такого'
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../scripts/content-factory/lib/agent-cli')
    expect(() => mod.buildAgentCommand('x', {})).toThrow(/нет-такого/)
  })

  it('codex получает роль через --profile, а не через --agent', () => {
    // 28.08.2026 выяснено живым прогоном: у codex-cli 0.150.1 роль корневой
    // сессии задаётся `--profile <name>` и файлом $CODEX_HOME/<name>.config.toml.
    // Флага --agent у него нет, --allowedTools аналога не имеет.
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
    expect(args[0]).toBe('exec')
    expect(args).toContain('--profile')
    expect(args[args.indexOf('--profile') + 1]).toBe('analyst')
    expect(args).not.toContain('--agent')
    expect(args).not.toContain('--allowedTools')
    // Белого списка у Codex нет, но цель списка — «смотреть можно, трогать
    // нельзя» — выражается песочницей, и надёжнее: запись блокирует система.
    expect(args).toContain('--sandbox')
    expect(args[args.indexOf('--sandbox') + 1]).toBe('read-only')
  })

  it('песочница расширяется, только если агенту правда нужна запись', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { sandboxFor } = require('../../scripts/content-factory/lib/agent-cli')
    expect(sandboxFor('Read,Skill,Glob,Grep')).toBe('read-only')
    expect(sandboxFor('Read, Glob')).toBe('read-only')
    expect(sandboxFor('Read,Write')).toBe('workspace-write')
    expect(sandboxFor('Read,Bash')).toBe('workspace-write')
    expect(sandboxFor('Edit')).toBe('workspace-write')
  })

  it('без белого списка песочница не навязывается', () => {
    // regen зовёт CLI без ограничений — подсовывать ему read-only молча нельзя.
    jest.resetModules()
    process.env.CONTENT_FACTORY_CLI = 'codex'
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../scripts/content-factory/lib/agent-cli')
    const { args } = mod.buildAgentCommand('промпт', { model: 'm' })
    expect(args).not.toContain('--sandbox')
  })

  it('без файла профиля codex честно сообщает, что роль файлом не возьмёт', () => {
    // Иначе агент уедет с флагом на несуществующий профиль и молча потеряет
    // роль — ровно та тихая потеря, ради которой заведён lib/agent-role.ts.
    jest.resetModules()
    process.env.CONTENT_FACTORY_CLI = 'codex'
    process.env.CODEX_HOME = '/tmp/нет-такого-codex-home'
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../scripts/content-factory/lib/agent-cli')
    expect(mod.supportsAgentProfiles('codex', 'analyst')).toBe(false)
    delete process.env.CODEX_HOME
  })
})
