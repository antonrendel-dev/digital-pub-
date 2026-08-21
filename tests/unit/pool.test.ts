import { buildPhrasePool, isListingIntent } from '../../scripts/content-factory/lib/pool'

describe('isListingIntent', () => {
  // Разбор банка Топвизора 21.08.2026: 281 фраза из 342 в коридоре — листинговые.
  // Статья по такому ключу конкурирует с нашей же посадочной джоб-борда.
  it('узнаёт запрос за списком вакансий', () => {
    expect(isListingIntent('вакансии таргетолог')).toBe(true)
    expect(isListingIntent('таргетолог вакансии')).toBe(true)
    expect(isListingIntent('работа менеджер маркетплейсов удаленно')).toBe(true)
    expect(isListingIntent('работа таргетологом')).toBe(true)
    expect(isListingIntent('удаленная работа')).toBe(true)
  })

  it('пропускает информационные фразы со словом «вакансии»', () => {
    expect(isListingIntent('где размещать вакансии')).toBe(false)
    expect(isListingIntent('как написать отклик на вакансию')).toBe(false)
    expect(isListingIntent('сколько вакансий смотреть в день')).toBe(false)
  })

  // «Работа» в середине фразы безобидна, «вакансии» — нет, где бы ни стояла.
  it('различает «работа» и «вакансии» внутри фразы', () => {
    expect(isListingIntent('собеседование на работу вопросы работодателю')).toBe(false)
    expect(isListingIntent('удаленная работа на дому в декрете')).toBe(false)
    expect(isListingIntent('аналитик вакансии москва')).toBe(true)
    expect(isListingIntent('разработчик вакансии без опыта')).toBe(true)
  })

  it('отбрасывает навигационные запросы к агрегаторам', () => {
    expect(isListingIntent('авито работа бухгалтер удаленно')).toBe(true)
    expect(isListingIntent('яндекс работа удаленно на дому без опыта')).toBe(true)
  })
})

describe('buildPhrasePool', () => {
  const seeds = {
    'резюме таргетолога': {
      volume: 480,
      relevantUrl: null,
      nested: [
        { phrase: 'резюме таргетолога без опыта', count: 210 },
        { phrase: 'образец резюме таргетолога', count: 640 },
      ],
    },
    'вакансии таргетолог': { volume: 900, relevantUrl: null },
    'зарплата дизайнера': { volume: 1200, relevantUrl: 'https://d-pub.ru/articles/zp-dis' },
    'как стать тестировщиком': { volume: 12000, relevantUrl: null },
  }

  it('берёт затравки и вложенные фразы в коридоре', () => {
    const phrases = buildPhrasePool(seeds).map((p) => p.phrase)

    expect(phrases).toContain('резюме таргетолога')
    expect(phrases).toContain('образец резюме таргетолога')
  })

  it('выбрасывает то, что вне коридора', () => {
    const phrases = buildPhrasePool(seeds).map((p) => p.phrase)

    expect(phrases).not.toContain('резюме таргетолога без опыта')
    expect(phrases).not.toContain('как стать тестировщиком')
  })

  it('не отдаёт ключи, за которыми уже стоит наша страница', () => {
    expect(buildPhrasePool(seeds).map((p) => p.phrase)).not.toContain('зарплата дизайнера')
  })

  it('не отдаёт листинговые запросы', () => {
    expect(buildPhrasePool(seeds).map((p) => p.phrase)).not.toContain('вакансии таргетолог')
  })

  it('вычитает занятое темами батча, различая ё и регистр', () => {
    const phrases = buildPhrasePool(seeds, ['Резюме Таргетолога']).map((p) => p.phrase)
    expect(phrases).not.toContain('резюме таргетолога')

    const withYo = buildPhrasePool({ 'ключевые навыки': { volume: 500 } }, ['ключевые навыки'])
    expect(withYo).toEqual([])
  })

  it('сортирует по убыванию спроса и режет по лимиту', () => {
    const pool = buildPhrasePool(seeds, [], 1)
    expect(pool).toEqual([{ phrase: 'образец резюме таргетолога', volume: 640 }])
  })
})
