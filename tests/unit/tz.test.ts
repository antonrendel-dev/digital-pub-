import { selectLsiPhrases } from '../../scripts/content-factory/lib/lsi'
import {
  type TechSpec,
  buildSourceDataBlock,
  buildTopvisorContext,
  checkTechSpec,
  containsMainKeyword,
  renderTechSpec,
} from '../../scripts/content-factory/lib/tz'

// Срез банка Топвизора: ключ темы, соседний ключ чужой страницы и заведомо чужая тема.
const semantics = {
  snapshotDate: '2026-08-15',
  keywords: [
    { keyword: 'резюме таргетолога', position: 47, relevantUrl: 'https://d-pub.ru/articles/rez-t' },
    {
      keyword: 'вакансии таргетолог',
      position: 12,
      relevantUrl: 'https://d-pub.ru/vacancies/target',
    },
    { keyword: 'резюме таргетолога образец', position: null, relevantUrl: '' },
    { keyword: 'зарплата дизайнера', position: 8, relevantUrl: 'https://d-pub.ru/articles/zp-dis' },
  ],
}

const baseSpec = (over: Partial<TechSpec> = {}): TechSpec => ({
  topicId: 1,
  title: 'Как таргетологу собрать резюме',
  mainKeyword: 'резюме таргетолога',
  mainVolume: 480,
  audience: 'Соискатель',
  intent: 'информационный',
  metaTitle: 'Резюме таргетолога: как собрать и что писать',
  metaDesc:
    'Разбираем, что писать в резюме таргетолога без опыта и с опытом: структура, кейсы, метрики и типичные ошибки, из-за которых отклик не читают дальше.',
  maxMainKeyUses: 6,
  exactPhrases: [{ phrase: 'резюме таргетолога', uses: 3 }],
  dilutedPhrases: ['без опыта', 'образец'],
  stopPhrases: [{ phrase: 'вакансии таргетолог', ownerUrl: 'https://d-pub.ru/vacancies/target' }],
  interlinks: ['https://d-pub.ru/vacancies/target'],
  h2Requirements: ['структура резюме', 'ошибки'],
  wordCountMin: 20,
  wordCountMax: 3000,
  faqMinWords: 120,
  factualAnchors: [],
  antifakeMarkers: [],
  agreedBy: ['analyst', 'seo'],
  ...over,
})

describe('buildTopvisorContext', () => {
  it('берёт ключи темы и отбрасывает чужую тематику', () => {
    const ctx = buildTopvisorContext('резюме таргетолога', 'Как собрать резюме', semantics)
    const found = ctx.stopList.map((k) => k.keyword)

    expect(found).toContain('резюме таргетолога')
    expect(found).toContain('вакансии таргетолог')
    expect(found).not.toContain('зарплата дизайнера')
  })

  it('совпадения по одному интент-слову недостаточно', () => {
    const ctx = buildTopvisorContext('резюме таргетолога', 'Как собрать резюме', {
      snapshotDate: '2026-08-15',
      keywords: [
        { keyword: 'резюме дизайнера', position: 20, relevantUrl: 'https://d-pub.ru/a/rez-d' },
      ],
    })
    expect(ctx.stopList).toEqual([])
  })

  it('не берёт ключи без посадочной — они ничего не запрещают', () => {
    const ctx = buildTopvisorContext('резюме таргетолога', 'Как собрать резюме', semantics)
    expect(ctx.stopList.map((k) => k.keyword)).not.toContain('резюме таргетолога образец')
  })

  it('в дожим отбирает только коридор 31-100', () => {
    const ctx = buildTopvisorContext('резюме таргетолога', 'Как собрать резюме', semantics)

    expect(ctx.pushUp.map((k) => k.keyword)).toEqual(['резюме таргетолога'])
  })

  it('переживает отсутствие файла семантики', () => {
    const ctx = buildTopvisorContext('резюме таргетолога', 'Заголовок', {
      keywords: [],
      snapshotDate: '',
    })
    expect(ctx.pushUp).toEqual([])
    expect(ctx.stopList).toEqual([])
  })
})

describe('containsMainKeyword', () => {
  // Живой прогон 20.08.2026: SEO поставил «резюме таргетолога без опыта» четыре раза
  // точным вхождением. Вместе с шестью обязательными местами это 10 при лимите 6.
  it('узнаёт вложенную фразу Вордстата', () => {
    expect(containsMainKeyword('резюме таргетолога без опыта', 'резюме таргетолога')).toBe(true)
    expect(containsMainKeyword('образец резюме таргетолога', 'резюме таргетолога')).toBe(true)
  })

  it('не трогает соседние фразы без главного ключа', () => {
    expect(containsMainKeyword('вакансии таргетолог', 'резюме таргетолога')).toBe(false)
    expect(containsMainKeyword('портфолио кейсы', 'резюме таргетолога')).toBe(false)
  })
})

describe('buildSourceDataBlock', () => {
  it('подаёт занятые ключи вместе с их владельцами', () => {
    const lsi = selectLsiPhrases(
      [
        { phrase: 'резюме таргетолога', count: 480 },
        { phrase: 'резюме таргетолога без опыта', count: 210 },
      ],
      'резюме таргетолога',
      480
    )
    const ctx = buildTopvisorContext('резюме таргетолога', 'Как собрать резюме', semantics)
    const block = buildSourceDataBlock('резюме таргетолога', 480, lsi, ctx)

    expect(block).toContain('https://d-pub.ru/vacancies/target')
    expect(block).toContain('ЗАНЯТЫЕ КЛЮЧИ')
    expect(block).toContain('без опыта')
  })
})

describe('renderTechSpec', () => {
  it('называет лимит вхождений цифрой', () => {
    const text = renderTechSpec(baseSpec())
    expect(text).toContain('не более 6 раз')
  })

  it('несёт STOP-лист с адресами владельцев', () => {
    const text = renderTechSpec(baseSpec())
    expect(text).toContain('STOP-ЛИСТ')
    expect(text).toContain('https://d-pub.ru/vacancies/target')
  })
})

describe('checkTechSpec', () => {
  const good = [
    '# Резюме таргетолога: как собрать',
    '',
    'Резюме таргетолога читают восемь секунд. Разберём структуру по шагам, чтобы',
    'отклик не закрыли на первом экране, а дочитали до кейсов и метрик.',
    '',
    '## Структура',
    '',
    'Хорошее резюме таргетолога начинается с результатов, а не с обязанностей.',
    'Свежие предложения смотри в [подборке](https://d-pub.ru/vacancies/target).',
  ].join('\n')

  it('на статье по ТЗ не находит нарушений', () => {
    expect(checkTechSpec(baseSpec(), good)).toEqual([])
  })

  it('ловит переспам главного ключа', () => {
    const spam = good + '\n\nрезюме таргетолога '.repeat(10)
    const rules = checkTechSpec(baseSpec(), spam).map((v) => v.rule)
    expect(rules).toContain('Переспам главного ключа')
  })

  it('ловит недобор точного вхождения', () => {
    const thin = good.replace(/Хорошее резюме таргетолога/, 'Хороший документ')
    const v = checkTechSpec(baseSpec(), thin)
    expect(v.map((x) => x.rule)).toContain('Недобор точного вхождения')
  })

  it('ловит занятый ключ в заголовке, но терпит его в теле', () => {
    const inHeading = good.replace('## Структура', '## Вакансии таргетолог и требования')
    expect(checkTechSpec(baseSpec(), inHeading).map((v) => v.rule)).toContain(
      'Занятый ключ в заголовке'
    )

    const inBody = good + '\n\nСмотри вакансии таргетолог на сайте.'
    expect(checkTechSpec(baseSpec(), inBody).map((v) => v.rule)).not.toContain(
      'Занятый ключ в заголовке'
    )
  })

  it('ловит отсутствие обязательной ссылки', () => {
    const noLink = good.replace(
      /\[подборке\]\(https:\/\/d-pub\.ru\/vacancies\/target\)/,
      'подборке'
    )
    expect(checkTechSpec(baseSpec(), noLink).map((v) => v.rule)).toContain(
      'Нет обязательной ссылки'
    )
  })

  it('засчитывает относительную ссылку наравне с абсолютной', () => {
    const relative = good.replace('https://d-pub.ru/vacancies/target', '/vacancies/target')
    expect(checkTechSpec(baseSpec(), relative).map((v) => v.rule)).not.toContain(
      'Нет обязательной ссылки'
    )
  })

  it('ловит недобор объёма', () => {
    expect(checkTechSpec(baseSpec({ wordCountMin: 5000 }), good).map((v) => v.rule)).toContain(
      'Недобор объёма'
    )
  })

  it('ловит длинный title и description вне коридора', () => {
    const rules = checkTechSpec(
      baseSpec({ metaTitle: 'x'.repeat(70), metaDesc: 'коротко' }),
      good
    ).map((v) => v.rule)

    expect(rules).toContain('Длинный title')
    expect(rules).toContain('Description вне 130-155')
  })
})
