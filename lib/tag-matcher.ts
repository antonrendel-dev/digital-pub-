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
  smm: [
    'smm',
    'смм',
    'соцсети',
    'social media',
    'инстаграм',
    'instagram',
    'контент-менеджер',
    'smm менеджер',
    'смм менеджер',
    'сммщик',
    'риллс',
    'риллсмейкер',
    'рилсмейкер',
    'рилсы',
    'вконтакте',
    'вк',
    'vkontakte',
    'телеграм',
  ],
  seo: [
    'seo',
    'поисковая оптимизация',
    'продвижение сайт',
    'ключевые слова',
    'wordstat',
    'вордстат',
  ],
  dizajn: ['дизайн', 'дизайнер', 'designer', 'figma', 'фигма', 'ui/ux', 'ui ux', 'тильда', 'tilda'],
  marketing: ['маркетинг', 'маркетолог', 'performance', 'контент-маркетинг'],
  menedzher: [
    'менеджер',
    'проджект',
    'prodject',
    'продакт',
    'project manager',
    'product manager',
    'аккаунт',
    'тим лид',
    'team lead',
    'crm',
    'amocrm',
    'amo',
    'амо',
  ],
  target: [
    'таргет',
    'таргетолог',
    'директолог',
    'директ',
    'контекстная реклама',
    'яндекс директ',
    'yandex direct',
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
  hr: ['hr', 'рекрутер', 'кадр', 'hrbp', 'people partner'],
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

/** Match text against tag keywords using word boundary matching. */
export function matchTags(text: string): string[] {
  const lowerText = text.toLowerCase()
  const matched: string[] = []

  for (const [tagSlug, keywords] of Object.entries(TAG_KEYWORDS)) {
    for (const keyword of keywords) {
      const idx = lowerText.indexOf(keyword.toLowerCase())
      if (idx === -1) continue

      const before = idx > 0 ? lowerText[idx - 1] : ' '
      const after = idx + keyword.length < lowerText.length ? lowerText[idx + keyword.length] : ' '

      const isBoundary = (ch: string) => /[\s\.,;:!?\-—–()\/\[\]{}«»"'#@\n\r]/.test(ch)

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
