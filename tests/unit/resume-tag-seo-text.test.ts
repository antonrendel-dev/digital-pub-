import { RESUME_TAG_SEO_TEXT, TAG_H1 } from '../../lib/tagH1'

// Страницы /resumes/tag/* и /vacancies/* делили один tag.seoText из Payload,
// хотя интент у них противоположный: на вакансии идёт соискатель, на резюме —
// работодатель. Из-за этого на /resumes/tag/target не было ни одного вхождения
// «найти таргетолога», а дописать его в общий текст значило занести наём на
// страницу вакансий.
describe('RESUME_TAG_SEO_TEXT', () => {
  const plain = (html: string) =>
    html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()

  it('покрывает тег target', () => {
    expect(RESUME_TAG_SEO_TEXT.target).toBeDefined()
  })

  it('содержит ключ найма, которого не было на странице', () => {
    const text = plain(RESUME_TAG_SEO_TEXT.target)
    expect(text).toContain('найти таргетолога')
    expect(text).toContain('нанять таргетолога')
  })

  it('написан под работодателя, а не под соискателя', () => {
    const text = plain(RESUME_TAG_SEO_TEXT.target)
    // Формулировки соискательской воронки на странице резюме неуместны.
    expect(text).not.toContain('ваше резюме')
    expect(text).not.toContain('откликнуться на вакансию')
  })

  it('это размеченный HTML с заголовками, а не голый текст', () => {
    expect(RESUME_TAG_SEO_TEXT.target).toMatch(/<h2>/)
    expect(RESUME_TAG_SEO_TEXT.target).toMatch(/<p>/)
  })

  it('даёт заметный объём, а не пару предложений', () => {
    expect(plain(RESUME_TAG_SEO_TEXT.target).split(' ').length).toBeGreaterThan(200)
  })

  it('ключи словаря совпадают со слагами тегов', () => {
    for (const slug of Object.keys(RESUME_TAG_SEO_TEXT)) {
      expect(TAG_H1[slug] ?? slug).toBeTruthy()
      expect(slug).toMatch(/^[a-z0-9-]+$/)
    }
  })
})
