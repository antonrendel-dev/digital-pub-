import fs from 'fs'
import path from 'path'
import {
  type PlannedH2,
  buildPlannerPrompt,
  buildWriterPrompt,
  renderPlanText,
} from '../../scripts/content-factory/lib/prompts'
import { type TechSpec, renderTechSpec } from '../../scripts/content-factory/lib/tz'

// Потолок на сборку промпта из фикстуры. Это НЕ размер того, что уходит в модель:
// на живых данных промпт писателя весит ~2700 слов (замер seo по стенограмме прогона
// 220 от 05.09.2026: ТЗ и план — 1476 слов, свод правил — 484, голос и хвост — 803).
// Основную массу дают ТЗ и план, а их объём задаёт тема, а не промпт. Фикстура
// сторожит только сборку: чтобы шаблон не оброс новыми блоками.
const PROMPT_FIXTURE_WORD_LIMIT = 1300
// Настоящий предмет охраны: свод правил. До разгрузки C4 в нём было 1435 слов —
// двадцать нумерованных пунктов со ссылками на стандарт; сейчас около 500.
const RULES_WORD_LIMIT = 700
// Образец голоса уходит в промпт целиком и на живом прогоне весит больше самих
// правил. Потолок с запасом к текущим 483 словам: расти ему незачем.
const VOICE_SAMPLE_WORD_LIMIT = 600

const countWords = (s: string): number => s.split(/\s+/).filter(Boolean).length

// Фикстурный образец голоса — выдержка из assets/voice-sample.md. Целиком файл сюда не
// читается намеренно: он часть данных, а не инструкции, и правка образца не должна ронять
// тест про размер промпта. Потолок сторожит свод правил, который и разрастался.
const fixtureVoiceSample = `## Так пишем

В вакансии «Junior-таргетолог, VK Ads» от 2 сентября 2026 года вилка 60 000–75 000 ₽ и одно
требование к новичку: приложить кампанию, которую вели сами. Не диплом и не сертификат курса —
кампанию. Такое резюме таргетолога без опыта собирают не из строчек про обучение, а из одного
разобранного запуска.

## Так не пишем

- «Это основная граница роли.» — абзац из одного афористичного предложения без факта: звучит
  как вывод, а вывода нет.
- «Миф о том, что одного универсального файла достаточно, неверен.» — чужая позиция и чужая
  свежесть, автора в тексте нет.`

const spec: TechSpec = {
  topicId: 42,
  title: 'Как таргетологу собрать резюме без опыта',
  mainKeyword: 'резюме таргетолога',
  mainVolume: 480,
  audience: 'Начинающий таргетолог',
  intent: 'информационный',
  metaTitle: 'Резюме таргетолога: что писать без опыта',
  metaDesc:
    'Разбираем, что писать в резюме таргетолога без опыта: структура, кейсы, метрики и типичные ошибки, из-за которых отклик закрывают на первом экране.',
  maxMainKeyUses: 6,
  exactPhrases: [
    { phrase: 'резюме таргетолога', uses: 3 },
    { phrase: 'без опыта работы', uses: 2 },
  ],
  dilutedPhrases: ['образец резюме', 'сопроводительное письмо'],
  stopPhrases: [{ phrase: 'вакансии таргетолог', ownerUrl: 'https://d-pub.ru/vacancies/target' }],
  interlinks: ['https://d-pub.ru/vacancies/target'],
  h2Requirements: ['структура резюме', 'что писать вместо опыта', 'типичные ошибки'],
  wordCountMin: 1300,
  wordCountMax: 1800,
  factualAnchors: ['вилка junior-таргетолога по данным hh.ru за 2026 год'],
  antifakeMarkers: ['Миф: без диплома не берут — Факт: 67% вакансий его не требуют (hh.ru)'],
  agreedBy: ['analyst', 'seo'],
}

const plan: PlannedH2[] = [
  {
    title: 'Что такое резюме таргетолога и чем оно отличается от обычного',
    type: 'definition',
    keyPoints: ['документ про запуски, а не про образование', 'формат отклика на job board'],
    factualAnchors: ['доля вакансий без требования к диплому — hh.ru, 2026'],
  },
  {
    title: 'Сколько платят junior-таргетологу в 2026 году',
    type: 'salary',
    keyPoints: ['вилка по регионам', 'разрыв фриланс и штат'],
    factualAnchors: ['медиана junior по данным крупных job-платформ'],
    table: true,
  },
  {
    title: 'Как собрать резюме, если запусков ещё не было',
    type: 'howto',
    keyPoints: ['тестовая кампания на свой бюджет', 'что показать вместо опыта'],
  },
  {
    title: 'Резюме на job board и резюме для агентства: в чём разница',
    type: 'comparison',
    keyPoints: ['разные читатели', 'разная длина'],
  },
  {
    title: 'Ошибки, из-за которых отклик закрывают',
    type: 'list',
    keyPoints: ['раздел «О себе» вместо кабинета', 'список курсов без результата'],
  },
  {
    title: 'Частые вопросы про резюме таргетолога',
    type: 'faq',
    keyPoints: ['можно ли без опыта', 'нужен ли диплом', 'сколько учиться'],
  },
]

const writerInput = () => ({
  keyword: spec.mainKeyword,
  tzText: renderTechSpec(spec),
  planText: renderPlanText(plan),
  lsi: ['таргетолог', 'VK Ads', 'портфолио', 'кейс', 'CTR', 'бюджет', 'оффер', 'стажировка'],
  dataGaps: ['актуальная медиана junior за 2026 год'],
  successCriteria: ['featured snippet по «резюме таргетолога без опыта»'],
  voiceSample: fixtureVoiceSample,
  dynamicSeoBlock: '',
})

describe('промпт писателя', () => {
  it(`на фикстуре умещается в ${PROMPT_FIXTURE_WORD_LIMIT} слов`, () => {
    const words = countWords(buildWriterPrompt(writerInput()))

    // Число в отчёт: когда потолок однажды подойдёт вплотную, видно будет заранее.
    console.log(`[prompt-size] промпт писателя на фикстуре: ${words} слов`)
    expect(words).toBeLessThanOrEqual(PROMPT_FIXTURE_WORD_LIMIT)
  })

  it(`свод правил без данных умещается в ${RULES_WORD_LIMIT} слов`, () => {
    // Разрастается именно инструкция: до разгрузки в ней было 1435 слов — двадцать
    // нумерованных правил со ссылками на пункты стандарта. ТЗ, план и образец голоса
    // в этот бюджет не входят: это данные, их объём задаёт тема, а не промпт.
    const rulesOnly = buildWriterPrompt({
      ...writerInput(),
      tzText: '',
      planText: '',
      lsi: [],
      dataGaps: [],
      successCriteria: [],
      voiceSample: '',
    })

    console.log(`[prompt-size] свод правил: ${countWords(rulesOnly)} слов`)
    expect(countWords(rulesOnly)).toBeLessThanOrEqual(RULES_WORD_LIMIT)
  })

  it(`образец голоса не разрастается: ≤ ${VOICE_SAMPLE_WORD_LIMIT} слов`, () => {
    // Читаем боевой файл, а не фикстуру: в промпт уходит именно он, и на живом
    // прогоне он весит больше, чем весь свод правил.
    const words = countWords(
      fs.readFileSync(
        path.join(__dirname, '../../scripts/content-factory/assets/voice-sample.md'),
        'utf-8'
      )
    )

    console.log(`[prompt-size] образец голоса: ${words} слов`)
    expect(words).toBeLessThanOrEqual(VOICE_SAMPLE_WORD_LIMIT)
  })
})

describe('план для писателя', () => {
  it('печатает тип H2 и признак таблицы — писатель выбирает форму подачи по ним', () => {
    const text = renderPlanText(plan)

    expect(text).toContain('[definition]')
    expect(text).toContain('[salary]')
    expect(text).toContain('Таблица: да')
    // Признак таблицы стоит только у того блока, где его выставил планировщик.
    expect(text.match(/Таблица: да/g)).toHaveLength(1)
  })
})

describe('промпт планировщика', () => {
  const plannerInput = () => ({
    topic: { title: spec.title, keyword: spec.mainKeyword, type: 'Гайд' },
    outlineHint: '',
    seoData: {
      intent: 'информационный',
      lsi: ['таргетолог', 'портфолио'],
      painPoints: ['нет опыта', 'не зовут на собеседование'],
      competitorH2s: ['Кто такой таргетолог'],
      uniqueAngle: 'разбор по реальным вакансиям d-pub',
      dataGaps: [],
      mandatoryBigrams: ['резюме таргетолога'],
      antifakeMarkers: [],
    },
  })

  it('требует тип H2, факты-якоря и признак таблицы в JSON плана', () => {
    const prompt = buildPlannerPrompt(plannerInput())

    for (const field of ['"type"', '"factualAnchors"', '"table"']) {
      expect(prompt).toContain(field)
    }
    expect(prompt).toContain('definition | salary | howto | comparison | list | story | faq')
  })
})
