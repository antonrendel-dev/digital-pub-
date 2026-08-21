import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  RUNAWAY_TURNS,
  collectSessionStats,
  runawayWarning,
  summarize,
  transcriptDir,
} from '../../scripts/content-factory/lib/session-stats'

describe('transcriptDir', () => {
  it('превращает путь cwd в имя каталога транскриптов', () => {
    expect(
      transcriptDir('/home/claude/projects/digital-pub-/scripts/content-factory', '/home/x')
    ).toBe('/home/x/.claude/projects/-home-claude-projects-digital-pub--scripts-content-factory')
  })
})

describe('runawayWarning', () => {
  it('молчит, когда все сессии в норме', () => {
    expect(runawayWarning([{ agent: 'writer', turns: 10, sizeKb: 240 }])).toBeNull()
  })

  it('не срабатывает ровно под порогом', () => {
    expect(runawayWarning([{ agent: 'writer', turns: RUNAWAY_TURNS - 1, sizeKb: 300 }])).toBeNull()
  })

  it('называет залипший агент и число ходов', () => {
    const warning = runawayWarning([
      { agent: 'writer', turns: 33, sizeKb: 303 },
      { agent: 'seo', turns: 8, sizeKb: 90 },
    ])
    expect(warning).toContain('writer: 33 ходов')
    expect(warning).not.toContain('seo')
  })
})

describe('summarize', () => {
  it('складывает ходы и вес', () => {
    expect(
      summarize([
        { agent: 'writer', turns: 10, sizeKb: 240 },
        { agent: 'seo', turns: 4, sizeKb: 60 },
      ])
    ).toBe('сессий 2, ходов 14, вес 300K')
  })
})

describe('collectSessionStats', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sess-'))

  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('считает ходы, читает профиль агента и переживает битую строку', () => {
    const file = path.join(dir, 'a.jsonl')
    fs.writeFileSync(
      file,
      [
        '{"type":"agent-setting","agentSetting":"analyst"}',
        '{"type":"user"}',
        '{"type":"assistant"}',
        '{"type":"assistant"}',
        '{"type":"assistant"',
      ].join('\n')
    )

    const [stat] = collectSessionStats(0, dir)
    expect(stat.agent).toBe('analyst')
    expect(stat.turns).toBe(2)
  })

  it('отсекает сессии старше начала прогона', () => {
    expect(collectSessionStats(Date.now() + 60_000, dir)).toEqual([])
  })

  it('возвращает пусто, если каталога нет — замер необязателен', () => {
    expect(collectSessionStats(0, path.join(dir, 'нет-такого'))).toEqual([])
  })
})
