import {
  CHARS_PER_MINUTE,
  NOT_READ_SECONDS,
  READ_SHARE,
  displayShare,
  groupArticles,
  isInTop,
  isRead,
  readShare,
  type ArticleRow,
} from '../../scripts/seo-audit/articles'

const row = (over: Partial<ArticleRow> = {}): ArticleRow => ({
  slug: 'x',
  visits: 10,
  seconds: 100,
  expectedSeconds: 600,
  share: 100 / 600,
  position: null,
  leftPage: false,
  ...over,
})

describe('глубина чтения', () => {
  it('считается от времени, нужного на прочтение', () => {
    // 12 000 знаков — это ровно десять минут при 1200 знаках в минуту.
    const chars = CHARS_PER_MINUTE * 10
    expect(readShare(600, chars)).toBeCloseTo(1)
    expect(readShare(300, chars)).toBeCloseTo(0.5)
  })

  it('одинаковое время на разных статьях означает разное', () => {
    // Две минуты на короткой статье — прочитал, на длинной — пролистал.
    const short = readShare(120, 3000)
    const long = readShare(120, 30000)
    expect(short).toBeGreaterThan(long)
    expect(short).toBeGreaterThan(READ_SHARE)
    expect(long).toBeLessThan(READ_SHARE)
  })

  it('пустая или битая длина не даёт деления на ноль', () => {
    expect(readShare(100, 0)).toBe(0)
    expect(readShare(100, -5)).toBe(0)
  })
})

describe('признак «читали»', () => {
  it('короткий визит не считается чтением ни при какой доле', () => {
    // Порог в 30 секунд отсекает случаи, где доля высока только потому,
    // что статья совсем короткая.
    expect(isRead(row({ seconds: NOT_READ_SECONDS - 1, share: 0.9 }))).toBe(false)
  })

  it('длинный визит с низкой долей — тоже не чтение', () => {
    expect(isRead(row({ seconds: 200, share: 0.05 }))).toBe(false)
  })

  it('оба условия вместе дают чтение', () => {
    expect(isRead(row({ seconds: 200, share: 0.4 }))).toBe(true)
  })

  it('ровно на границе считается прочитанным', () => {
    expect(isRead(row({ seconds: NOT_READ_SECONDS, share: READ_SHARE }))).toBe(true)
  })
})

describe('признак «в топе»', () => {
  it.each([
    [1, true],
    [10, true],
    [11, false],
    [null, false],
  ])('позиция %s → %s', (position, expected) => {
    expect(isInTop(row({ position: position as number | null }))).toBe(expected)
  })
})

describe('группировка', () => {
  const rows = [
    row({ slug: 'в-топе-не-читают', position: 5, seconds: 10, share: 0.02, visits: 44 }),
    row({ slug: 'читают-не-в-топе', position: null, seconds: 300, share: 0.5, visits: 24 }),
    row({ slug: 'ни-того-ни-другого', position: null, seconds: 5, share: 0.01, visits: 12 }),
    row({ slug: 'всё-хорошо', position: 2, seconds: 400, share: 0.8, visits: 7 }),
  ]

  it('раскладывает по трём группам, требующим действий', () => {
    const groups = groupArticles(rows)
    expect(groups.map((g) => g.title)).toEqual([
      'В топе, но не читают',
      'Читают, но не в топе',
      'Ни того, ни другого',
    ])
  })

  it('благополучные статьи в отчёт не попадают', () => {
    const slugs = groupArticles(rows).flatMap((g) => g.rows.map((r) => r.slug))
    expect(slugs).not.toContain('всё-хорошо')
  })

  it('у каждой группы своё указание, что чинить', () => {
    const actions = groupArticles(rows).map((g) => g.action)
    expect(new Set(actions).size).toBe(actions.length)
  })

  it('внутри группы сначала те, у кого больше людей', () => {
    const many = [
      row({ slug: 'мало', position: null, seconds: 5, share: 0.01, visits: 3 }),
      row({ slug: 'много', position: null, seconds: 5, share: 0.01, visits: 90 }),
    ]
    const group = groupArticles(many)[0]
    expect(group.rows[0].slug).toBe('много')
  })

  it('пустые группы не показываются', () => {
    const onlyGood = [row({ position: 1, seconds: 500, share: 0.9 })]
    expect(groupArticles(onlyGood)).toEqual([])
  })
})

describe('доля для показа', () => {
  it('не бывает больше сотни', () => {
    // Выше единицы означает уход на другую страницу: считается время визита,
    // а не страницы, и показывать 273% было бы обманом.
    expect(displayShare(2.73)).toBe(100)
  })

  it('обычные значения округляются', () => {
    expect(displayShare(0.456)).toBe(46)
    expect(displayShare(0)).toBe(0)
  })
})
