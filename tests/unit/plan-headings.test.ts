import { restorePlanHeadings } from '../../scripts/content-factory/lib/plan-headings'

/**
 * Заголовки H2 согласуются планировщиком: в них стоят ключ и биграммы из ТЗ.
 * Компилятор и SEO-ревью переписывали их своими словами — на прогонах 05.09.2026
 * дважды подряд, 6 заголовков из 7. Строчка в промпте не помогла, поэтому
 * заголовки возвращаются кодом.
 */
const plan = [
  'Кто такой CRM-маркетолог и какие навыки нужны',
  'Сколько зарабатывает CRM-маркетолог по грейдам',
  'Как стать CRM-маркетологом: три шага до первой работы',
  'Маркетолог: вакансии и прямой отклик на Диджитал Паб',
  'Частые вопросы про CRM-маркетинг',
]

const article = [
  '# CRM-маркетолог',
  '',
  'Крючок про рынок и вилки.',
  '',
  '## Кто такой CRM-маркетолог и какие навыки нужны?',
  '',
  'Тело первого блока.',
  '',
  '## Какая у CRM-маркетолога зарплата по грейдам?',
  '',
  'Тело второго блока.',
  '',
  '## Как стать CRM-маркетологом: три шага до первой работы?',
  '',
  'Тело третьего блока.',
  '',
  '## Где смотреть маркетологу вакансии и откликаться напрямую?',
  '',
  'Тело четвёртого блока.',
  '',
  '## Что ещё спрашивают про профессию?',
  '',
  '### Нужен ли диплом?',
  '',
  'Ответ.',
].join('\n')

describe('restorePlanHeadings', () => {
  it('возвращает заголовки плана, тела блоков не трогает', () => {
    const { markdown, restored, mismatch } = restorePlanHeadings(article, plan)

    expect(mismatch).toBe(false)
    // Пять H2 в статье, но последний — FAQ, его не трогаем: см. следующий кейс.
    expect(restored).toBe(4)
    for (const title of plan.slice(0, 4)) expect(markdown).toContain(`## ${title}`)
    // Биграмма «маркетолог вакансии» из ТЗ стояла в заголовке и терялась при переписи.
    expect(markdown).toContain('## Маркетолог: вакансии и прямой отклик на Диджитал Паб')
    for (const body of ['Крючок про рынок и вилки.', 'Тело первого блока.', 'Ответ.']) {
      expect(markdown).toContain(body)
    }
    expect(markdown.split('\n')).toHaveLength(article.split('\n').length)
  })

  it('последний H2 оставляет как есть — его нормализует normalizeFaqHeading', () => {
    // Парсер FAQ ищет в заголовке слово «вопрос»; normalizeFaqHeading чинит это
    // сам. Если подставить сюда заголовок плана, два правила начнут спорить,
    // и в худшем случае разметка FAQPage не соберётся вовсе.
    const { markdown } = restorePlanHeadings(article, plan)

    expect(markdown).toContain('## Что ещё спрашивают про профессию?')
    expect(markdown).not.toContain('## Частые вопросы про CRM-маркетинг')
  })

  it('при расхождении числа H2 текст не меняет и сообщает о расхождении', () => {
    // Модель выкинула или склеила раздел: сопоставлять заголовки по порядку
    // уже нельзя — подставим чужой заголовок не туда. Лучше оставить как есть.
    const short = article.replace(/## Как стать CRM-маркетологом[^\n]*\n\n[^\n]*\n\n/, '')
    const { markdown, restored, mismatch, articleTitles } = restorePlanHeadings(short, plan)

    expect(mismatch).toBe(true)
    expect(restored).toBe(0)
    expect(markdown).toBe(short)
    expect(articleTitles).toHaveLength(4)
  })

  it('не считает заголовком «## » внутри блока кода', () => {
    // В примерах кода бывает решётка в начале строки; сдвиг индексов подставил бы
    // заголовки не тем разделам.
    const fenced = article.replace(
      'Тело первого блока.',
      ['```', '## Кто такой комментарий в bash', '```'].join('\n')
    )
    const { restored, mismatch } = restorePlanHeadings(fenced, plan)

    expect(mismatch).toBe(false)
    expect(restored).toBe(4)
  })

  it('считает восстановленными только реально изменённые заголовки', () => {
    const untouched = article.replace(
      '## Кто такой CRM-маркетолог и какие навыки нужны?',
      '## Кто такой CRM-маркетолог и какие навыки нужны'
    )
    expect(restorePlanHeadings(untouched, plan).restored).toBe(3)
  })
})
