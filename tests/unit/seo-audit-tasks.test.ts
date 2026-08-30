import {
  DEDUP_PREFIX,
  MAX_NEW_TASKS_PER_RUN,
  describeFinding,
  describeGroup,
  extractDedupKeys,
  groupFindings,
  matchesFinding,
  matchesGroup,
  mergeNote,
} from '../../scripts/seo-audit/task-format'
import type { Finding } from '../../scripts/seo-audit/findings'

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

describe('сверка с тем, что уже есть на доске', () => {
  const finding: Finding = {
    type: 'near-top10',
    key: 'вакансии smm',
    title: 'Ключ «вакансии smm» на 12 — кандидат на дожим',
    detail: 'подробности',
    dedupKey: 'near-top10:вакансии smm',
    score: { s: 18, g: 15, r: 0, a: 18, total: 51 },
  }

  it('свою задачу узнаёт по метке', () => {
    const task = { content: 'что угодно', description: describeFinding(finding) }
    expect(matchesFinding(finding, task)).toBe('mark')
  })

  // Задачи, заведённые руками, метки не имеют. Плодить рядом с ними
  // автоматический дубль про тот же ключ незачем.
  it('заведённую руками узнаёт по упоминанию ключа', () => {
    expect(
      matchesFinding(finding, { content: 'Дожать вакансии SMM до топ-10', description: '' })
    ).toBe('text')
  })

  it('чужую задачу не трогает', () => {
    expect(matchesFinding(finding, { content: 'Новый дизайн сайта', description: '' })).toBeNull()
  })

  // Короткий ключ вроде «hr» попадётся в половине заголовков доски.
  it('слишком короткий ключ по тексту не матчит', () => {
    const short = { ...finding, key: 'hr', dedupKey: 'near-top10:hr' }
    expect(matchesFinding(short, { content: 'Личный кабинет HR', description: '' })).toBeNull()
  })

  it('пустая задача не ломает сверку', () => {
    expect(matchesFinding(finding, {})).toBeNull()
  })
})

describe('дописывание в существующую задачу', () => {
  const finding: Finding = {
    type: 'position-drop',
    key: 'резюме дизайнера',
    title: 'Ключ «резюме дизайнера» просел на 7: 12 → 19',
    detail: 'проверить страницу',
    dedupKey: 'position-drop:резюме дизайнера',
    score: { s: 12, g: 18, r: 0, a: 18, total: 48 },
  }

  it('блок датирован и несёт метку, чтобы второй раз не дописаться', () => {
    const note = mergeNote(finding, '2026-09-15')
    expect(note).toContain('ОБНОВЛЕНИЕ SEO-КРОНА 2026-09-15')
    expect(note).toContain('12 → 19')
    expect(note).toContain(`${DEDUP_PREFIX} position-drop:резюме дизайнера`)
  })

  it('после дописывания задача узнаётся по метке и повторно не трогается', () => {
    const task = { content: 'Дожать резюме дизайнера', description: 'исходное описание' }
    task.description += mergeNote(finding, '2026-09-15')
    expect(matchesFinding(finding, task)).toBe('mark')
  })
})

describe('порог на прогон', () => {
  it('задан и разумен', () => {
    expect(MAX_NEW_TASKS_PER_RUN).toBeGreaterThan(0)
    expect(MAX_NEW_TASKS_PER_RUN).toBeLessThanOrEqual(20)
  })
})

describe('пачки однотипных находок', () => {
  /**
   * До 30.08.2026 каждая находка становилась отдельной карточкой, и один
   * прогон выкладывал на доску двенадцать штук «ключ X на 14 — кандидат на
   * дожим». Это не двенадцать задач, а одна работа списком.
   */
  const finding = (type: Finding['type'], key: string, total = 50): Finding => ({
    type,
    key,
    title: `Ключ «${key}» — ${type}`,
    detail: 'подробности',
    dedupKey: `${type}:${key}`,
    score: { s: total - 36, g: 18, r: 0, a: 18, total },
  })

  it('три однотипные находки собираются в одну задачу', () => {
    const g = groupFindings([
      finding('near-top10', 'ключ один'),
      finding('near-top10', 'ключ два'),
      finding('near-top10', 'ключ три'),
    ])
    expect(g).toHaveLength(1)
    expect(g[0].title).toBe('3 ключей в шаге от топ-10 — пачка на дожим')
    expect(g[0].findings).toHaveLength(3)
  })

  it('две находки остаются порознь — обобщать нечего', () => {
    const g = groupFindings([finding('near-top10', 'ключ один'), finding('near-top10', 'ключ два')])
    expect(g).toHaveLength(2)
    expect(g.every((x) => x.findings.length === 1)).toBe(true)
  })

  it('разные типы не смешиваются в одну пачку', () => {
    const g = groupFindings([
      ...['а', 'б', 'в'].map((k) => finding('near-top10', k)),
      ...['г', 'д', 'е'].map((k) => finding('zero-clicks', k)),
    ])
    expect(g).toHaveLength(2)
    expect(new Set(g.map((x) => x.type))).toEqual(new Set(['near-top10', 'zero-clicks']))
  })

  it('балл пачки берётся по самой тяжёлой находке', () => {
    const g = groupFindings([
      finding('near-top10', 'дешёвый', 40),
      finding('near-top10', 'дорогой', 72),
      finding('near-top10', 'средний', 55),
    ])
    expect(g[0].score.total).toBe(72)
  })

  it('в описании пачки лежит метка каждой находки — дедуп поштучный', () => {
    const g = groupFindings(['а', 'б', 'в'].map((k) => finding('near-top10', k)))
    const desc = describeGroup(g[0])
    expect(desc).toContain('near-top10:а')
    expect(desc).toContain('near-top10:б')
    expect(desc).toContain('near-top10:в')
    expect(desc).toContain('СПИСОК (3):')
    // метка типа — по ней находка, появившаяся позже, допишется в эту же пачку
    expect(matchesGroup('near-top10', { description: desc })).toBe(true)
    expect(matchesGroup('zero-clicks', { description: desc })).toBe(false)
  })

  it('одиночная находка описывается как раньше, без списка', () => {
    const g = groupFindings([finding('wrong-page', 'один ключ')])
    const desc = describeGroup(g[0])
    expect(desc).not.toContain('СПИСОК')
    expect(desc).toContain('wrong-page:один ключ')
  })

  it('находка из пачки узнаётся дедупом поштучно', () => {
    const g = groupFindings(['а', 'б', 'в'].map((k) => finding('near-top10', k)))
    const task = { content: g[0].title, description: describeGroup(g[0]) }
    expect(matchesFinding(finding('near-top10', 'б'), task)).toBe('mark')
  })
})
