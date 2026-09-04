import { selectLsiPhrases } from '../../scripts/content-factory/lib/lsi'
import {
  type TechSpec,
  buildSourceDataBlock,
  buildTopvisorContext,
  checkTechSpec,
  containsMainKeyword,
  isBrandKeyword,
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

  it('ставит частотность рядом с занятым ключом и целью дожима', () => {
    const lsi = selectLsiPhrases(
      [{ phrase: 'резюме таргетолога', count: 480 }],
      'резюме таргетолога',
      480
    )
    const withVolumes = {
      ...semantics,
      keywords: semantics.keywords.map((k) => ({ ...k, volume: 640 })),
    }
    const ctx = buildTopvisorContext('резюме таргетолога', 'Как собрать резюме', withVolumes)
    const block = buildSourceDataBlock('резюме таргетолога', 480, lsi, ctx)

    expect(block).toContain('"резюме таргетолога" — 640/мес → https://d-pub.ru/articles/rez-t')
    expect(block).toContain('"резюме таргетолога" — 640/мес, позиция 47')
  })

  it('молчит о частотности, когда замера нет', () => {
    const lsi = selectLsiPhrases(
      [{ phrase: 'резюме таргетолога', count: 480 }],
      'резюме таргетолога',
      480
    )
    const ctx = buildTopvisorContext('резюме таргетолога', 'Как собрать резюме', semantics)
    const block = buildSourceDataBlock('резюме таргетолога', 480, lsi, ctx)

    expect(block).not.toContain('/мес → ')
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
    '## Структура резюме таргетолога',
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

  it('ловит недобор обязательной фразы', () => {
    const thin = good
      .replace(/Хорошее резюме таргетолога/, 'Хороший документ')
      .replace('## Структура резюме таргетолога', '## Структура')
    const v = checkTechSpec(baseSpec(), thin)
    expect(v.map((x) => x.rule)).toContain('Недобор обязательной фразы')
  })

  it('засчитывает обязательную фразу в другой грамматической форме и порядке слов', () => {
    const inflected = good.replace(/Хорошее резюме таргетолога/, 'Хорошее резюме для таргетологов')
    expect(checkTechSpec(baseSpec(), inflected).map((x) => x.rule)).not.toContain(
      'Недобор обязательной фразы'
    )
  })

  it('отклоняет фразы-шаблоны старого промпта', () => {
    const templated =
      good +
      '\n\nМы разбираем тысячи вакансий каждую неделю и замечаем: кейсы важнее стажа.' +
      '\n\nМиф о том, что диплом обязателен, неверен.'
    const v = checkTechSpec(baseSpec(), templated).filter((x) => x.rule === 'Шаблонная фраза')
    expect(v).toHaveLength(2)

    const once = good + '\n\nНа самом деле кейсы важнее стажа.'
    expect(checkTechSpec(baseSpec(), once).map((x) => x.rule)).not.toContain('Шаблонная фраза')
    const twice = once + ' На самом деле и портфолио тоже.'
    const v2 = checkTechSpec(baseSpec(), twice).filter((x) => x.rule === 'Шаблонная фраза')
    expect(v2).toHaveLength(1)
    expect(v2[0].detail).toContain('лишнее: …')

    // «миф о том, чтобы» — не шаблон: граница слова справа.
    const chtoby = good + '\n\nЭто миф о том, чтобы бояться отказов.'
    expect(checkTechSpec(baseSpec(), chtoby).map((x) => x.rule)).not.toContain('Шаблонная фраза')
  })

  it('ключ в первых 60 словах и в первом H2 — в любой форме', () => {
    const inflected = good
      .replace('Резюме таргетолога читают', 'Резюме для таргетологов читают')
      .replace('## Структура резюме таргетолога', '## Структура резюме таргетологов')
    const r1 = checkTechSpec(baseSpec(), inflected).map((x) => x.rule)
    expect(r1).not.toContain('Ключа нет в первых 60 словах')
    expect(r1).not.toContain('Ключа нет в первом H2')

    // Ключ только в H1 и в первом H2 — в тексте первых 60 слов его нет.
    const noKeyLead = good
      .replace('Резюме таргетолога читают', 'Отклик читают')
      .replace('Хорошее резюме таргетолога', 'Хороший документ')
    expect(checkTechSpec(baseSpec(), noKeyLead).map((x) => x.rule)).toContain(
      'Ключа нет в первых 60 словах'
    )

    const partialH2 = good.replace('## Структура резюме таргетолога', '## Структура резюме')
    const v = checkTechSpec(baseSpec(), partialH2).find((x) => x.rule === 'Ключа нет в первом H2')
    expect(v?.detail).toContain('«Структура резюме»')
    expect(v?.detail).toContain('«таргет…»')
    expect(v?.detail).not.toContain('«резюме…»')

    // STOP-фраза внутри главного ключа: ключ в H2 отклонит «Занятый ключ», поэтому
    // правило первого H2 не применяется — иначе приёмка неразрешима.
    const trapped = baseSpec({
      mainKeyword: 'вакансии таргетолог',
      exactPhrases: [],
      stopPhrases: [
        { phrase: 'вакансии таргетолог', ownerUrl: 'https://d-pub.ru/vacancies/target' },
      ],
    })
    const trappedText = good
      .replace('Резюме таргетолога читают', 'Вакансии таргетолога читают')
      .replace('## Структура резюме таргетолога', '## Структура отклика')
    expect(checkTechSpec(trapped, trappedText).map((x) => x.rule)).not.toContain(
      'Ключа нет в первом H2'
    )

    // «## » внутри code fence — не первый H2.
    const fenced = good.replace(
      '## Структура резюме таргетолога',
      '```\n## не заголовок\n```\n\n## Структура резюме таргетолога'
    )
    expect(checkTechSpec(baseSpec(), fenced).map((x) => x.rule)).not.toContain(
      'Ключа нет в первом H2'
    )

    // Ключ за 60-м словом — не в лиде; alt картинки и <img> в счёт слов не идут.
    const filler = Array.from({ length: 70 }, () => 'слово').join(' ')
    const late = good.replace('Резюме таргетолога читают', `${filler} Резюме таргетолога читают`)
    expect(checkTechSpec(baseSpec(), late).map((x) => x.rule)).toContain(
      'Ключа нет в первых 60 словах'
    )
    const img = `<img src="/x.png" alt="${filler}" />\n\n` + good.replace(/^# .*\n\n/, '')
    expect(checkTechSpec(baseSpec(), img).map((x) => x.rule)).not.toContain(
      'Ключа нет в первых 60 словах'
    )
  })

  it('отклоняет ключ жирным и открытие статьи определением ключа', () => {
    const bold = good.replace('Резюме таргетолога читают', '**Резюме таргетолога** читают')
    expect(checkTechSpec(baseSpec(), bold).map((x) => x.rule)).toContain('Ключ выделен жирным')

    const definition = good.replace(
      'Резюме таргетолога читают восемь секунд.',
      'Резюме таргетолога — это документ, который читают восемь секунд.'
    )
    expect(checkTechSpec(baseSpec(), definition).map((x) => x.rule)).toContain(
      'Статья открывается определением ключа'
    )
    // Определение внутри H2, а не первым предложением статьи — норма (правило D4).
    const inside = good.replace(
      'Хорошее резюме таргетолога начинается',
      'Резюме таргетолога — это документ, который начинается'
    )
    expect(checkTechSpec(baseSpec(), inside).map((x) => x.rule)).not.toContain(
      'Статья открывается определением ключа'
    )
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

describe('брендовые ключи в STOP-листе', () => {
  it('узнаёт бренд в любом написании', () => {
    expect(isBrandKeyword('диджитал паб')).toBe(true)
    expect(isBrandKeyword('digital pub ru')).toBe(true)
    expect(isBrandKeyword('d-pub вакансии')).toBe(true)
    expect(isBrandKeyword('вакансии digital маркетолога')).toBe(false)
  })

  // Регрессия: в строку сопоставления входит заголовок, а заголовки у нас сплошь
  // «... digital-специалисту». По этому слову к теме подтягивались брендовые
  // запросы, закреплённые за главной, — на очереди из 40 тем 24 такие позиции.
  it('не тащит бренд в STOP-лист из-за слова digital в заголовке', () => {
    const brandSemantics = {
      snapshotDate: '2026-08-15',
      keywords: [
        { keyword: 'digital pub', position: 1, relevantUrl: 'https://d-pub.ru/' },
        { keyword: 'диджитал паб', position: 1, relevantUrl: 'https://d-pub.ru/' },
        {
          keyword: 'вакансии digital аналитика',
          position: 34,
          relevantUrl: 'https://d-pub.ru/vacancies/analitika',
        },
      ],
    }

    const ctx = buildTopvisorContext(
      'профессиональное выгорание признаки',
      'Профессиональное выгорание: признаки и что делать digital-специалисту',
      brandSemantics
    )

    expect(ctx.stopList.map((k) => k.keyword)).toEqual(['вакансии digital аналитика'])
  })
})
