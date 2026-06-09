/**
 * Meta tag generation for vacancy and resume pages.
 * Templates are optimized for semantic core queries (вакансии + specialty + format).
 */

const LEVEL_TAGS: Record<string, string> = {
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
}

const FORMAT_TAGS: Record<string, string> = {
  udalyonka: 'удалённо',
  ofis: 'в офис',
  gibrid: 'гибрид',
}

const CATEGORY_TAGS: Record<string, string> = {
  smm: 'SMM и соцсети',
  seo: 'SEO и продвижение',
  dizajn: 'дизайн',
  marketing: 'маркетинг',
  target: 'таргетированная реклама',
  razrabotka: 'разработка',
  analitika: 'аналитика данных',
  copywriting: 'копирайтинг',
  content: 'контент',
  wordpress: 'WordPress-разработка',
  menedzher: 'менеджмент',
  finansy: 'финансы',
  kreativ: 'креатив',
  hr: 'HR и найм',
}

interface PostForMeta {
  title: string
  company?: string | null
  salary?: string | null
  tags?: Array<{ slug?: string; name?: string }>
}

function extractTagSlugs(tags: PostForMeta['tags']): string[] {
  return (tags ?? []).map((t) => t.slug ?? '').filter(Boolean)
}

function normalizeTitle(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase())
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max - 1).trimEnd() + '…'
}

export function buildVacancyTitle(post: PostForMeta): string {
  const slugs = extractTagSlugs(post.tags)
  const level = slugs.map((s) => LEVEL_TAGS[s]).find(Boolean) ?? null
  const format = slugs.map((s) => FORMAT_TAGS[s]).find(Boolean) ?? null

  const titleNorm = normalizeTitle(post.title)
  const brand = '— Диджитал Паб'

  // Build candidate with all parts
  const parts = ['Вакансия']
  if (level) parts.push(level)
  parts.push(titleNorm)
  if (format) parts.push(format)
  const full = parts.join(' ') + ' ' + brand

  if (full.length <= 60) return full

  // Drop level first, try again
  const noLevel = ['Вакансия', titleNorm, format].filter(Boolean).join(' ') + ' ' + brand
  if (noLevel.length <= 60) return noLevel

  // Drop format too
  const minimal = `Вакансия ${titleNorm} ${brand}`
  if (minimal.length <= 60) return minimal

  // Title itself is too long — truncate it
  return truncate(`Вакансия ${titleNorm} ${brand}`, 60)
}

export function buildVacancyDescription(post: PostForMeta): string {
  const slugs = extractTagSlugs(post.tags)
  const level = slugs.map((s) => LEVEL_TAGS[s]).find(Boolean) ?? null
  const format = slugs.map((s) => FORMAT_TAGS[s]).find(Boolean) ?? null
  const category = slugs.map((s) => CATEGORY_TAGS[s]).find(Boolean) ?? null

  const titleNorm = normalizeTitle(post.title)
  const subjectParts = [level, titleNorm, format].filter(Boolean).join(' ')

  const hasSalary = Boolean(post.salary)
  const hasCompany = Boolean(post.company)

  let desc: string

  if (hasSalary && hasCompany) {
    // Template A
    desc = `${subjectParts} — зарплата ${post.salary}. Компания ${post.company}. Откликнись на вакансию в digital прямо сейчас — Диджитал Паб.`
  } else if (hasSalary) {
    // Template B
    desc = `${subjectParts} — зарплата ${post.salary}. Актуальная вакансия для digital-специалистов. Откликнись прямо сейчас на Диджитал Паб.`
  } else if (hasCompany && category) {
    // Template C
    desc = `${subjectParts} в компании ${post.company}. Вакансии ${category} на Диджитал Паб — агрегатор digital-вакансий из Telegram. Смотреть условия.`
  } else if (hasCompany) {
    desc = `${subjectParts} в компании ${post.company}. Актуальные вакансии в digital на Диджитал Паб — агрегатор из Telegram-каналов. Смотреть условия.`
  } else if (category) {
    // Template D with category
    desc = `Вакансия ${subjectParts} — ${category} в digital. Диджитал Паб собирает лучшие вакансии из Telegram-каналов. Смотреть и откликнуться.`
  } else {
    // Template D fallback
    desc = `Вакансия ${subjectParts} в digital. Диджитал Паб собирает актуальные вакансии из Telegram-каналов ежедневно. Смотреть и откликнуться.`
  }

  return truncate(desc, 155)
}

export function buildResumeTitle(post: PostForMeta): string {
  const titleNorm = normalizeTitle(post.title)
  const candidate = `Резюме: ${titleNorm} — Диджитал Паб`
  return truncate(candidate, 60)
}

export function buildResumeDescription(post: PostForMeta): string {
  let desc = `Резюме специалиста: ${normalizeTitle(post.title)}`
  if (post.salary) desc += `. Ожидания: ${post.salary}`
  desc += '. Ищет работу в digital — Диджитал Паб, агрегатор вакансий и резюме из Telegram.'
  return truncate(desc, 155)
}
