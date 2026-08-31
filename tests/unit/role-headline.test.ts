import { matchTags, roleHeadline } from '../../lib/tag-matcher'

describe('roleHeadline', () => {
  it('берёт первую непустую строку, пропуская хештеги канала', () => {
    const body = '#SMM\n\n🔴 Контент-продюсер в VAVS. Удаленка.\n\nО НАС: студия…'
    expect(roleHeadline(body)).toBe('🔴 Контент-продюсер')
  })

  it('отрезает работодателя после предлога места', () => {
    expect(roleHeadline('Менеджер по продажам в SMM-Академию')).toBe('Менеджер по продажам')
    expect(roleHeadline('Копирайтер для Дзен')).toBe('Копирайтер')
  })

  it('не берёт вторую строку — там уже описание компании', () => {
    const body = 'Frontend-разработчик\nВенчурная студия с маркетинговым уклоном'
    expect(roleHeadline(body)).toBe('Frontend-разработчик')
  })

  it('на пустом теле возвращает пустую строку', () => {
    expect(roleHeadline('')).toBe('')
    expect(roleHeadline('#smm\n#вакансия')).toBe('')
  })
})

describe('специализация ищется в шапке роли, а не в title и не во всём теле', () => {
  it('находит роль, когда title — это хештег канала', () => {
    expect(matchTags('CRM', '#CRM\n\nSMM-менеджер в BOHOANN\n\nО нас…')).toContain('smm')
  })

  it('не тянет тег из тела объявления', () => {
    const body = 'Копирайтер\n\nБудем работать с фотографами и монтажёрами'
    expect(matchTags('АВТОР', body)).not.toContain('videomontazher')
  })

  it('не тянет тег из названия работодателя', () => {
    const body = 'Менеджер по продажам в SMM-Академию Михаила\n\nО нас…'
    const tags = matchTags('CRM', body)
    expect(tags).toContain('menedzher')
    expect(tags).not.toContain('smm')
  })
})

describe('склонения', () => {
  it.each([
    ['Ищем дизайнера', 'dizajn'],
    ['Ищут монтажера', 'videomontazher'],
    ['Креативный продюсер', 'kreativ'],
    ['Финансовый директор', 'finansy'],
    ['Требуется таргетолога', 'target'],
  ])('%s → %s', (text, tag) => {
    expect(matchTags(text, text)).toContain(tag)
  })

  it('окончание длиннее трёх букв — уже другое слово', () => {
    expect(matchTags('Дизайнерский подход к работе', 'Дизайнерский подход')).not.toContain('dizajn')
  })

  it('на латинские ключи склонение не распространяется', () => {
    expect(matchTags('Работа с seotext данными', 'Работа с seotext данными')).not.toContain('seo')
    expect(matchTags('Chrome developer needed', 'Chrome developer needed')).not.toContain('hr')
  })
})

describe('ловушка «директ» → «директор»', () => {
  it('арт-директор не попадает в target', () => {
    const tags = matchTags('Арт-директор', 'Арт-директор')
    expect(tags).not.toContain('target')
    expect(tags).toContain('kreativ')
  })

  it('финансовый директор не попадает в target', () => {
    expect(matchTags('Финансовый директор', 'Финансовый директор')).not.toContain('target')
  })

  it('падежи самого Директа не теряются', () => {
    expect(matchTags('Настройка Яндекс Директа', 'Настройка Яндекс Директа')).toContain('target')
    expect(matchTags('Специалист по Директу', 'Специалист по Директу')).toContain('target')
  })
})

describe('hr перестал быть тегом без правил', () => {
  it.each(['HR-менеджер', 'Рекрутер', 'Ищем рекрутера'])('%s → hr', (text) => {
    expect(matchTags(text, text)).toContain('hr')
  })

  it('не срабатывает на упоминании отдела в теле', () => {
    expect(matchTags('SMM', 'SMM-специалист\n\nHR свяжется с вами')).not.toContain('hr')
  })
})
