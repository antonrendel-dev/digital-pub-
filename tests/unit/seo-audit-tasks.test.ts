import {
  DEDUP_PREFIX,
  describeFinding,
  extractDedupKeys,
  parseSelection,
} from '../../scripts/seo-audit/task-format'
import type { Finding } from '../../scripts/seo-audit/findings'

describe('разбор выбора из Telegram', () => {
  it('номера человеческие, с единицы', () => {
    expect(parseSelection(['1', '3'], 5)).toEqual([0, 2])
  })

  it('пустой ввод и «all» берут всё', () => {
    expect(parseSelection([], 3)).toEqual([0, 1, 2])
    expect(parseSelection(['all'], 3)).toEqual([0, 1, 2])
    expect(parseSelection(['все'], 2)).toEqual([0, 1])
  })

  it('запятые и лишние пробелы допустимы', () => {
    expect(parseSelection(['1,', '2', ' , 3'], 4)).toEqual([0, 1, 2])
  })

  // Номера приходят из чата: там бывает и мусор, и промах пальцем.
  it('несуществующие номера и мусор отбрасываются', () => {
    expect(parseSelection(['0', '9', 'abc', '-2', '2'], 3)).toEqual([1])
  })

  it('дубли схлопываются', () => {
    expect(parseSelection(['2', '2', '2'], 3)).toEqual([1])
  })
})

describe('метка для дедупликации', () => {
  const finding: Finding = {
    type: 'near-top10',
    key: 'вакансии smm',
    title: 'Ключ на 12 — кандидат на дожим',
    detail: 'подробности',
    dedupKey: 'near-top10:вакансии smm',
    score: { s: 18, g: 15, r: 0, a: 18, total: 51 },
  }

  it('описание задачи начинается с балла в машиночитаемом виде', () => {
    expect(describeFinding(finding)).toMatch(/^БАЛЛ: 51\/100/)
  })

  it('в описание кладётся метка, по которой находка узнаётся в следующий раз', () => {
    const desc = describeFinding(finding)
    expect(desc).toContain(`${DEDUP_PREFIX} near-top10:вакансии smm`)
    // Ключ содержит пробел. Если читать метку до первого пробела, половина
    // ключей не совпадёт и крон заведёт дубли.
    expect(extractDedupKeys([{ description: desc }])).toEqual(new Set(['near-top10:вакансии smm']))
  })

  it('задачи без метки не мешают', () => {
    expect(extractDedupKeys([{ description: 'обычная задача' }, { description: null }]).size).toBe(
      0
    )
  })
})
