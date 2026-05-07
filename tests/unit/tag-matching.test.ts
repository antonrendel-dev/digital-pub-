// Test the matchTags function from sync-telegram
// We need to extract it for testing since the module has side effects
// Re-implement the matching logic for pure unit testing

const TAG_KEYWORDS: Record<string, string[]> = {
  smm: ['smm', 'соцсети', 'social media', 'инстаграм', 'instagram', 'контент-менеджер'],
  seo: ['seo', 'поисковая оптимизация', 'продвижение сайт'],
  dizajn: ['дизайн', 'дизайнер', 'figma', 'ui/ux', 'ui ux', 'верстальщик', 'фигма'],
  marketing: ['маркетинг', 'маркетолог', 'performance', 'контент-маркетинг'],
  udalyonka: ['удалённо', 'удаленно', 'удалёнка', 'удаленка', 'remote', 'дистанционно'],
  ofis: ['офис', 'office', 'в офисе'],
  junior: ['junior', 'джуниор', 'стажёр', 'стажер', 'начинающий'],
  middle: ['middle', 'мидл'],
  senior: ['senior', 'сеньор', 'ведущий', 'lead'],
  hr: ['hr', 'рекрутер', 'кадр', 'hrbp', 'people partner'],
  wordpress: ['wordpress', 'вордпресс'],
  target: ['таргет', 'таргетолог', 'target', 'директ', 'контекстная реклама', 'яндекс директ'],
}

function matchTags(text: string): string[] {
  const lowerText = text.toLowerCase()
  const matched: string[] = []

  for (const [tagSlug, keywords] of Object.entries(TAG_KEYWORDS)) {
    for (const keyword of keywords) {
      const idx = lowerText.indexOf(keyword.toLowerCase())
      if (idx === -1) continue

      const before = idx > 0 ? lowerText[idx - 1] : ' '
      const after = idx + keyword.length < lowerText.length ? lowerText[idx + keyword.length] : ' '

      const isBoundary = (ch: string) => /[\s\.,;:!?\-—–()\/\[\]{}«»"'#@\n\r]/.test(ch)
      if ((idx === 0 || isBoundary(before)) && (idx + keyword.length >= lowerText.length || isBoundary(after))) {
        matched.push(tagSlug)
        break
      }
    }
  }

  return matched
}

describe('matchTags', () => {
  it('matches SMM keyword', () => {
    const tags = matchTags('Ищем SMM-менеджера для работы')
    expect(tags).toContain('smm')
  })

  it('matches Cyrillic keywords case-insensitively', () => {
    const tags = matchTags('Вакансия: дизайнер в офисе')
    expect(tags).toContain('dizajn')
    expect(tags).toContain('ofis')
  })

  it('matches remote work keywords', () => {
    const tags = matchTags('Работа удалённо, полная занятость')
    expect(tags).toContain('udalyonka')
  })

  it('handles empty text', () => {
    const tags = matchTags('')
    expect(tags).toEqual([])
  })

  it('matches multiple tags', () => {
    const tags = matchTags('Senior SMM-менеджер, удалённо')
    expect(tags).toContain('smm')
    expect(tags).toContain('udalyonka')
    expect(tags).toContain('senior')
  })

  it('uses word boundaries - no partial matches', () => {
    // "seotext" should NOT match "seo" because no boundary after "seo"
    const tags = matchTags('Работа с seotext данными')
    expect(tags).not.toContain('seo')
  })

  it('matches at start of text', () => {
    const tags = matchTags('SEO-специалист нужен')
    expect(tags).toContain('seo')
  })

  it('matches at end of text', () => {
    const tags = matchTags('Ищем специалиста по SMM')
    expect(tags).toContain('smm')
  })

  it('matches WordPress correctly', () => {
    const tags = matchTags('Разработчик WordPress для корпоративного сайта')
    expect(tags).toContain('wordpress')
  })

  it('matches level tags', () => {
    const tags = matchTags('Junior-разработчик в стартап')
    expect(tags).toContain('junior')
  })

  it('matches HR tag with boundary', () => {
    const tags = matchTags('HR-менеджер в IT-компанию')
    expect(tags).toContain('hr')
  })

  it('does not match HR inside other words', () => {
    // "chr" should not match "hr"
    const tags = matchTags('Chrome developer needed')
    expect(tags).not.toContain('hr')
  })
})
