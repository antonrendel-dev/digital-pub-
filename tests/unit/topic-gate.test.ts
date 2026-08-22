import {
  MAX_WORDSTAT_VOLUME,
  MIN_WORDSTAT_VOLUME,
  renumberByVolume,
  isReadyToWrite,
  splitByVolume,
  trafficLabelFromVolume,
  wordstatIsAlive,
} from '../../scripts/content-factory/lib/topic-gate'

const topic = (id: number, keyword: string, wordstatVolume: number | null) => ({
  id,
  keyword,
  wordstatVolume,
})

describe('splitByVolume', () => {
  it('делит темы по коридору: среднечастотные в план, остальные на переформулировку', () => {
    const { passed, offTarget } = splitByVolume([
      topic(1, 'зарплата маркетолога', 2064),
      topic(2, 'контроффер стоит ли принимать', 2),
      topic(3, 'вакансии smm джуниор', 881),
      topic(4, 'резюме таргетолога', 9),
    ])

    expect(passed.map((t) => t.keyword)).toEqual(['вакансии smm джуниор'])
    expect(offTarget.map((t) => t.keyword)).toEqual([
      'зарплата маркетолога',
      'резюме таргетолога',
      'контроффер стоит ли принимать',
    ])
  })

  it('обе границы коридора включительно', () => {
    const { passed, offTarget } = splitByVolume([
      topic(1, 'нижняя граница', MIN_WORDSTAT_VOLUME),
      topic(2, 'верхняя граница', MAX_WORDSTAT_VOLUME),
      topic(3, 'под коридором', MIN_WORDSTAT_VOLUME - 1),
      topic(4, 'над коридором', MAX_WORDSTAT_VOLUME + 1),
    ])

    expect(passed.map((t) => t.keyword).sort()).toEqual(['верхняя граница', 'нижняя граница'])
    expect(offTarget.map((t) => t.keyword).sort()).toEqual(['над коридором', 'под коридором'])
  })

  it('ВЧ-ключ уходит на переформулировку, а не в план', () => {
    const { passed, offTarget } = splitByVolume([topic(1, 'вакансии маркетолог', 100_000)])

    expect(passed).toHaveLength(0)
    expect(offTarget.map((t) => t.keyword)).toEqual(['вакансии маркетолог'])
  })

  it('при мёртвом Wordstat (все нули) не отправляет никого на переформулировку', () => {
    const { passed, offTarget } = splitByVolume([topic(1, 'ключ а', 0), topic(2, 'ключ б', 0)])

    expect(passed).toHaveLength(2)
    expect(offTarget).toHaveLength(0)
  })

  it('неизмеренные темы отделены от отбракованных — их нельзя править вслепую', () => {
    const { passed, offTarget, unmeasured } = splitByVolume([
      topic(1, 'в коридоре', 500),
      topic(2, 'квота исчерпана', null),
      { id: 3, keyword: 'поле отсутствует' },
    ])

    expect(passed.map((t) => t.keyword)).toEqual(['в коридоре'])
    expect(offTarget).toHaveLength(0)
    expect(unmeasured.map((t) => t.keyword)).toEqual(['квота исчерпана', 'поле отсутствует'])
  })

  it('ни одна тема не теряется при делении', () => {
    const input = [
      topic(1, 'а', 900),
      topic(2, 'б', 5),
      topic(3, 'в', 300),
      topic(4, 'г', 0),
      topic(5, 'д', 50_000),
      topic(6, 'е', null),
    ]
    const { passed, offTarget, unmeasured } = splitByVolume(input)

    expect([...passed, ...offTarget, ...unmeasured].map((t) => t.keyword).sort()).toEqual([
      'а',
      'б',
      'в',
      'г',
      'д',
      'е',
    ])
  })
})

describe('wordstatIsAlive', () => {
  it('false, когда все частотности нулевые', () => {
    expect(wordstatIsAlive([topic(1, 'а', 0), topic(2, 'б', 0)])).toBe(false)
  })

  it('false, когда Вордстат не ответил ни по одной теме', () => {
    expect(wordstatIsAlive([topic(1, 'а', null), topic(2, 'б', null)])).toBe(false)
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

describe('trafficLabelFromVolume', () => {
  it('ставит метку по замеру, а не по догадке аналитика', () => {
    expect(trafficLabelFromVolume(179)).toBe('низкий')
    expect(trafficLabelFromVolume(409)).toBe('средний')
    expect(trafficLabelFromVolume(1340)).toBe('высокий')
  })

  it('границы коридора относит к более осторожной метке', () => {
    expect(trafficLabelFromVolume(MIN_WORDSTAT_VOLUME - 1)).toBe('низкий')
    expect(trafficLabelFromVolume(MIN_WORDSTAT_VOLUME)).toBe('средний')
    expect(trafficLabelFromVolume(699)).toBe('средний')
    expect(trafficLabelFromVolume(700)).toBe('высокий')
  })

  it('без замера не выдумывает метку', () => {
    expect(trafficLabelFromVolume(null)).toBe('без замера')
    expect(trafficLabelFromVolume(undefined)).toBe('без замера')
  })

  // Регрессия на батч 14.08.2026: у темы «зарплата продуктового аналитика» в файле
  // стояло 6151/мес и метка «высокий», а замер дал 179 — расхождение в 34 раза.
  it('не наследует завышенную оценку: 179/мес это низкий трафик', () => {
    expect(trafficLabelFromVolume(179)).not.toBe('высокий')
  })
})

describe('isReadyToWrite', () => {
  const t = (over: Record<string, unknown>) => ({
    id: 1,
    keyword: 'резюме таргетолога',
    wordstatVolume: 480,
    approved: true,
    published: false,
    ...over,
  })

  it('берёт в работу одобренную неопубликованную тему с замером', () => {
    expect(isReadyToWrite(t({}))).toBe(true)
  })

  it('не берёт тему без замера частотности', () => {
    expect(isReadyToWrite(t({ wordstatVolume: null }))).toBe(false)
    expect(isReadyToWrite(t({ wordstatVolume: undefined }))).toBe(false)
  })

  it('нулевой замер это ответ Вордстата, а не его отсутствие — тема проходит', () => {
    expect(isReadyToWrite(t({ wordstatVolume: 0 }))).toBe(true)
  })

  it('не берёт неодобренную и уже опубликованную', () => {
    expect(isReadyToWrite(t({ approved: false }))).toBe(false)
    expect(isReadyToWrite(t({ published: true }))).toBe(false)
  })
})
