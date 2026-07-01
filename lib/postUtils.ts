/**
 * Shared utilities and types for post rendering (cards, detail page, sitemap).
 * Pure functions and types only — safe for client components (no prisma/pg imports).
 * Extracted from JobCard / TileCard / PostDetail to avoid duplication.
 */

export interface FeedPost {
  id: number
  type: 'vacancy' | 'resume'
  title: string
  slug: string | null
  description: string | null
  company: string | null
  salary: string | null
  imageUrl: string | null
  channelUsername: string | null
  telegramMessageId: string | null
  createdAt: string
  isNew: boolean
  tags: { id: number; name: string; slug: string; tagType: string }[]
}

export function getPrimaryCategorySlug(post: FeedPost): string {
  if (!post.tags || post.tags.length === 0) return 'other'
  const specTag = post.tags.find((t) => t.tagType === 'specialization')
  return specTag ? specTag.slug : (post.tags[0]?.slug ?? 'other')
}

const FORMAT_TAGS = ['Удалёнка', 'Офис', 'Гибрид', 'Фриланс', 'Удалённо']
const LEVEL_TAGS = ['Junior', 'Middle', 'Senior', 'Junior / Middle', 'Middle+']

/** Strip Telegram noise (mentions, disclaimer footers) from raw post text. */
export function cleanDescription(text: string): string {
  return text
    .replace(/@\w+/g, '')
    .replace(/Администрация не несет ответственност[^\n]*/gi, '')
    .replace(/Смотри вакансии →[^\n]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Relative date format for cards: "5 ч. назад" / "Вчера" / "12 мая". */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000 / 60 / 60)
  if (diff < 1) return 'Только что'
  if (diff < 24) return `${diff} ч. назад`
  const days = Math.floor(diff / 24)
  if (days === 1) return 'Вчера'
  if (days < 7) return `${days} дня назад`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

/** Short variant used in "related" lists: day-precision only. */
export function formatDateShort(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (days === 0) return 'Сегодня'
  if (days === 1) return 'Вчера'
  if (days < 7) return `${days} дня назад`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

/** Map tag name to a color class (blue=format, green=level, orange=other). */
export function getTagColorClass(tagName: string): string {
  if (FORMAT_TAGS.some((t) => tagName.toLowerCase().includes(t.toLowerCase()))) return 'tag-blue'
  if (LEVEL_TAGS.some((t) => tagName.toLowerCase() === t.toLowerCase())) return 'tag-green'
  return 'tag-orange'
}
