import fs from 'fs'
import path from 'path'
import {
  APHORISM_RULE,
  ATTRIBUTION_RULE,
  DEFINITION_RULE,
  LEAD_MIN_WORDS,
  NO_LEAD_RULE,
  QUESTION_H2_RULE,
  RHYTHM_RULE,
  TEMPLATE_RULE,
  THRESHOLDS,
  compilePhrases,
  formatViolations,
  parseArticle,
  scoreArticle,
  splitSentences,
} from '../../scripts/content-factory/lib/robot-score'
import { ROBOT_PHRASES } from '../../scripts/content-factory/lib/robot-phrases'

/** Снимки статей сайта на 04.09.2026: две сентябрьские (роботные) и две майские с крючком (живые). Живой каталог меняется каждую ночь. */
const FIXTURES = path.join(__dirname, '../fixtures/robot-score')
const fixture = (slug: string) => fs.readFileSync(path.join(FIXTURES, `${slug}.mdx`), 'utf8')

/** Абзацы с предложениями разной длины: CV высокий, ни одного шаблона, без атрибуции. */
const LIVE_POOL = [
  'Junior-таргетолог в VK Ads получает 45 000 ₽ на старте. Через год — вдвое больше, если кейсы в портфолио показывают не клики, а заявки и их цену. Работодатель смотрит на три вещи: сколько бюджета вы вели, какой была стоимость заявки и что вы меняли, когда она росла.',
  'Портфолио важнее диплома. Три учебных проекта с описанием задачи, вашего действия и измеримого результата закрывают вопрос об опыте у большинства работодателей, которые нанимают на стартовые позиции в digital.',
  'Ошибка номер один — резюме на все вакансии сразу. Под каждую роль меняются заголовок, первые три навыка и порядок проектов, а остальное остаётся.',
  'Стажировка в агентстве даёт больше, чем курс, потому что задачи настоящие, а ошибки видны сразу. Платят мало. Зато через полгода в резюме появляется строка, которую читают.',
]
const LIVE_PARAGRAPH = LIVE_POOL[0]
const live = (n: number) => Array.from({ length: n }, (_, i) => LIVE_POOL[i % LIVE_POOL.length])

const LEAD =
  '39,1 % выпускников назвали отсутствие опыта главной трудностью при поиске первой работы. Это Росстат за 2025 год, и цифра не меняется третий год подряд, хотя число стартовых вакансий в digital за то же время выросло.'

function article(opts: { lead?: string; h2?: string[]; paragraphs?: string[] } = {}): string {
  const h2 = opts.h2 ?? [
    'Что показать в резюме вместо опыта',
    'Как описать учебный проект',
    'Сколько платят на старте',
    'Ошибки, из-за которых резюме не читают',
  ]
  const paragraphs = opts.paragraphs ?? live(12)
  const body = h2
    .map((t, i) => `## ${t}\n\n${paragraphs.slice(i * 3, i * 3 + 3).join('\n\n')}`)
    .join('\n\n')
  return `${opts.lead ?? LEAD}\n\n${body}`
}

const rules = (md: string) => scoreArticle(md).violations.map((v) => `${v.level}:${v.rule}`)
const withFirst = (text: string) =>
  article({ paragraphs: [`${text} ${LIVE_PARAGRAPH}`, ...live(11)] })

describe('parseArticle — что считается абзацем', () => {
  it('frontmatter, JSX-теги, таблицы, списки, код и заголовки — не абзацы', () => {
    const md = `---\ntitle: "x"\nfaqSchema: '[{"a": 1}]'\n---\n\n${LEAD}\n\n## Раздел\n\n<img src="/a.png" alt="x > y" style={{width: '100%'}} />\n\n| а | б |\n|---|---|\n| 1 | 2 |\n\n- пункт\n1. пункт\n\n\`\`\`js\nconst x = 1\n\`\`\`\n\nАбзац раздела с фактом: 12 % вакансий без опыта.\n`
    const p = parseArticle(md)
    expect(p.paragraphs).toEqual([LEAD, 'Абзац раздела с фактом: 12 % вакансий без опыта.'])
    expect(p.h2).toEqual(['Раздел'])
    expect(p.lead).toBe(LEAD)
  })

  it('H1 не делает лид разделом; «10. место занимает…» до H2 — крючок, «1. Пункт» — список', () => {
    const p = parseArticle(
      `# Заголовок\n\n10. место занимает Россия по числу вакансий.\n\n## Раздел\n\n1. Пункт списка.\n\nТело.`
    )
    expect(p.lead).toBe('10. место занимает Россия по числу вакансий.')
    expect(p.paragraphs).toEqual(['10. место занимает Россия по числу вакансий.', 'Тело.'])
  })
})

describe('splitSentences', () => {
  it('режет по .!? перед заглавной и после закрывающей кавычки; hh.ru, сокращения и дроби не режет', () => {
    expect(
      splitSentences(
        'По данным hh.ru зарплата 12.5 тыс. руб. В месяц это мало! Что делать? Учиться и т. д. Дальше — «практика.» Потом работа (2026 г. Компания).'
      )
    ).toEqual([
      'По данным hh.ru зарплата 12.5 тыс. руб. В месяц это мало!',
      'Что делать?',
      'Учиться и т. д. Дальше — «практика.»',
      'Потом работа (2026 г. Компания).',
    ])
  })
})

describe('scoreArticle — чистая статья', () => {
  it('крючок, разный ритм, H2 утверждениями, без шаблонов — ни одного нарушения', () => {
    const score = scoreArticle(article())
    expect(score.violations).toEqual([])
    expect(score.metrics.hasLead).toBe(true)
    expect(score.metrics.leadWords).toBeGreaterThanOrEqual(LEAD_MIN_WORDS)
    expect(score.metrics.templateCount).toBe(0)
    expect(score.metrics.aphorismShare).toBe(0)
  })
})

describe('scoreArticle — абзацы-афоризмы', () => {
  it('короткие абзацы-выводы выше порога — нарушение, с цитатами в detail', () => {
    const paragraphs = live(12).map((p, i) => (i % 3 === 0 ? 'Начните с задач.' : p))
    const score = scoreArticle(article({ paragraphs }))
    expect(score.violations.map((v) => `${v.level}:${v.rule}`)).toContain(
      `violation:${APHORISM_RULE}`
    )
    expect(score.metrics.aphorismShare).toBeGreaterThan(THRESHOLDS.aphorismShare)
    expect(score.violations.find((v) => v.rule === APHORISM_RULE)?.detail).toContain(
      '«Начните с задач.»'
    )
  })

  it('подводка к списку, строка-лейбл в болде и плейсхолдер — не афоризмы; «**Итог.** Начните с задач.» — афоризм', () => {
    const labels = [
      'В шапке резюме должно быть:',
      '**Опыт работы:**',
      '**[Должность]** | [Период]',
      '**Junior (0-1 год)**',
    ]
    const paragraphs = live(12).map((p, i) => (i % 3 === 0 ? labels[i / 3] : p))
    expect(rules(article({ paragraphs }))).not.toContain(`violation:${APHORISM_RULE}`)
    const bold = live(12).map((p, i) => (i % 3 === 0 ? '**Итог.** Начните с задач.' : p))
    expect(rules(article({ paragraphs: bold }))).toContain(`violation:${APHORISM_RULE}`)
  })
})

describe('scoreArticle — фразы-шаблоны', () => {
  it('две фразы из словаря — нарушение, одна — нет', () => {
    const two = article({
      paragraphs: [
        `Миф о том, что без стажа опыт указывать нельзя, неверен. ${LIVE_PARAGRAPH}`,
        `На самом деле работодателю нужен результат. ${LIVE_POOL[1]}`,
        ...live(10),
      ],
    })
    const score = scoreArticle(two)
    expect(rules(two)).toContain(`violation:${TEMPLATE_RULE}`)
    expect(score.metrics.templateHits).toEqual([
      { phrase: 'миф о том, что', count: 1 },
      { phrase: 'на самом деле', count: 1 },
    ])
    expect(rules(withFirst('На самом деле работодателю нужен результат.'))).not.toContain(
      `violation:${TEMPLATE_RULE}`
    )
  })

  it('регэксп-фраза «в материале от … года» считается; «**ключ** — это» — отдельное нарушение', () => {
    const md = article({
      paragraphs: [
        `**Резюме без опыта** — это структура документа для кандидата без стажа. ${LIVE_PARAGRAPH}`,
        `В материале от 1 ноября 2023 года hh.ru советует включать учебные проекты. ${LIVE_POOL[1]}`,
        ...live(10),
      ],
    })
    const score = scoreArticle(md)
    expect(score.metrics.templateHits.map((h) => h.phrase)).toEqual(['в материале от'])
    expect(rules(md)).toContain(`violation:${DEFINITION_RULE}`)
    expect(score.violations.find((v) => v.rule === DEFINITION_RULE)?.detail).toContain(
      'Резюме без опыта'
    )
  })

  it('формулы старого промпта ловятся в вариантах, живые обороты — нет', () => {
    const count = (text: string) => scoreArticle(withFirst(text)).metrics.templateCount
    expect(count('Мы разбираем сотни вакансий маркетолога каждую неделю.')).toBe(1)
    expect(count('Мы каждую неделю анализируем поток digital-вакансий.')).toBe(1)
    expect(count('В этом обзоре мы разберём, что писать в резюме.')).toBe(1)
    expect(count('Важно понимать, что стаж не главное.')).toBe(1)
    expect(count('Перейдем к структуре.')).toBe(1)
    expect(count('Джуниору важно понимать разницу в конкуренции.')).toBe(0)
    expect(count('Это главное доказательство владения стеком.')).toBe(0)
    expect(count('Знания в заключении экспертизы.')).toBe(0)
  })

  it('регистр не важен, граница слова кириллическая', () => {
    expect(scoreArticle(withFirst('НА САМОМ ДЕЛЕ так.')).metrics.templateCount).toBe(1)
    const [re] = compilePhrases([{ phrase: 'тест-фраза' }])
    expect('а Тест-фраза б'.match(re.re)).toHaveLength(1)
    expect('атест-фраза'.match(re.re)).toBeNull()
  })

  it('словарь общий с приёмкой по ТЗ: запреты и лимиты помечены полем gate', () => {
    expect(ROBOT_PHRASES.filter((p) => p.gate === 'ban').map((p) => p.phrase)).toEqual([
      'мы разбираем тысячи вакансий',
      'миф о том, что',
    ])
    expect(ROBOT_PHRASES.find((p) => p.phrase === 'на самом деле')?.gate).toBe(1)
  })
})

describe('scoreArticle — ритм, лид, H2, атрибуции', () => {
  it('предложения одной длины — предупреждение о ровном ритме (не нарушение)', () => {
    const flat = 'Работодатель смотрит на бюджет и стоимость заявки в кейсе.'
    const paragraphs = Array.from({ length: 12 }, () => `${flat} ${flat} ${flat}`)
    const score = scoreArticle(article({ paragraphs }))
    expect(score.metrics.sentenceCv).toBeLessThan(THRESHOLDS.sentenceCv)
    expect(rules(article({ paragraphs }))).toContain(`warning:${RHYTHM_RULE}`)
  })

  it('статья начинается с H2, лид короче минимума или длиннее лимита — нарушение «нет лида»', () => {
    const none = article().replace(`${LEAD}\n\n`, '')
    expect(rules(none)).toContain(`violation:${NO_LEAD_RULE}`)
    expect(scoreArticle(none).metrics.hasLead).toBe(false)
    const short = scoreArticle(article({ lead: 'Одно слово.' }))
    expect(short.metrics.hasLead).toBe(false)
    expect(short.violations.find((v) => v.rule === NO_LEAD_RULE)?.detail).toContain(
      `${LEAD_MIN_WORDS} слов`
    )
    const long = scoreArticle(
      article({ lead: Array.from({ length: 260 }, () => 'слово').join(' ') })
    )
    expect(long.metrics.hasLead).toBe(false)
  })

  it('все H2 вопросами — предупреждение; 5 из 7 по стандарту D4 — нет; меньше 4 H2 не оцениваем', () => {
    const q = article({
      h2: ['Что такое резюме?', 'Как заполнить?', 'Сколько платят?', 'Какие ошибки?'],
    })
    expect(rules(q)).toContain(`warning:${QUESTION_H2_RULE}`)
    expect(scoreArticle(q).metrics.questionH2Share).toBe(1)
    const d4 = article({
      h2: [
        'Что такое резюме?',
        'Как заполнить?',
        'Сколько платят?',
        'Какие ошибки?',
        'Куда откликаться?',
        'Вакансии на Диджитал Паб',
        'FAQ',
      ],
      paragraphs: live(21),
    })
    expect(rules(d4)).not.toContain(`warning:${QUESTION_H2_RULE}`)
    const few = article({ h2: ['Что такое резюме?', 'Как заполнить?'], paragraphs: live(6) })
    expect(rules(few)).not.toContain(`warning:${QUESTION_H2_RULE}`)
  })

  it('источник в каждом предложении — предупреждение; название площадки без глагола — не атрибуция', () => {
    const attributed =
      'По данным hh.ru за 2026 год спрос вырос. SuperJob в обзоре сообщил о снижении числа вакансий. Росстат опубликовал данные о выпускниках.'
    const paragraphs = Array.from({ length: 12 }, () => attributed)
    const score = scoreArticle(article({ paragraphs }))
    expect(score.metrics.attributions).toBe(36)
    expect(rules(article({ paragraphs }))).toContain(`warning:${ATTRIBUTION_RULE}`)
    const platforms = live(12).map((p) => `Вакансии ищут на hh.ru, SuperJob и Авито. ${p}`)
    expect(scoreArticle(article({ paragraphs: platforms })).metrics.attributions).toBe(0)
  })

  it('атрибуция — источник не дальше трёх слов от глагола отчёта или «данные источника»', () => {
    const count = (sentence: string) => scoreArticle(withFirst(sentence)).metrics.attributions
    expect(count('Росстат изучает трудоустройство выпускников отдельно от рынка.')).toBe(1)
    expect(count('Это данные hh.ru за 2026 год.')).toBe(1)
    expect(count('Показать hh.ru работодателю недостаточно.')).toBe(0)
    expect(count('На hh.ru показатели откликов ниже.')).toBe(0)
    expect(
      count('Работодатели на hh.ru рекомендуют прикладывать портфолио к каждому отклику.')
    ).toBe(0)
    expect(count('Согласно вакансии нужен опыт.')).toBe(0)
    expect(count('Участие в опросе занимает пять минут.')).toBe(0)
  })
})

describe('formatViolations', () => {
  it('нарушение с крестом, предупреждение с треугольником', () => {
    expect(
      formatViolations([
        { rule: 'A', detail: 'a', level: 'violation' },
        { rule: 'B', detail: 'b', level: 'warning' },
      ])
    ).toBe('✗ A: a\n△ B: b')
  })
})

describe('снимки статей 04.09.2026 (фикстуры)', () => {
  it('сентябрьские статьи падают на шаблонах и афоризмах, не только на лиде', () => {
    const hard = (slug: string) =>
      scoreArticle(fixture(slug))
        .violations.filter((v) => v.level === 'violation')
        .map((v) => v.rule)
    for (const slug of ['rezyume-bez-opyta-raboty-obrazec', 'rezyume-programmista-obrazec-2026']) {
      expect(hard(slug)).toContain(NO_LEAD_RULE)
      expect(hard(slug)).toContain(TEMPLATE_RULE)
      expect(hard(slug)).toContain(APHORISM_RULE)
    }
    expect(hard('rezyume-bez-opyta-raboty-obrazec')).toContain(DEFINITION_RULE)
  })

  it('майские статьи с крючком проходят без нарушений', () => {
    for (const slug of ['hr-menedzher-digital-agentstvo-najm', 'zarplaty-digital-marketing-2026']) {
      const score = scoreArticle(fixture(slug))
      expect(score.metrics.hasLead).toBe(true)
      expect(score.violations.filter((v) => v.level === 'violation')).toEqual([])
    }
  })
})
