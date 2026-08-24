import {
  buildFindings,
  filterKnown,
  THRESHOLDS,
  type Finding,
  type Snapshot,
} from '../../scripts/seo-audit/findings'

const snap = (
  positions: Record<string, number | null>,
  extra: Record<string, unknown> = {}
): Snapshot => ({
  topvisor: { ok: true, data: { positions } },
  metrika: { ok: true, data: { topPages: [] } },
  webmaster: { ok: true, data: { queries: [] } },
  ...extra,
})

const types = (f: Finding[]) => f.map((x) => x.type)

describe('позиции', () => {
  it('выход из топ-10 важнее обычного падения', () => {
    const f: Finding[] = buildFindings(snap({ ключ: 7 }), snap({ ключ: 14 }))
    expect(types(f)).toEqual(['left-top10'])
    expect(f[0].title).toContain('7 → 14')
  })

  // Регрессия по здравому смыслу: «дальше сотни» в снапшоте лежит как null.
  // Если сравнивать напрямую, выпадение из топа выглядит как улучшение.
  it('падение за сотню читается как выход из топа, а не как рост', () => {
    const f: Finding[] = buildFindings(snap({ ключ: 5 }), snap({ ключ: null }))
    expect(types(f)).toEqual(['left-top10'])
    expect(f[0].title).toContain('>100')
  })

  it('падение внутри сотни ловится от порога и не раньше', () => {
    const ниже = buildFindings(snap({ к: 40 }), snap({ к: 40 + THRESHOLDS.DROP_THRESHOLD - 1 }))
    expect(ниже.filter((x: Finding) => x.type === 'position-drop')).toHaveLength(0)

    const сработало = buildFindings(snap({ к: 40 }), snap({ к: 40 + THRESHOLDS.DROP_THRESHOLD }))
    expect(types(сработало)).toContain('position-drop')
  })

  it('рост позиции поводом не считается', () => {
    expect(buildFindings(snap({ к: 30 }), snap({ к: 4 }))).toHaveLength(0)
  })

  it('коридор 11–30 помечается как кандидат на дожим', () => {
    const f: Finding[] = buildFindings(snap({ к: 12 }), snap({ к: 12 }))
    expect(types(f)).toEqual(['near-top10'])
    expect(f[0].title).toContain('дожим')
  })

  it('одна находка на ключ, а не две', () => {
    // 8 → 15 это и выход из топ-10, и попадание в коридор дожима
    const f: Finding[] = buildFindings(snap({ к: 8 }), snap({ к: 15 }))
    expect(f).toHaveLength(1)
    expect(f[0].type).toBe('left-top10')
  })

  it('новый ключ без прошлой позиции не считается упавшим', () => {
    const f: Finding[] = buildFindings(snap({}), snap({ новый: 55 }))
    expect(f).toHaveLength(0)
  })

  it('сломанный источник не роняет разбор', () => {
    const битый: Snapshot = { topvisor: { ok: false } }
    expect(() => buildFindings(битый, snap({ к: 5 }))).not.toThrow()
    expect(buildFindings(snap({ к: 5 }), битый)).toEqual([])
  })
})

describe('просмотры страниц', () => {
  const withPages = (pages: Array<{ path: string; pageviews: number }>) => ({
    topvisor: { ok: true, data: { positions: {} } },
    metrika: { ok: true, data: { topPages: pages } },
    webmaster: { ok: true, data: { queries: [] } },
  })

  it('обвал больше половины — повод', () => {
    const f: Finding[] = buildFindings(
      withPages([{ path: '/vacancies/smm', pageviews: 100 }]),
      withPages([{ path: '/vacancies/smm', pageviews: 40 }])
    )
    expect(types(f)).toEqual(['pageviews-drop'])
    expect(f[0].title).toContain('60%')
  })

  // Мелкие числа скачут сами по себе: 4 просмотра против 2 это «падение на 50%»,
  // но говорить тут не о чем.
  it('мелкая статистика игнорируется', () => {
    const f = buildFindings(
      withPages([{ path: '/x', pageviews: THRESHOLDS.PAGEVIEW_FLOOR - 1 }]),
      withPages([{ path: '/x', pageviews: 0 }])
    )
    expect(f).toHaveLength(0)
  })
})

describe('показы без кликов', () => {
  const withQueries = (queries: Array<{ query: string; shows: number; clicks: number }>) => ({
    topvisor: { ok: true, data: { positions: {} } },
    metrika: { ok: true, data: { topPages: [] } },
    webmaster: { ok: true, data: { queries } },
  })

  it('много показов и ноль кликов — повод', () => {
    const f: Finding[] = buildFindings(
      withQueries([]),
      withQueries([{ query: 'вакансии smm', shows: THRESHOLDS.ZERO_CLICK_SHOWS, clicks: 0 }])
    )
    expect(types(f)).toEqual(['zero-clicks'])
  })

  it('есть клики — повода нет', () => {
    const f = buildFindings(withQueries([]), withQueries([{ query: 'x', shows: 500, clicks: 1 }]))
    expect(f).toHaveLength(0)
  })
})

describe('порядок и дедупликация', () => {
  it('сортировка по баллу, тяжёлое сверху', () => {
    const f: Finding[] = buildFindings(snap({ дожим: 12, топ: 6 }), snap({ дожим: 12, топ: 20 }))
    expect(f[0].type).toBe('left-top10')
    expect(f[0].score.total).toBeGreaterThan(f[1].score.total)
  })

  it('уже заведённые задачи отбрасываются', () => {
    const f: Finding[] = buildFindings(snap({ a: 12, b: 15 }), snap({ a: 12, b: 15 }))
    expect(f).toHaveLength(2)
    expect(filterKnown(f, ['near-top10:a'])).toHaveLength(1)
  })
})
