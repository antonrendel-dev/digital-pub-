import type { FeedPost } from './postUtils'

// Живая статистика для SEO-лендингов спецификация×фильтр.
// Считается в рантайме страницы по уже загруженной выборке постов —
// свежесть обеспечивает ISR (revalidate = 300), в JSON-данные ничего не запекается.

export interface LandingSalaryRange {
  from: number
  to: number
}

export interface LandingStats {
  total: number
  /** P25–P75 по распарсенным зарплатам, null если валидных чисел < 3 */
  salaryRange: LandingSalaryRange | null
  /** Доля постов с тегом udalyonka (в процентах), null если фильтр сам udalyonka или доля равна 0 */
  remoteSharePercent: number | null
}

type StatsPost = Pick<FeedPost, 'salary' | 'tags'>

const MIN_SALARY = 10000
const MAX_SALARY = 1000000
const MIN_PARSED_SALARIES = 3

// Тот же парсер зарплатных строк, что и в getCategoryStats (lib/tags.ts):
// «от 80 000 ₽», «80 000 – 120 000 ₽» → числа 4–7 знаков в допустимом диапазоне
function parseSalaries(posts: StatsPost[]): number[] {
  return posts
    .map((p) => p.salary)
    .filter(Boolean)
    .flatMap((s) => {
      const nums = s!.replace(/\s/g, '').match(/\d{4,7}/g)
      return nums ? nums.map(Number) : []
    })
    .filter((n) => n >= MIN_SALARY && n <= MAX_SALARY)
}

// Перцентиль с линейной интерполяцией по отсортированному массиву
function percentile(sorted: number[], q: number): number {
  const idx = (sorted.length - 1) * q
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

const roundToThousand = (n: number) => Math.round(n / 1000) * 1000

export function computeLandingStats(posts: StatsPost[], filterSlug: string): LandingStats {
  const total = posts.length

  let salaryRange: LandingSalaryRange | null = null
  const salaries = parseSalaries(posts).sort((a, b) => a - b)
  if (salaries.length >= MIN_PARSED_SALARIES) {
    salaryRange = {
      from: roundToThousand(percentile(salaries, 0.25)),
      to: roundToThousand(percentile(salaries, 0.75)),
    }
  }

  let remoteSharePercent: number | null = null
  if (filterSlug !== 'udalyonka' && total > 0) {
    const remoteCount = posts.filter((p) => p.tags?.some((t) => t.slug === 'udalyonka')).length
    const share = Math.round((remoteCount / total) * 100)
    // «0% с удалёнкой» не показываем — деградируем изящно
    if (share > 0) remoteSharePercent = share
  }

  return { total, salaryRange, remoteSharePercent }
}

/** Склонение русских существительных: pluralRu(3, ['вакансия', 'вакансии', 'вакансий']) */
export function pluralRu(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (last > 1 && last < 5) return forms[1]
  if (last === 1) return forms[0]
  return forms[2]
}
