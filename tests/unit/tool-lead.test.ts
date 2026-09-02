import { buildToolLead, LEAD_MAX_CHARS, LEAD_MAX_WORDS } from '../../lib/tool-lead'

describe('лид под H1 на страницах инструментов', () => {
  it('ставит ключ «Вакансии X» в первое предложение и называет число', () => {
    const lead = buildToolLead('Figma', 15, [])
    expect(lead.startsWith('Вакансии Figma')).toBe(true)
    expect(lead).toContain('15 вакансий')
  })

  it('склоняет слово «вакансия» по числу', () => {
    expect(buildToolLead('Figma', 1, [])).toContain('1 вакансия')
    expect(buildToolLead('Figma', 3, [])).toContain('3 вакансии')
    expect(buildToolLead('Figma', 11, [])).toContain('11 вакансий')
    expect(buildToolLead('Figma', 22, [])).toContain('22 вакансии')
  })

  it('называет профессии, если они есть', () => {
    const lead = buildToolLead('Figma', 15, [
      { nameNominative: 'UX/UI-дизайнер', count: 15 },
      { nameNominative: 'Веб-дизайнер', count: 4 },
    ])
    expect(lead).toContain('UX/UI-дизайнер и веб-дизайнер')
  })

  it('не калечит аббревиатуру в названии профессии', () => {
    const lead = buildToolLead('Figma', 15, [{ nameNominative: 'UX/UI-дизайнер', count: 15 }])
    expect(lead).toContain('UX/UI-дизайнер')
    expect(lead).not.toContain('ux/ui')
  })

  it('не ставит снимочное число профессий рядом с живым числом вакансий', () => {
    const lead = buildToolLead('Tilda', 3, [{ nameNominative: 'Веб-дизайнер', count: 15 }])
    expect(lead).toContain('3 вакансии')
    expect(lead).not.toContain('15')
  })

  it('не обещает вакансий, когда их ноль', () => {
    const lead = buildToolLead('Miro', 0, [])
    expect(lead).not.toMatch(/\b0 вакансий/)
    expect(lead).toContain('собираем объявления')
  })

  it('держится в пределах экрана', () => {
    const long = buildToolLead('Screaming Frog', 128, [
      {
        nameNominative:
          'SEO-специалист по технической оптимизации крупных порталов и маркетплейсов с уклоном в аудит структуры, скорости загрузки и внутренней перелинковки',
        count: 12,
      },
      {
        nameNominative:
          'Аналитик поисковой оптимизации и технического аудита сайтов уровня senior с опытом руководства командой и постановки задач разработчикам и аналитикам смежных направлений',
        count: 8,
      },
    ])
    expect(long.length).toBeLessThanOrEqual(LEAD_MAX_CHARS)
    expect(long.split(/\s+/).length).toBeLessThanOrEqual(LEAD_MAX_WORDS)
    // Сработал именно фолбэк на короткую версию, а не «случайно уложились».
    expect(long).not.toContain('Чаще всего')
  })

  it('отбрасывает профессии без вакансий', () => {
    const lead = buildToolLead('Notion', 5, [{ nameNominative: 'Проджект-менеджер', count: 0 }])
    expect(lead).not.toContain('проджект-менеджер')
  })
})
