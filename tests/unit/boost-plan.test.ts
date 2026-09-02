import {
  containsKey,
  field,
  parseRows,
  splitMdx,
  stripPreamble,
  withUpdatedDate,
  selectCandidates,
  slugFromArticleUrl,
  validateRewrite,
} from '../../scripts/content-factory/lib/boost-plan'

describe('отбор кандидатов на дожим', () => {
  it('берёт только статьи — у листингов тело лежит в коде', () => {
    expect(slugFromArticleUrl('https://d-pub.ru/articles/rezyume-targetologa')).toBe(
      'rezyume-targetologa'
    )
    expect(slugFromArticleUrl('https://d-pub.ru/vacancies/smm')).toBeNull()
    expect(slugFromArticleUrl('https://d-pub.ru/tools/tilda')).toBeNull()
  })

  it('отбрасывает всё, что вне коридора 11–30', () => {
    const { take } = selectCandidates([
      { key: 'а', position: 7, url: 'https://d-pub.ru/articles/a' },
      { key: 'б', position: 11, url: 'https://d-pub.ru/articles/b' },
      { key: 'в', position: 30, url: 'https://d-pub.ru/articles/c' },
      { key: 'г', position: 31, url: 'https://d-pub.ru/articles/d' },
    ])
    expect(take.map((c) => c.slug)).toEqual(['b', 'c'])
  })

  it('сортирует по близости к топ-10', () => {
    const { take } = selectCandidates([
      { key: 'а', position: 28, url: 'https://d-pub.ru/articles/a' },
      { key: 'б', position: 12, url: 'https://d-pub.ru/articles/b' },
    ])
    expect(take[0].position).toBe(12)
  })

  it('не берёт одну статью дважды за прогон', () => {
    const { take, skip } = selectCandidates([
      { key: 'резюме таргетолога', position: 23, url: 'https://d-pub.ru/articles/rt' },
      { key: 'резюме таргетолога образец', position: 27, url: 'https://d-pub.ru/articles/rt' },
    ])
    expect(take).toHaveLength(1)
    expect(skip[0].why).toContain('уже взята')
  })

  it('объясняет, почему ключ пропущен, а не молчит', () => {
    const { skip } = selectCandidates([
      { key: 'без цели', position: 15, url: '' },
      { key: 'листинг', position: 15, url: 'https://d-pub.ru/vacancies/smm' },
    ])
    expect(skip.map((s) => s.why)).toEqual([
      'нет целевого URL в Топвизоре',
      'посадочная не статья — тело лежит в коде, не в MDX',
    ])
  })

  it('разбирает TSV Топвизора и пропускает мусорные строки', () => {
    const rows = parseRows('ключ\t13\thttps://d-pub.ru/articles/a\nшапка\tпозиция\turl\n\n')
    expect(rows).toEqual([{ key: 'ключ', position: 13, url: 'https://d-pub.ru/articles/a' }])
  })
})

describe('приёмка переписанного тела', () => {
  const before = '## Кто это?\n\n' + 'слово '.repeat(200) + '\n\n### Вопрос?\nОтвет.'

  it('чистая переписка замечаний не даёт', () => {
    const after =
      '## Резюме таргетолога: что писать\n\n' + 'слово '.repeat(260) + '\n\n### Вопрос?\nОтвет.'
    expect(validateRewrite(before, after, 'резюме таргетолога')).toEqual([])
  })

  it('ловит сокращение статьи', () => {
    const after = '## Резюме таргетолога\n\n' + 'слово '.repeat(100)
    expect(validateRewrite(before, after, 'резюме таргетолога').map((v) => v.rule)).toContain(
      'SHRANK'
    )
  })

  it('ловит потерю заголовков', () => {
    const after = 'Резюме таргетолога — ' + 'слово '.repeat(260)
    expect(validateRewrite(before, after, 'резюме таргетолога').map((v) => v.rule)).toContain(
      'LOST_HEADINGS'
    )
  })

  it('ловит ключ, не поставленный ни в заголовок, ни в лид', () => {
    const after = '## Как оформить документ\n\n' + 'слово '.repeat(260) + '\n\n### Вопрос?\nОтвет.'
    expect(validateRewrite(before, after, 'резюме таргетолога').map((v) => v.rule)).toEqual([
      'KEY_NOT_PLACED',
    ])
  })

  it('засчитывает ключ в первых 60 словах, а не только в заголовке', () => {
    const after =
      '## Как оформить\n\nРезюме таргетолога начинается с ' +
      'слово '.repeat(260) +
      '\n\n### Вопрос?\nОтвет.'
    expect(validateRewrite(before, after, 'резюме таргетолога')).toEqual([])
  })
})

describe('поиск ключа в тексте с поправкой на язык', () => {
  it('видит ключ, написанный через дефис и в падеже', () => {
    expect(containsKey('## Резюме контент-менеджера: шаблон', 'резюме контент менеджера')).toBe(
      true
    )
    expect(containsKey('Зарплата SEO-специалиста в 2026', 'зарплата seo специалиста')).toBe(true)
  })

  it('не путает ё и е', () => {
    expect(containsKey('Всё про удалённую работу', 'удаленная работа')).toBe(true)
  })

  it('не засчитывает частичное совпадение', () => {
    expect(containsKey('Резюме дизайнера: образец', 'резюме контент менеджера')).toBe(false)
  })
})

describe('разбор ответа модели', () => {
  it('не режет по «## » внутри H3 — преамбула не должна уехать в статью', () => {
    const answer = 'Вот правки:\n\n### Что изменено\n- добавил таблицу\n\n## Кто это\n\nТекст.'
    const body = stripPreamble(answer)
    expect(body.startsWith('## Кто это')).toBe(true)
    expect(body).not.toContain('Что изменено')
  })

  it('оставляет тело как есть, если оно сразу начинается с H2', () => {
    const answer = '## Кто это\n\nТекст.'
    expect(stripPreamble(answer)).toBe(answer)
  })

  it('не теряет текст, если заголовков нет вовсе', () => {
    expect(stripPreamble('Просто текст без заголовков')).toBe('Просто текст без заголовков')
  })

  it('делит MDX на frontmatter и тело', () => {
    const raw = '---\ntitle: "Т"\ndateModified: "2026-07-28"\n---\n## H2\n\nТекст.'
    const { frontmatter, body } = splitMdx(raw)
    expect(field(frontmatter, 'title')).toBe('Т')
    expect(body).toBe('## H2\n\nТекст.')
    expect(() => splitMdx('## без frontmatter')).toThrow()
  })
})

describe('обновление даты изменения', () => {
  it('правит и поле, и копию внутри schemaJsonLd', () => {
    const fm =
      'title: "Т"\ndateModified: "2026-07-28"\nschemaJsonLd: \'{"dateModified":"2026-07-28","x":1}\''
    const next = withUpdatedDate(fm, '2026-09-02')
    expect(next).toContain('dateModified: "2026-09-02"')
    expect(next).toContain('"dateModified":"2026-09-02"')
    expect(next).not.toContain('2026-07-28')
  })

  it('добавляет поле, если его не было', () => {
    expect(withUpdatedDate('title: "Т"', '2026-09-02')).toContain('dateModified: "2026-09-02"')
  })
})

describe('сохранность картинок и внутренних ссылок', () => {
  const base =
    '## H2\n<img src="a" />\n<img src="b" />\n[гайд](/articles/x)\n' + 'слово '.repeat(200)

  it('ловит потерю картинки', () => {
    const after = '## H2\n<img src="a" />\n[гайд](/articles/x)\n' + 'слово '.repeat(200)
    expect(validateRewrite(base, after, 'h2').map((v) => v.rule)).toContain('LOST_IMAGES')
  })

  it('ловит потерю внутренней ссылки', () => {
    const after = '## H2\n<img src="a" />\n<img src="b" />\n' + 'слово '.repeat(200)
    expect(validateRewrite(base, after, 'h2').map((v) => v.rule)).toContain('LOST_LINKS')
  })

  it('не придирается, когда всё на месте', () => {
    expect(validateRewrite(base, base + 'ещё', 'h2')).toEqual([])
  })
})

describe('основа слова не пропускает чужой ключ', () => {
  it('не считает «резюме контекстолога и менеджмента» вхождением ключа', () => {
    expect(containsKey('резюме контекстолога и менеджмента', 'резюме контент менеджера')).toBe(
      false
    )
  })
})
