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
 */

export const TAG_KEYWORDS: Record<string, string[]> = {
  smm: ['smm', 'соцсети', 'social media', 'инстаграм', 'instagram', 'контент-менеджер'],
  seo: ['seo', 'поисковая оптимизация', 'продвижение сайт'],
  dizajn: ['дизайн', 'дизайнер', 'figma', 'ui/ux', 'ui ux', 'верстальщик', 'фигма'],
  marketing: ['маркетинг', 'маркетолог', 'performance', 'контент-маркетинг'],
  menedzher: ['менеджер', 'проджект', 'продакт', 'project manager', 'product manager', 'аккаунт'],
  target: ['таргет', 'таргетолог', 'target', 'директ', 'контекстная реклама', 'яндекс директ'],
  razrabotka: ['разработчик', 'программист', 'developer', 'frontend', 'backend', 'фулстек', 'react', 'python', 'javascript'],
  analitika: ['аналитик', 'аналитика', 'analytics', 'data analyst', 'bi'],
  finansy: ['финанс', 'бухгалтер', 'экономист'],
  hr: ['hr', 'рекрутер', 'кадр', 'hrbp', 'people partner'],
  wordpress: ['wordpress', 'вордпресс'],
  udalyonka: ['удалённо', 'удаленно', 'удалёнка', 'удаленка', 'remote', 'дистанционно'],
  ofis: ['офис', 'office', 'в офисе'],
  gibrid: ['гибрид', 'гибридный', 'hybrid'],
  junior: ['junior', 'джуниор', 'стажёр', 'стажер', 'начинающий'],
  middle: ['middle', 'мидл'],
  senior: ['senior', 'сеньор', 'ведущий', 'lead'],
}

/** Match text against tag keywords using word boundary matching. */
export function matchTags(text: string): string[] {
  const lowerText = text.toLowerCase()
  const matched: string[] = []

  for (const [tagSlug, keywords] of Object.entries(TAG_KEYWORDS)) {
    for (const keyword of keywords) {
      const idx = lowerText.indexOf(keyword.toLowerCase())
      if (idx === -1) continue

      const before = idx > 0 ? lowerText[idx - 1] : ' '
      const after =
        idx + keyword.length < lowerText.length ? lowerText[idx + keyword.length] : ' '

      const isBoundary = (ch: string) =>
        /[\s\.,;:!?\-—–()\/\[\]{}«»"'#@\n\r]/.test(ch)

      if (
        (idx === 0 || isBoundary(before)) &&
        (idx + keyword.length >= lowerText.length || isBoundary(after))
      ) {
        matched.push(tagSlug)
        break // Only match once per tag
      }
    }
  }

  return matched
}
