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
  slug?: string | null
  company?: string | null
  salary?: string | null
  description?: string | null
  tags?: Array<{ slug?: string; name?: string }>
}

/**
 * Extracts a clean text snippet from raw Telegram vacancy description.
 * - Removes hashtag lines (lines starting with #)
 * - Removes emoji characters
 * - Removes Markdown bold/italic markers
 * - Takes the first meaningful sentence or phrase
 * - Returns a string no longer than maxLen characters
 */
export function extractDescriptionSnippet(description: string, maxLen: number): string {
  // Split into lines, drop lines that are purely hashtags or empty
  const lines = description
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))

  if (lines.length === 0) return ''

  // Join into single text, remove markdown bold/italic
  const text = lines
    .join(' ')
    // Remove emoji (broad Unicode ranges)
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1FFFF}\u{200D}]/gu,
      ''
    )
    // Remove Markdown bold/italic
    .replace(/\*{1,2}|_{1,2}/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length === 0) return ''

  // Try to find the first sentence (ends with . ! ?)
  const sentenceMatch = text.match(/^(.{20,}?[.!?])\s/)
  if (sentenceMatch && sentenceMatch[1].length <= maxLen) {
    return sentenceMatch[1]
  }

  // Fallback: truncate at word boundary
  if (text.length <= maxLen) return text
  const cut = text.slice(0, maxLen - 1).trimEnd()
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut) + '…'
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

/**
 * Extracts a unique disambiguator from description for use in title/description.
 * Returns a short phrase (≤30 chars) that makes the vacancy distinct.
 * Priority: company name → first meaningful non-hashtag phrase from description.
 */
function extractUniqueHint(post: PostForMeta): string | null {
  if (post.company) return post.company

  if (!post.description) return null

  const snippet = extractDescriptionSnippet(post.description, 60)
  if (!snippet) return null

  // Try to grab 2–5 words that follow after "Ищем" / "Нужен" / "Ищу" patterns
  const introMatch = snippet.match(
    /(?:ищем|нужен|нужна|нужны|требуется|приглашаем|ждём|открыта вакансия)[^,!.]{0,50}/i
  )
  if (introMatch) {
    return truncate(introMatch[0].trim(), 30)
  }

  // Otherwise return the first 30 chars of the snippet
  return truncate(snippet, 30)
}

export function buildVacancyTitle(post: PostForMeta): string {
  const slugs = extractTagSlugs(post.tags)
  const level = slugs.map((s) => LEVEL_TAGS[s]).find(Boolean) ?? null
  const format = slugs.map((s) => FORMAT_TAGS[s]).find(Boolean) ?? null

  const titleNorm = normalizeTitle(post.title)
  const humanReadable = isHumanReadable(post.title)

  // ── Human-readable title (e.g. "Редактор блога Яндекса") ─────────────────
  // Original logic: just assemble from title + level + format.
  // These are already unique by nature, no snippet needed.
  if (humanReadable) {
    const parts = ['Вакансия']
    if (level) parts.push(level)
    parts.push(titleNorm)
    if (format) parts.push(format)
    const full = parts.join(' ')
    if (full.length <= 53) return full

    const noLevel = ['Вакансия', titleNorm, format].filter(Boolean).join(' ')
    if (noLevel.length <= 53) return noLevel

    const minimal = `Вакансия ${titleNorm}`
    if (minimal.length <= 53) return minimal

    return truncate(`Вакансия ${titleNorm}`, 53)
  }

  // ── Hashtag/slug title (e.g. "SMM", "#МЕНЕДЖЕР") ─────────────────────────
  // Build base: "Вакансия [Level] {titleNorm} [format]"
  const baseParts = ['Вакансия']
  if (level) baseParts.push(level)
  baseParts.push(titleNorm)
  if (format) baseParts.push(format)
  const base = baseParts.join(' ')

  // Budget remaining chars for unique hint (target ≤53 total)
  const budget = 53 - base.length - 3 // " — " separator costs 3

  if (budget >= 8) {
    // Enough room — append unique hint
    const hint = extractUniqueHint(post)
    if (hint) {
      const hintTrimmed = hint.length > budget ? truncate(hint, budget) : hint
      return `${base} — ${hintTrimmed}`
    }
  }

  // No room or no hint — fallback to base (same as before)
  if (base.length <= 53) return base

  // Drop level, retry
  const noLevel = ['Вакансия', titleNorm, format].filter(Boolean).join(' ')
  if (noLevel.length <= 53) return noLevel

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

  // ── Templates with salary and/or company (already unique) ─────────────────
  // These are inherently distinct — salary/company make them unique.

  if (hasSalary && hasCompany) {
    // Template A — most complete
    const desc = `${subjectParts} — зарплата ${post.salary}. Компания ${post.company}. Откликнись на вакансию в digital прямо сейчас — Диджитал Паб.`
    return truncate(desc, 155)
  }

  if (hasSalary) {
    // Template B — salary is the unique anchor
    const desc = `${subjectParts} — зарплата ${post.salary}. Актуальная вакансия для digital-специалистов. Откликнись прямо сейчас на Диджитал Паб.`
    return truncate(desc, 155)
  }

  if (hasCompany && category) {
    // Template C — company is the unique anchor
    const desc = `${subjectParts} в компании ${post.company}. Вакансии ${category} на Диджитал Паб — агрегатор digital-вакансий из Telegram. Смотреть условия.`
    return truncate(desc, 155)
  }

  if (hasCompany) {
    const desc = `${subjectParts} в компании ${post.company}. Актуальные вакансии в digital на Диджитал Паб — агрегатор из Telegram-каналов. Смотреть условия.`
    return truncate(desc, 155)
  }

  // ── No salary, no company — use description snippet for uniqueness ─────────
  // This is the case that caused 56-page duplicate crisis (all SMM/Менеджер without company/salary).
  // We inject the first meaningful sentence from the post body as the unique signal.

  if (post.description) {
    // Reserve budget: "Вакансия {subjectParts}. " prefix + " Диджитал Паб." suffix
    const prefix = `Вакансия ${subjectParts}. `
    const suffix = ' Диджитал Паб.'
    const snippetBudget = 155 - prefix.length - suffix.length
    const snippet = extractDescriptionSnippet(post.description, Math.max(snippetBudget, 40))

    if (snippet) {
      const desc = `${prefix}${snippet}${suffix}`
      return truncate(desc, 155)
    }
  }

  // ── Fallback: original templates (description was empty or too short) ──────
  if (category) {
    const desc = `Вакансия ${subjectParts} — ${category} в digital. Диджитал Паб собирает лучшие вакансии из Telegram-каналов. Смотреть и откликнуться.`
    return truncate(desc, 155)
  }

  const desc = `Вакансия ${subjectParts} в digital. Диджитал Паб собирает актуальные вакансии из Telegram-каналов ежедневно. Смотреть и откликнуться.`
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
