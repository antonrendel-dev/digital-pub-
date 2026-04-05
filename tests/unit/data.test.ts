import { filterJobs, sortJobs, JOBS } from '@/lib/data'

describe('filterJobs', () => {
  it('returns all jobs when no filters active', () => {
    expect(filterJobs(JOBS, new Set())).toHaveLength(JOBS.length)
  })

  it('filters by single tag', () => {
    const result = filterJobs(JOBS, new Set(['Удалённо']))
    expect(result.length).toBeGreaterThan(0)
    result.forEach((job) => {
      expect(job.tags.some((t) => t.t === 'Удалённо')).toBe(true)
    })
  })

  it('filters by multiple tags (OR logic)', () => {
    const result = filterJobs(JOBS, new Set(['IT', 'Дизайн']))
    result.forEach((job) => {
      expect(job.tags.some((t) => t.t === 'IT' || t.t === 'Дизайн')).toBe(true)
    })
  })

  it('returns empty array when no jobs match', () => {
    const result = filterJobs(JOBS, new Set(['НесуществующийТег']))
    expect(result).toHaveLength(0)
  })
})

describe('sortJobs', () => {
  it('sorts by date (default)', () => {
    const result = sortJobs([...JOBS], 'date')
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].dord).toBeLessThanOrEqual(result[i + 1].dord)
    }
  })

  it('sorts by salary descending', () => {
    const result = sortJobs([...JOBS], 'salary')
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].sal).toBeGreaterThanOrEqual(result[i + 1].sal)
    }
  })

  it('sorts alphabetically A-Z', () => {
    const result = sortJobs([...JOBS], 'az')
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].title.localeCompare(result[i + 1].title, 'ru')).toBeLessThanOrEqual(0)
    }
  })
})
