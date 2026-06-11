/**
 * Tag keyword matching — extracted from scripts/sync-telegram.ts so it can be
 * unit-tested in isolation.
 *
 * scripts/sync-telegram.ts has module-level side effects (reads bot .env,
 * invokes main()), so importing it from Jest is not safe. This module is
 * pure: no I/O, no top-level state. sync-telegram.ts re-imports from here.
 *
 * Behavior contract:
 *   - case-insensitive
 *   - word-boundary aware (Cyrillic-aware via punctuation/space check)
 *   - one match per tag (no duplicates in result)
 *   - returns tag slugs in TAG_KEYWORDS-iteration order
 *   - SPECIALIZATION tags matched against title only (prevents body mentions
 *     like "аналитика кампаний" from tagging a vacancy as analitika)
 *   - FORMAT and LEVEL tags matched against full text
 */

/** Slugs that represent the job specialization — matched against title only. */
export const SPEC_TAG_SLUGS = new Set([
  'smm',
  'seo',
  'dizajn',
  'marketing',
  'menedzher',
  'target',
  'razrabotka',
  'analitika',
  'finansy',
  'kreativ',
  'copywriting',
  'content',
])

export const TAG_KEYWORDS: Record<string, string[]> = {
  smm: [
    'smm',
    'смм',
    'соцсети',
    'social media',
    'инстаграм',
    'instagram',
    'smm менеджер',
    'смм менеджер',
    'smm-менеджер',
    'смм-менеджер',
    'сммщик',
    'риллс',
    'риллсмейкер',
    'рилсмейкер',
    'рилсы',
    'reels',
  ],
  seo: [
    'seo',
    'сео специалист',
    'поисковая оптимизация',
    'продвижение сайт',
    'семантическое ядро',
    'wordstat',
    'вордстат',
    'seo-специалист',
    'seo специалист',
  ],
  dizajn: [
    'дизайн',
    'дизайнер',
    'designer',
    'figma',
    'фигма',
    'ui/ux',
    'ui ux',
    'ux/ui',
    'тильда',
    'tilda',
    'adobe',
    'иллюстратор',
    'illustrator',
    'photoshop',
    'фотошоп',
    'motion',
    'моушн',
  ],
  marketing: [
    'маркетинг',
    'маркетолог',
    'performance маркетинг',
    'performance marketing',
    'контент-маркетинг',
    'интернет-маркетинг',
    'digital маркетинг',
    'бренд-менеджер',
    'growth',
  ],
  menedzher: [
    'проджект',
    'project manager',
    'product manager',
    'менеджер проект',
    'менеджер продукт',
    'продакт менеджер',
    'тим лид',
    'team lead',
    'руководитель проект',
    'руководитель отдел',
    'amocrm',
    'bitrix24',
    'битрикс24',
  ],
  target: [
    'таргет',
    'таргетолог',
    'директ',
    'директолог',
    'контекстная реклама',
    'яндекс директ',
    'yandex direct',
    'яндекс.директ',
    'vk ads',
    'вк реклама',
    'mytarget',
    'my target',
    'ppc специалист',
    'контекст специалист',
  ],
  razrabotka: [
    'разработчик',
    'программист',
    'прогер',
    'developer',
    'frontend',
    'backend',
    'фулстек',
    'react',
    'python',
    'javascript',
    'битрикс',
    'битрикс24',
    'wordpress',
    'вордпресс',
    'верстальщик',
    'верстка',
    'opencart',
    'open cart',
    'joomla',
  ],
  analitika: ['аналитик', 'аналитика', 'analytics', 'data analyst', 'bi'],
  finansy: ['финанс', 'бухгалтер', 'экономист'],
  kreativ: ['креатив', 'креативщик'],
  copywriting: [
    'копирайтер',
    'копирайтинг',
    'copywriter',
    'copywriting',
    'автор текстов',
    'рерайтер',
    'рерайтинг',
    'редактор',
    'статьи',
    'копир',
  ],
  content: [
    'контент',
    'content',
    'контент-мейкер',
    'контент мейкер',
    'контентмейкер',
    'contentmaker',
    'content maker',
    'контент-стратег',
    'контент стратег',
    'посты',
  ],
  udalyonka: ['удалённо', 'удаленно', 'удалёнка', 'удаленка', 'remote', 'дистанционно'],
  ofis: ['офис', 'office', 'в офисе'],
  gibrid: ['гибрид', 'гибридный', 'hybrid'],
  junior: ['junior', 'джуниор', 'стажёр', 'стажер', 'начинающий'],
  middle: ['middle', 'мидл'],
  senior: ['senior', 'сеньор', 'ведущий', 'lead'],
}

const isBoundary = (ch: string) => /[\s\.,;:!?\-—–()\/\[\]{}«»"'#@\n\r]/.test(ch)

function hasKeyword(text: string, keyword: string): boolean {
  const lower = text.toLowerCase()
  const kw = keyword.toLowerCase()
  const idx = lower.indexOf(kw)
  if (idx === -1) return false
  const before = idx > 0 ? lower[idx - 1] : ' '
  const after = idx + kw.length < lower.length ? lower[idx + kw.length] : ' '
  return (idx === 0 || isBoundary(before)) && (idx + kw.length >= lower.length || isBoundary(after))
}

/**
 * Match title + body against tag keywords.
 *
 * Specialization tags (smm, seo, dizajn, …) are matched against `title` only.
 * Format/level tags (udalyonka, junior, …) are matched against the full text.
 *
 * Pass body as second argument. If omitted, title is treated as full text
 * (legacy behaviour — safe for callers that already concatenate title+body).
 */
export function matchTags(title: string, body?: string): string[] {
  const fullText = body !== undefined ? `${title} ${body}` : title
  const matched: string[] = []

  for (const [tagSlug, keywords] of Object.entries(TAG_KEYWORDS)) {
    const searchIn = SPEC_TAG_SLUGS.has(tagSlug) ? title : fullText
    for (const keyword of keywords) {
      if (hasKeyword(searchIn, keyword)) {
        matched.push(tagSlug)
        break
      }
    }
  }

  return matched
}
