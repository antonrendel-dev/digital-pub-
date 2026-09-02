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
      { name: 'UX/UI-дизайнера', count: 15 },
      { name: 'веб-дизайнера', count: 4 },
    ])
    // «Ищут» требует винительного падежа — форма берётся из данных, не строится.
    expect(lead).toContain('где ищут UX/UI-дизайнера и веб-дизайнера.')
  })

  it('не ставит снимочное число профессий рядом с живым числом вакансий', () => {
    const lead = buildToolLead('Tilda', 3, [{ name: 'веб-дизайнера', count: 15 }])
    expect(lead).toContain('3 вакансии')
    expect(lead).not.toMatch(/веб-дизайнера\s*[—-]?\s*15/)
  })

  it('не обещает вакансий, когда их ноль', () => {
    const lead = buildToolLead('Miro', 0, [])
    expect(lead).not.toMatch(/\b0 вакансий/)
    expect(lead).toContain('собираем объявления')
  })

  it('держится в пределах экрана', () => {
    const long = buildToolLead('Screaming Frog', 128, [
      {
        name: 'SEO-специалист по технической оптимизации крупных порталов и маркетплейсов с уклоном в аудит структуры, скорости загрузки и внутренней перелинковки',
        count: 12,
      },
      {
        name: 'Аналитик поисковой оптимизации и технического аудита сайтов уровня senior с опытом руководства командой и постановки задач разработчикам и аналитикам смежных направлений',
        count: 8,
      },
    ])
    expect(long.length).toBeLessThanOrEqual(LEAD_MAX_CHARS)
    expect(long.split(/\s+/).length).toBeLessThanOrEqual(LEAD_MAX_WORDS)
    // Сработал именно фолбэк на короткую версию, а не «случайно уложились».
    expect(long).not.toContain('Чаще всего')
  })

  it('отбрасывает профессии без вакансий', () => {
    const lead = buildToolLead('Notion', 5, [{ name: 'проджект-менеджера', count: 0 }])
    expect(lead).not.toContain('проджект-менеджера')
  })
})
