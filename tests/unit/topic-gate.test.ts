import {
  MIN_WORDSTAT_VOLUME,
  renumberByVolume,
  splitByVolume,
  wordstatIsAlive,
} from '../../scripts/content-factory/lib/topic-gate'

const topic = (id: number, keyword: string, wordstatVolume: number) => ({
  id,
  keyword,
  wordstatVolume,
})

describe('splitByVolume', () => {
  it('делит темы по порогу: массовые в план, узкие на переформулировку', () => {
    const { passed, below } = splitByVolume([
      topic(1, 'зарплата маркетолога', 2064),
      topic(2, 'контроффер стоит ли принимать', 2),
      topic(3, 'вакансии smm', 1881),
      topic(4, 'резюме таргетолога', 9),
    ])

    expect(passed.map((t) => t.keyword)).toEqual(['зарплата маркетолога', 'вакансии smm'])
    expect(below.map((t) => t.keyword)).toEqual([
      'резюме таргетолога',
      'контроффер стоит ли принимать',
    ])
  })

  it('тема ровно на пороге проходит', () => {
    const { passed, below } = splitByVolume([
      topic(1, 'на пороге', MIN_WORDSTAT_VOLUME),
      topic(2, 'под порогом', MIN_WORDSTAT_VOLUME - 1),
    ])

    expect(passed.map((t) => t.keyword)).toEqual(['на пороге'])
    expect(below.map((t) => t.keyword)).toEqual(['под порогом'])
  })

  it('при мёртвом Wordstat (все нули) не отправляет никого на переформулировку', () => {
    const { passed, below } = splitByVolume([topic(1, 'ключ а', 0), topic(2, 'ключ б', 0)])

    expect(passed).toHaveLength(2)
    expect(below).toHaveLength(0)
  })

  it('тема без замера частотности уходит на переформулировку, если у батча данные есть', () => {
    const { passed, below } = splitByVolume([
      { id: 1, keyword: 'с данными', wordstatVolume: 1000 },
      { id: 2, keyword: 'без замера' },
    ])

    expect(passed.map((t) => t.keyword)).toEqual(['с данными'])
    expect(below.map((t) => t.keyword)).toEqual(['без замера'])
  })

  it('ни одна тема не теряется при делении', () => {
    const input = [topic(1, 'а', 900), topic(2, 'б', 5), topic(3, 'в', 300), topic(4, 'г', 0)]
    const { passed, below } = splitByVolume(input)

    expect([...passed, ...below].map((t) => t.keyword).sort()).toEqual(['а', 'б', 'в', 'г'])
  })
})

describe('wordstatIsAlive', () => {
  it('false, когда все частотности нулевые', () => {
    expect(wordstatIsAlive([topic(1, 'а', 0), topic(2, 'б', 0)])).toBe(false)
  })

  it('true, если хотя бы одна тема с ненулевым спросом', () => {
    expect(wordstatIsAlive([topic(1, 'а', 0), topic(2, 'б', 12)])).toBe(true)
  })
})

describe('renumberByVolume', () => {
  it('сортирует по убыванию спроса и нумерует подряд с единицы', () => {
    const result = renumberByVolume([
      topic(7, 'средний', 800),
      topic(3, 'слабый', 5),
      topic(9, 'топ', 5000),
    ])

    expect(result.map((t) => [t.id, t.wordstatVolume])).toEqual([
      [1, 5000],
      [2, 800],
      [3, 5],
    ])
  })

  it('id уникальны — по ним Тони одобряет темы командой /content_approve', () => {
    const result = renumberByVolume([
      topic(1, 'а', 900),
      topic(1, 'б', 400),
      topic(1, 'в', 50),
      topic(1, 'г', 50),
    ])

    expect(new Set(result.map((t) => t.id)).size).toBe(4)
  })
})
