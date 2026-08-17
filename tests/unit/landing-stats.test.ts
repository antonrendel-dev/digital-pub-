import { computeLandingStats, pluralRu } from '@/lib/landing-stats'

type TestPost = {
  salary: string | null
  tags: Array<{ id: number; name: string; slug: string; tagType: string }>
}

const tag = (slug: string) => ({ id: 1, name: slug, slug, tagType: 'format' })

const post = (salary: string | null, tagSlugs: string[] = []): TestPost => ({
  salary,
  tags: tagSlugs.map(tag),
})

describe('computeLandingStats', () => {
  it('counts total posts', () => {
    const stats = computeLandingStats([post(null), post(null), post(null)], 'junior')
    expect(stats.total).toBe(3)
  })

  it('returns null salary range when fewer than 3 salaries parsed', () => {
    const stats = computeLandingStats([post('80 000 ₽'), post('100 000 ₽'), post(null)], 'junior')
    expect(stats.salaryRange).toBeNull()
  })

  it('computes P25–P75 salary range rounded to thousands with >=3 salaries', () => {
    const posts = [post('60 000 ₽'), post('80 000 ₽'), post('100 000 ₽'), post('120 000 ₽')]
    const stats = computeLandingStats(posts, 'junior')
    expect(stats.salaryRange).not.toBeNull()
    // sorted [60000, 80000, 100000, 120000]: p25 = 75000, p75 = 105000
    expect(stats.salaryRange).toEqual({ from: 75000, to: 105000 })
  })

  it('parses both numbers from salary ranges like "80 000 – 120 000 ₽"', () => {
    const posts = [post('80 000 – 120 000 ₽'), post('от 90 000 ₽'), post('100 000 ₽')]
    const stats = computeLandingStats(posts, 'junior')
    expect(stats.salaryRange).not.toBeNull()
    expect(stats.salaryRange!.from).toBeGreaterThanOrEqual(80000)
    expect(stats.salaryRange!.to).toBeLessThanOrEqual(120000)
  })

  it('ignores salary numbers outside 10 000–1 000 000 range', () => {
    const posts = [post('5000 ₽'), post('2 000 000 ₽'), post('1234 ₽'), post('80 000 ₽')]
    const stats = computeLandingStats(posts, 'junior')
    // only one valid number (80000) → less than 3 → null
    expect(stats.salaryRange).toBeNull()
  })

  it('computes remote share percent among posts', () => {
    const posts = [
      post(null, ['udalyonka']),
      post(null, ['ofis']),
      post(null, ['udalyonka']),
      post(null, []),
    ]
    const stats = computeLandingStats(posts, 'junior')
    expect(stats.remoteSharePercent).toBe(50)
  })

  it('returns null remote share when filter itself is udalyonka', () => {
    const posts = [post(null, ['udalyonka']), post(null, ['udalyonka'])]
    const stats = computeLandingStats(posts, 'udalyonka')
    expect(stats.remoteSharePercent).toBeNull()
  })

  it('returns null remote share when no posts have udalyonka tag', () => {
    const posts = [post(null, ['ofis']), post(null, ['ofis'])]
    const stats = computeLandingStats(posts, 'ofis')
    expect(stats.remoteSharePercent).toBeNull()
  })

  it('degrades gracefully on empty posts', () => {
    const stats = computeLandingStats([], 'junior')
    expect(stats).toEqual({ total: 0, salaryRange: null, remoteSharePercent: null })
  })
})

describe('pluralRu', () => {
  const forms: [string, string, string] = ['вакансия', 'вакансии', 'вакансий']

  it.each([
    [1, 'вакансия'],
    [2, 'вакансии'],
    [4, 'вакансии'],
    [5, 'вакансий'],
    [11, 'вакансий'],
    [12, 'вакансий'],
    [21, 'вакансия'],
    [22, 'вакансии'],
    [100, 'вакансий'],
    [101, 'вакансия'],
  ])('%i → %s', (n, expected) => {
    expect(pluralRu(n, forms)).toBe(expected)
  })
})
