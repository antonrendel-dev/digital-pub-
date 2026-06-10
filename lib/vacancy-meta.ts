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

  // Build candidate with all parts (brand appended by layout template)
  const parts = ['Вакансия']
  if (level) parts.push(level)
  parts.push(titleNorm)
  if (format) parts.push(format)
  const full = parts.join(' ')

  if (full.length <= 53) return full

  // Drop level first, try again
  const noLevel = ['Вакансия', titleNorm, format].filter(Boolean).join(' ')
  if (noLevel.length <= 53) return noLevel

  // Drop format too
  const minimal = `Вакансия ${titleNorm}`
  if (minimal.length <= 53) return minimal

  return truncate(`Вакансия ${titleNorm}`, 53)
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

// ─── H1 builder ──────────────────────────────────────────────────────────────
//
// Rule: H1 must NOT duplicate <title> verbatim.
//   <title> = "Вакансия [Level] {title} [format] — Диджитал Паб"  (SERP snippet)
//   H1      = "[Level] {profession}[ — {format}][ · {salary}]"    (on-page header)
//
// Priority chain:
//   P0 — post.title is human-readable (not a hashtag / all-caps slug)
//        → "[Level] {cleanTitle}[ — {format}][ · {salary}]"
//   P1 — post.title is raw/hashtag, but category tag is known
//        → "[Level] {categoryName}-специалист[ — {format}][ · {salary}]"
//   P2 — only categoryName from URL param is available
//        → "Вакансия в {categoryName}[ — {format}][ · {salary}]"
//   P3 — nothing usable
//        → "Digital-вакансия"
//
// For resumes (post.type === 'resume') suffix changes:
//   P0/P1 → "[Level] {profession} — резюме[ · {salary}]"
//   P2    → "Резюме специалиста по {categoryName}"

const RESUME_SUFFIX = '— резюме'

/**
 * Returns true when the raw Telegram title looks like a human-readable label
 * rather than a hashtag or a slug (e.g. "SEO", "#МЕНЕДЖЕР", "TARGET_LEAD").
 *
 * Heuristics:
 *  - strip leading "#"
 *  - if only uppercase letters / digits / underscores / hyphens with no spaces → slug
 *  - if fewer than 4 visible chars after stripping → too short, treat as slug
 */
function isHumanReadable(raw: string): boolean {
  const cleaned = raw.replace(/^#+/, '').trim()
  if (cleaned.length < 4) return false
  // All-caps token without spaces → hashtag/slug pattern
  if (/^[A-ZА-ЯЁ0-9_\-]+$/.test(cleaned)) return false
  return true
}

function buildProfession(raw: string): string {
  // Strip leading #, collapse whitespace, sentence-case
  return raw
    .replace(/^#+\s*/, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase())
}

interface PostForH1 extends PostForMeta {
  type?: 'vacancy' | 'resume'
}

export function buildVacancyH1(post: PostForH1, categoryName?: string | null): string {
  const slugs = extractTagSlugs(post.tags)
  const level = slugs.map((s) => LEVEL_TAGS[s]).find(Boolean) ?? null
  const format = slugs.map((s) => FORMAT_TAGS[s]).find(Boolean) ?? null
  const isResume = post.type === 'resume'

  // ── P0: human-readable title ─────────────────────────────────────────────
  if (isHumanReadable(post.title)) {
    const profession = buildProfession(post.title)
    const parts: string[] = []
    if (level) parts.push(level)
    parts.push(profession)

    if (isResume) {
      parts.push(RESUME_SUFFIX)
      if (post.salary) parts.push(`· ${post.salary}`)
    } else {
      if (format) parts.push(`— ${format}`)
      if (post.salary) parts.push(`· ${post.salary}`)
    }

    return parts.join(' ')
  }

  // ── P1: category from tags or categoryName param ─────────────────────────
  const catFromTags = slugs.map((s) => CATEGORY_TAGS[s]).find(Boolean) ?? null
  const catLabel = catFromTags ?? categoryName ?? null

  if (catLabel) {
    const base = `${catLabel}-специалист`
    const parts: string[] = []
    if (level) parts.push(level)
    parts.push(base)

    if (isResume) {
      parts.push('ищет работу')
      if (post.salary) parts.push(`· ${post.salary}`)
    } else {
      if (format) parts.push(`— ${format}`)
      if (post.salary) parts.push(`· ${post.salary}`)
    }

    return parts.join(' ').replace(/^./, (c) => c.toUpperCase())
  }

  // ── P2: only categoryName from URL ───────────────────────────────────────
  if (categoryName) {
    if (isResume) return `Резюме специалиста по ${categoryName}`
    const parts = [`Вакансия в ${categoryName}`]
    if (format) parts.push(`— ${format}`)
    if (post.salary) parts.push(`· ${post.salary}`)
    return parts.join(' ')
  }

  // ── P3: fallback ─────────────────────────────────────────────────────────
  return isResume ? 'Резюме специалиста' : 'Digital-вакансия'
}

export function buildResumeTitle(post: PostForMeta): string {
  const titleNorm = normalizeTitle(post.title)
  return truncate(`Резюме: ${titleNorm}`, 53)
}

export function buildResumeDescription(post: PostForMeta): string {
  let desc = `Резюме специалиста: ${normalizeTitle(post.title)}`
  if (post.salary) desc += `. Ожидания: ${post.salary}`
  desc += '. Ищет работу в digital — Диджитал Паб, агрегатор вакансий и резюме из Telegram.'
  return truncate(desc, 155)
}
