import {
  vacancyStage,
  vacancyAgeDays,
  isListed,
  isIndexable,
  FRESH_DAYS,
  GONE_DAYS,
} from '../../lib/vacancy-lifecycle'

const NOW = new Date('2026-08-31T12:00:00.000Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

describe('возраст вакансии', () => {
  it('считает дни от даты появления', () => {
    expect(vacancyAgeDays(daysAgo(0), NOW)).toBe(0)
    expect(vacancyAgeDays(daysAgo(45), NOW)).toBe(45)
  })

  it('на битой дате не падает, а считает свежей', () => {
    expect(vacancyAgeDays('не дата', NOW)).toBe(0)
    expect(vacancyStage('не дата', NOW)).toBe('fresh')
  })
})

describe('стадии', () => {
  it.each([
    [0, 'fresh'],
    [FRESH_DAYS, 'fresh'],
    [FRESH_DAYS + 1, 'stale'],
    [GONE_DAYS, 'stale'],
    [GONE_DAYS + 1, 'gone'],
    [365, 'gone'],
  ])('возраст %i дней → %s', (age, stage) => {
    expect(vacancyStage(daysAgo(age as number), NOW)).toBe(stage)
  })

  it('границы не пересекаются: тридцать первый день уже не свежий', () => {
    expect(vacancyStage(daysAgo(30), NOW)).toBe('fresh')
    expect(vacancyStage(daysAgo(31), NOW)).toBe('stale')
  })
})

describe('что стадия разрешает', () => {
  it('в листинге остаётся всё, кроме ушедшего', () => {
    expect(isListed(daysAgo(10), NOW)).toBe(true)
    expect(isListed(daysAgo(60), NOW)).toBe(true)
    expect(isListed(daysAgo(120), NOW)).toBe(false)
  })

  it('в индекс пускается только свежее', () => {
    expect(isIndexable(daysAgo(10), NOW)).toBe(true)
    expect(isIndexable(daysAgo(60), NOW)).toBe(false)
    expect(isIndexable(daysAgo(120), NOW)).toBe(false)
  })

  it('устаревшая вакансия видна человеку, но не поисковику', () => {
    const stale = daysAgo(45)
    expect(isListed(stale, NOW)).toBe(true)
    expect(isIndexable(stale, NOW)).toBe(false)
  })
})
