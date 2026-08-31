import { MIN_FAQ_ITEMS, faqSchemaLine, parseFaq } from '@/lib/faq-schema'

const ARTICLE = `## Что делает специалист

Текст основной части.

## Частые вопросы

### Нужен ли диплом?

Нет. Работодатели смотрят **портфолио**, а не диплом.

### Сколько учиться?

Базовые курсы занимают 2–6 месяцев. Ещё полгода практики до первого проекта.
`

describe('сборка FAQ-разметки из текста статьи', () => {
  it('берёт вопросы и ответы из раздела, а не из всей статьи', () => {
    const items = parseFaq(ARTICLE)
    expect(items).toHaveLength(2)
    expect(items[0].question).toBe('Нужен ли диплом?')
    // Разметка жирного в сниппете не нужна.
    expect(items[0].answer).toBe('Нет. Работодатели смотрят портфолио, а не диплом.')
  })

  it('заголовок раздела ловится в любом написании', () => {
    for (const heading of ['## Частые вопросы', '## FAQ', '## Часто задаваемые вопросы']) {
      const text = ARTICLE.replace('## Частые вопросы', heading)
      expect(parseFaq(text)).toHaveLength(2)
    }
  })

  it('ссылки разворачиваются в текст', () => {
    const text = ARTICLE.replace(
      'Нет. Работодатели смотрят',
      'Смотри [вакансии маркетолога](/vacancies/marketing). Работодатели смотрят'
    )
    expect(parseFaq(text)[0].answer).toContain('Смотри вакансии маркетолога.')
    expect(parseFaq(text)[0].answer).not.toContain('/vacancies/')
  })

  it('статья без раздела вопросов даёт пустой список', () => {
    expect(parseFaq('## Просто текст\n\nБез вопросов.')).toEqual([])
  })

  it('одного вопроса мало — поисковик такую разметку не покажет', () => {
    const single = ARTICLE.split('### Сколько учиться?')[0]
    expect(parseFaq(single).length).toBeLessThan(MIN_FAQ_ITEMS)
    expect(faqSchemaLine(single)).toBe('')
  })

  it('строка фронтматтера — валидный JSON в одинарных кавычках', () => {
    const line = faqSchemaLine(ARTICLE)
    expect(line.startsWith("\nfaqSchema: '")).toBe(true)
    const json = line.slice("\nfaqSchema: '".length, -1)
    expect(JSON.parse(json)).toHaveLength(2)
  })

  it('апостроф в ответе не рвёт строку фронтматтера', () => {
    const text = ARTICLE.replace('Нет. Работодатели', "Нет, it's fine. Работодатели")
    expect(faqSchemaLine(text)).toContain("it''s")
  })
})
