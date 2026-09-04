import {
  boldKeyOccurrences,
  countPhraseForms,
  hasPhraseForm,
  isKeyFragment,
  keyDefinitionOpener,
  opensWithKeyDefinition,
} from '../../scripts/content-factory/lib/keyword-match'

const KEY = 'резюме без опыта работы образец'

describe('countPhraseForms — вхождения в любой форме и порядке', () => {
  it('падеж, порядок слов и дефис не мешают', () => {
    expect(countPhraseForms('Образец резюме без опыта работы нужен студенту.', KEY)).toBe(1)
    expect(countPhraseForms('Резюме контент-менеджера: шаблон', 'резюме контент менеджера')).toBe(1)
    expect(countPhraseForms('Зарплата SEO-специалиста в 2026', 'seo специалист зарплата')).toBe(1)
  })

  it('предлоги и одно лишнее слово внутри фразы не мешают', () => {
    expect(countPhraseForms('резюме для junior таргетолога', 'резюме таргетолога')).toBe(1)
    expect(countPhraseForms('резюме студента без опыта работы: образец', KEY)).toBe(1)
    expect(countPhraseForms('образец резюме для студента без опыта работы', KEY)).toBe(1)
  })

  it('markdown-ссылка внутри фразы не раздвигает окно', () => {
    expect(
      countPhraseForms('[резюме](https://d-pub.ru/articles/x) таргетолога', 'резюме таргетолога')
    ).toBe(1)
  })

  it('окна не пересекаются', () => {
    expect(
      countPhraseForms('резюме таргетолога и ещё резюме таргетологов', 'резюме таргетолога')
    ).toBe(2)
  })

  it('чужая фраза не засчитывается', () => {
    expect(countPhraseForms('Резюме дизайнера и портфолио', 'резюме таргетолога')).toBe(0)
    expect(hasPhraseForm('резюме контекстолога и менеджмента', 'резюме контент менеджера')).toBe(
      false
    )
  })

  it('слова фразы должны стоять рядом, а не по всему тексту', () => {
    const far =
      'Резюме — главный документ. Дальше двадцать слов о другом: ' +
      'слово '.repeat(20) +
      'таргетолога.'
    expect(countPhraseForms(far, 'резюме таргетолога')).toBe(0)
  })

  it('формы одного слова на границе длины основы — одно слово', () => {
    expect(countPhraseForms('Юрист: резюме без опыта', 'резюме юриста')).toBe(1)
    expect(countPhraseForms('резюме для юристов', 'резюме юриста')).toBe(1)
    expect(countPhraseForms('с опытом работы', 'опыт работы')).toBe(1)
    // Беглая гласная — известное ограничение: «образец» → «образе», «образцов» → «образц».
    expect(countPhraseForms('образцов резюме', 'резюме образец')).toBe(0)
  })

  it('ё и регистр не различаются', () => {
    expect(countPhraseForms('Удалённая работа в digital', 'удаленная работа')).toBe(1)
  })
})

describe('isKeyFragment', () => {
  it('фрагмент из ключа — да, крючок с ключом внутри — нет', () => {
    expect(isKeyFragment('Образец резюме без опыта', KEY)).toBe(true)
    expect(isKeyFragment('Каждое второе резюме таргетолога', 'резюме таргетолога')).toBe(false)
    expect(isKeyFragment('таргетинг в резюме', 'резюме таргетолога')).toBe(false)
  })
})

describe('boldKeyOccurrences', () => {
  it('ловит ключ жирным в любой форме', () => {
    expect(boldKeyOccurrences('**Резюме без опыта работы образец** — это', KEY)).toEqual([
      '**Резюме без опыта работы образец**',
    ])
    expect(boldKeyOccurrences('**Образец резюме без опыта** помогает', KEY)).toHaveLength(1)
  })

  it('жирный не про ключ — не трогает', () => {
    expect(boldKeyOccurrences('Главное — **портфолио**, а не стаж.', KEY)).toEqual([])
    expect(boldKeyOccurrences('**таргетинг в резюме** важен', 'резюме таргетолога')).toEqual([])
    expect(boldKeyOccurrences('**Резюме** читают быстро', 'резюме таргетолога')).toEqual([])
  })

  it('подчёркивания __ключ__ — тоже выделение', () => {
    expect(boldKeyOccurrences('__резюме таргетолога__ — ...', 'резюме таргетолога')).toHaveLength(1)
  })
})

describe('opensWithKeyDefinition', () => {
  it('«**ключ** — это …» первым абзацем — открытие определением', () => {
    expect(
      opensWithKeyDefinition(
        `# Резюме без опыта\n\n**Резюме без опыта работы образец** — это структура документа.`,
        KEY
      )
    ).toBe(true)
    expect(opensWithKeyDefinition(`Образец резюме без опыта — это документ, где…`, KEY)).toBe(true)
  })

  it('крючок с ключом внутри перед «— это» — не определение', () => {
    expect(
      opensWithKeyDefinition(
        'Каждое второе резюме таргетолога — это список обязанностей без цифр.',
        'резюме таргетолога'
      )
    ).toBe(false)
    expect(
      opensWithKeyDefinition(
        'Восемь секунд. Резюме таргетолога — это документ.',
        'резюме таргетолога'
      )
    ).toBe(false)
  })

  it('«это» в конце строки при жёстком переносе — ловится, фрагмент возвращается', () => {
    expect(keyDefinitionOpener('Резюме таргетолога — это\nдокумент.', 'резюме таргетолога')).toBe(
      'Резюме таргетолога — это'
    )
  })

  it('без лида (тело сразу с H2) определение под первым H2 законно', () => {
    expect(
      opensWithKeyDefinition(
        '## Что такое резюме таргетолога\n\nРезюме таргетолога — это документ.',
        'резюме таргетолога'
      )
    ).toBe(false)
  })

  it('крючок первым абзацем — не определение; определение внутри — допустимо', () => {
    expect(
      opensWithKeyDefinition(
        `39% выпускников назвали отсутствие опыта главной трудностью.\n\n## Что такое\n\nРезюме без опыта работы образец — это структура.`,
        KEY
      )
    ).toBe(false)
    expect(opensWithKeyDefinition(`Портфолио — это доказательство, а не стаж.`, KEY)).toBe(false)
  })
})
