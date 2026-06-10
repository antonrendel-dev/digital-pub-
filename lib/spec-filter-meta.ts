export const FORMAT_SLUGS = ['udalyonka', 'ofis', 'gibrid'] as const
export const LEVEL_SLUGS = ['junior', 'middle', 'senior'] as const
export type FormatSlug = (typeof FORMAT_SLUGS)[number]
export type LevelSlug = (typeof LEVEL_SLUGS)[number]

export function isFilterSlug(slug: string): slug is FormatSlug | LevelSlug {
  return [...FORMAT_SLUGS, ...LEVEL_SLUGS].includes(slug as never)
}

// Имена специализаций в родительном падеже (для "Вакансии КОГО")
const SPEC_GENITIVE: Record<string, string> = {
  smm: 'SMM-менеджера',
  marketing: 'маркетолога',
  dizajn: 'дизайнера',
  seo: 'SEO-специалиста',
  target: 'таргетолога',
  razrabotka: 'разработчика',
  analitika: 'аналитика',
  copywriting: 'копирайтера',
  content: 'контент-менеджера',
  kreativ: 'арт-директора',
  menedzher: 'менеджера проектов',
  finansy: 'финансового специалиста',
}

// Имена специализаций в именительном падеже (для breadcrumb)
const SPEC_NOMINATIVE: Record<string, string> = {
  smm: 'SMM',
  marketing: 'Маркетинг',
  dizajn: 'Дизайн',
  seo: 'SEO',
  target: 'Таргет',
  razrabotka: 'Разработка',
  analitika: 'Аналитика',
  copywriting: 'Копирайтинг',
  content: 'Контент',
  kreativ: 'Креатив',
  menedzher: 'Менеджмент',
  finansy: 'Финансы',
}

const FORMAT_LABELS: Record<string, string> = {
  udalyonka: 'удалённо',
  ofis: 'в офисе',
  gibrid: 'гибрид',
}

const FORMAT_LABELS_ADJ: Record<string, string> = {
  udalyonka: 'Удалённые',
  ofis: 'Офисные',
  gibrid: 'Гибридные',
}

const LEVEL_LABELS: Record<string, string> = {
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
}

export function getSpecFilterH1(specSlug: string, filterSlug: string): string {
  const y = new Date().getFullYear()
  const gen = SPEC_GENITIVE[specSlug] ?? specSlug
  if (FORMAT_SLUGS.includes(filterSlug as FormatSlug)) {
    if (filterSlug === 'udalyonka') return `Удалённые вакансии ${gen} — ${y}`
    if (filterSlug === 'ofis') return `Вакансии ${gen} в офисе — ${y}`
    return `Гибридные вакансии ${gen} — ${y}`
  }
  const level = LEVEL_LABELS[filterSlug] ?? filterSlug
  return `Вакансии ${gen} ${level} — ${y}`
}

export function getSpecFilterTitle(specSlug: string, filterSlug: string): string {
  const y = new Date().getFullYear()
  const gen = SPEC_GENITIVE[specSlug] ?? specSlug
  if (FORMAT_SLUGS.includes(filterSlug as FormatSlug)) {
    const label = FORMAT_LABELS[filterSlug] ?? filterSlug
    return `Вакансии ${gen} ${label} — d-pub.ru ${y}`
  }
  const level = LEVEL_LABELS[filterSlug] ?? filterSlug
  return `Вакансии ${gen} ${level} — d-pub.ru ${y}`
}

export function getSpecFilterDescription(specSlug: string, filterSlug: string): string {
  const gen = SPEC_GENITIVE[specSlug] ?? specSlug
  if (FORMAT_SLUGS.includes(filterSlug as FormatSlug)) {
    const label = FORMAT_LABELS[filterSlug] ?? filterSlug
    return `Актуальные вакансии ${gen} ${label}. Свежие предложения из Telegram-каналов. Обновляется ежедневно.`
  }
  const level = LEVEL_LABELS[filterSlug] ?? filterSlug
  return `Актуальные вакансии для ${level}-специалиста в области ${gen}. Свежие предложения из Telegram-каналов.`
}

export function getSpecFilterBreadcrumb(specSlug: string, filterSlug: string): string {
  void specSlug
  if (FORMAT_SLUGS.includes(filterSlug as FormatSlug)) {
    return FORMAT_LABELS_ADJ[filterSlug] ?? filterSlug
  }
  return LEVEL_LABELS[filterSlug] ?? filterSlug
}

export function getSpecNominative(specSlug: string): string {
  return SPEC_NOMINATIVE[specSlug] ?? specSlug
}

// Все комбинации для sitemap и generateStaticParams
export const SPEC_SLUGS = Object.keys(SPEC_GENITIVE)

export function getAllFilterCombinations(): Array<{ category: string; slug: string }> {
  const combos: Array<{ category: string; slug: string }> = []
  for (const spec of SPEC_SLUGS) {
    for (const f of FORMAT_SLUGS) combos.push({ category: spec, slug: f })
    for (const l of LEVEL_SLUGS) combos.push({ category: spec, slug: l })
  }
  return combos
}
