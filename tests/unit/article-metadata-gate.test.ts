import {
  checkArticleMetadata,
  findIncomingLinks,
  normalizeFaqHeading,
} from '../../lib/article-metadata-gate'

// Живой FAQ: разметка собирается только при двух парах «вопрос — ответ».
const FAQ = `
## Частые вопросы

### Сколько зарабатывает специалист?
От 60 000 ₽ по данным hh.ru за 2026 год.

### С чего начать?
С разбора вакансий и портфолио.
`

const ok = {
  metaTitle: 'Рилсмейкер: кто это и сколько зарабатывает',
  metaDescription:
    'Чем рилсмейкер отличается от монтажёра и что входит в работу: вилки 40 000–150 000 ₽ по данным hh.ru и SuperJob и путь входа в профессию с нуля.',
  markdown: FAQ,
}

describe('гейт метаданных статьи', () => {
  it('чистые метаданные проходят без замечаний', () => {
    expect(checkArticleMetadata(ok)).toEqual([])
  })

  it('ловит длинный title с учётом бренда', () => {
    // 58 знаков сами по себе выглядят приемлемо, а с « | Диджитал Паб» — 73.
    const long = 'Рилсмейкер: кто это, сколько платят и как войти в профессию'
    const rules = checkArticleMetadata({ ...ok, metaTitle: long }).map((v) => v.rule)
    expect(rules).toContain('TITLE_LIMIT')
  })

  it('ловит description вне коридора 140–175', () => {
    const short = { ...ok, metaDescription: 'Коротко про профессию в 2026 году.' }
    expect(checkArticleMetadata(short).map((v) => v.rule)).toContain('DESC_RANGE')
  })

  it('ловит отсутствие раздела вопросов', () => {
    const noFaq = { ...ok, markdown: '## Кто это\n\nТекст без вопросов.' }
    expect(checkArticleMetadata(noFaq).map((v) => v.rule)).toContain('FAQ_MISSING')
  })

  it('ловит description без года и источника', () => {
    const bare = {
      ...ok,
      metaDescription:
        'Чем рилсмейкер отличается от монтажёра и что входит в его работу: разбор задач, инструментов и понятный путь входа в профессию для новичка.',
    }
    expect(checkArticleMetadata(bare).map((v) => v.rule)).toContain('DESC_NO_SOURCE')
  })

  it('ловит description, пересказывающий title первыми словами', () => {
    const echo = {
      ...ok,
      metaDescription:
        'Рилсмейкер: кто это и чем он занимается на практике — задачи, инструменты и вилки 40 000–150 000 ₽ по данным hh.ru за 2026 год для новичка.',
    }
    expect(checkArticleMetadata(echo).map((v) => v.rule)).toContain('DESC_ECHOES_TITLE')
  })

  it('видит входящие ссылки и не считает ссылку статьи на саму себя', () => {
    const articles = [
      { slug: 'a', body: 'см. [гайд](/articles/target)' },
      { slug: 'target', body: 'ссылка на себя /articles/target' },
      { slug: 'b', body: 'ничего' },
    ]
    expect(findIncomingLinks('target', articles)).toEqual(['a'])
  })
})

describe('заголовок раздела вопросов', () => {
  const qa = '\n### Сколько платят?\nОт 60 000 ₽ по hh.ru.\n\n### С чего начать?\nС портфолио.\n'

  it('переименовывает свой заголовок, под которым лежат вопросы', () => {
    const before = '## Кто это\n\nТекст.\n\n## Что ещё важно знать о профессии?' + qa
    expect(normalizeFaqHeading(before)).toContain('## Частые вопросы')
  })

  it('не трогает статью, где раздел уже назван как надо', () => {
    const ok = '## Кто это\n\nТекст.\n\n## Частые вопросы' + qa
    expect(normalizeFaqHeading(ok)).toBe(ok)
  })

  it('не трогает обычный H2 с вопросом в заголовке без пар вопрос-ответ', () => {
    const plain = '## Кто это\n\nТекст.\n\n## Сколько зарабатывает специалист?\n\nОт 60 000 ₽.'
    expect(normalizeFaqHeading(plain)).toBe(plain)
  })
})
