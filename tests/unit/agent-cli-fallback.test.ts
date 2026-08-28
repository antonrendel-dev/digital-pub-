/**
 * Завод обязан пережить отказ одного CLI и опубликовать на втором.
 *
 * 28.08.2026 статья за день не вышла вовсе: в .env стояла модель
 * `gpt-5.6-sol`, установленный codex-cli 0.130.0 ответил 400 «requires a
 * newer version of Codex», writer упал с кодом 1, планировщик отбил алерт —
 * и всё. Второй CLI на машине стоял и работал.
 *
 * Проверки ниже держат три вещи: отказ уровня запуска отличается от отказа
 * по существу задачи, у второго CLI берётся ЕГО модель, а не чужая, и явная
 * настройка в .env никогда не подменяется молча.
 */

const ORIGINAL = {
  cli: process.env.CONTENT_FACTORY_CLI,
  model: process.env.CONTENT_FACTORY_MODEL,
}

function reload() {
  jest.resetModules()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../scripts/content-factory/lib/agent-cli')
}

function reloadModel() {
  jest.resetModules()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../scripts/content-factory/lib/model')
}

afterEach(() => {
  if (ORIGINAL.cli === undefined) delete process.env.CONTENT_FACTORY_CLI
  else process.env.CONTENT_FACTORY_CLI = ORIGINAL.cli
  if (ORIGINAL.model === undefined) delete process.env.CONTENT_FACTORY_MODEL
  else process.env.CONTENT_FACTORY_MODEL = ORIGINAL.model
  jest.resetModules()
})

describe('отказ уровня CLI отличается от отказа по существу', () => {
  const { isCliLevelFailure } = reload()

  it('ловит ровно тот ответ, на котором встал завод 28.08', () => {
    expect(
      isCliLevelFailure(
        "The 'gpt-5.6-sol' model requires a newer version of Codex. Please upgrade to the latest app or CLI and try again."
      )
    ).toBe(true)
  })

  it('ловит отсутствие бинарника', () => {
    expect(isCliLevelFailure('spawn codex ENOENT')).toBe(true)
    expect(isCliLevelFailure('sh: 1: codex: command not found')).toBe(true)
  })

  it('НЕ считает отказом запуска содержательную неудачу', () => {
    // Иначе откат съест второй прогон и спрячет настоящую причину:
    // на втором CLI модель упрётся ровно в то же самое.
    expect(isCliLevelFailure('Превышен лимит контекста')).toBe(false)
    expect(isCliLevelFailure('claude завершился с кодом 1')).toBe(false)
    expect(isCliLevelFailure('Агент отказался выполнять задачу')).toBe(false)
    expect(isCliLevelFailure('rate limit exceeded')).toBe(false)
  })
})

describe('выбор CLI', () => {
  it('явная настройка не подменяется молча', () => {
    process.env.CONTENT_FACTORY_CLI = 'codex'
    expect(reload().resolveAgentCli()).toBe('codex')
  })

  it('без настройки берётся claude — у него есть профили агентов', () => {
    delete process.env.CONTENT_FACTORY_CLI
    expect(reload().resolveAgentCli()).toBe('claude')
  })

  it('у claude запасной — codex, и наоборот', () => {
    const { fallbackCli } = reload()
    expect(fallbackCli('claude')).toBe('codex')
    expect(fallbackCli('codex')).toBe('claude')
  })

  it('команда собирается для явно переданного CLI, а не только для текущего', () => {
    // Без этого откат бы собрал команду прежнего CLI и упал второй раз.
    process.env.CONTENT_FACTORY_CLI = 'claude'
    const { buildAgentCommand } = reload()
    const { cmd, args } = buildAgentCommand('', { model: 'gpt-5.5' }, 'codex')
    expect(cmd).toBe('codex')
    expect(args[0]).toBe('exec')
  })

  it('профили агентов есть только у claude, для любого переданного CLI', () => {
    const { supportsAgentProfiles } = reload()
    expect(supportsAgentProfiles('claude')).toBe(true)
    expect(supportsAgentProfiles('codex')).toBe(false)
  })
})

describe('модель считается отдельно для каждого CLI', () => {
  it('чужая модель из .env не уезжает во второй CLI', () => {
    // Ровно эта склейка делала откат бесполезным: codex падал на своей
    // модели, claude получал её же и падал следом.
    process.env.CONTENT_FACTORY_CLI = 'codex'
    process.env.CONTENT_FACTORY_MODEL = 'gpt-5.6-sol'
    const { modelFor } = reloadModel()
    expect(modelFor('codex')).toBe('gpt-5.6-sol')
    expect(modelFor('claude')).toBe('claude-opus-5')
  })

  it('без настройки у каждого CLI своё умолчание', () => {
    delete process.env.CONTENT_FACTORY_CLI
    delete process.env.CONTENT_FACTORY_MODEL
    const { modelFor } = reloadModel()
    expect(modelFor('claude')).toBe('claude-opus-5')
    expect(modelFor('codex')).toBe('gpt-5.5')
  })

  it('модель без указания CLI применяется к текущему', () => {
    delete process.env.CONTENT_FACTORY_CLI
    process.env.CONTENT_FACTORY_MODEL = 'claude-sonnet-5'
    const { modelFor } = reloadModel()
    expect(modelFor('claude')).toBe('claude-sonnet-5')
  })
})
