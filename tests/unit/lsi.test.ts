import {
  MAX_ANCHOR_PHRASES,
  MAX_MAIN_KEY_USES,
  MIN_PHRASE_COUNT,
  buildWordstatBlock,
  modifierWords,
  selectLsiPhrases,
  stems,
} from '../../scripts/content-factory/lib/lsi'

const p = (phrase: string, count: number) => ({ phrase, count })

// Реальная выдача Вордстата: все фразы вложены в главный ключ.
// Именно она давала 22 вхождения «резюме таргетолога» в живой статье.
const targetolog = [
  p('резюме таргетолога', 480),
  p('резюме таргетолога образец', 320),
  p('резюме таргетолога без опыта', 210),
  p('резюме таргетолога шаблон', 180),
  p('образец резюме таргетолога', 150),
  p('резюме таргетолога пример', 90),
  p('резюме таргетолога 2026', 40),
  p('резюме таргетолога вконтакте', 12),
]

describe('stems', () => {
  it('сводит падежные формы к одной основе', () => {
    expect(stems('таргетолога')).toEqual(stems('таргетологу'))
  })

  it('выбрасывает служебные слова', () => {
    expect(stems('резюме без опыта')).toEqual(stems('резюме опыта'))
  })

  it('не различает ё и е', () => {
    expect(stems('удалённо')).toEqual(stems('удаленно'))
  })
})

describe('selectLsiPhrases', () => {
  it('фразу без новых слов кладёт в якоря, а не в уточняющие', () => {
    const { anchors, tail } = selectLsiPhrases(targetolog, 'резюме таргетолога', 480)

    expect(anchors.map((a) => a.phrase)).toEqual(['резюме таргетолога'])
    expect(tail.map((t) => t.phrase)).not.toContain('резюме таргетолога')
  })

  it('схлопывает перестановки одних и тех же слов', () => {
    const { tail } = selectLsiPhrases(targetolog, 'резюме таргетолога', 480)
    const phrases = tail.map((t) => t.phrase)

    // «резюме таргетолога образец» и «образец резюме таргетолога» — одна фраза,
    // остаётся более частотная.
    expect(phrases).toContain('резюме таргетолога образец')
    expect(phrases).not.toContain('образец резюме таргетолога')
  })

  it('режет фразы ниже порога 5% от частоты главного ключа', () => {
    const { tail, floor } = selectLsiPhrases(targetolog, 'резюме таргетолога', 480)

    expect(floor).toBe(MIN_PHRASE_COUNT) // 5% от 480 = 24, ниже минимума 30
    expect(tail.map((t) => t.phrase)).not.toContain('резюме таргетолога вконтакте')
    expect(tail.map((t) => t.phrase)).toContain('резюме таргетолога 2026')
  })

  it('на высокочастотном ключе порог поднимается выше минимума', () => {
    const { floor } = selectLsiPhrases(targetolog, 'резюме таргетолога', 20_000)
    expect(floor).toBe(1000)
  })

  it('не берёт больше трёх якорей', () => {
    const manyAnchors = [
      p('резюме таргетолога', 480),
      p('таргетолога резюме', 300),
      p('резюме таргетологу', 200),
      p('резюме таргетологов', 100),
      p('таргетологу резюме', 90),
    ]
    const { anchors } = selectLsiPhrases(manyAnchors, 'резюме таргетолога', 480)
    expect(anchors.length).toBeLessThanOrEqual(MAX_ANCHOR_PHRASES)
  })

  it('переживает пустую выдачу Вордстата', () => {
    const { anchors, tail } = selectLsiPhrases([], 'резюме таргетолога', null)
    expect(anchors).toEqual([])
    expect(tail).toEqual([])
  })

  it('работает без известной частотности главного ключа', () => {
    const { tail, floor } = selectLsiPhrases(targetolog, 'резюме таргетолога', null)
    expect(floor).toBe(MIN_PHRASE_COUNT)
    expect(tail.length).toBeGreaterThan(0)
  })
})

describe('modifierWords', () => {
  it('оставляет только то, чего нет в главном ключе', () => {
    expect(modifierWords('резюме таргетолога без опыта', 'резюме таргетолога')).toBe('без опыта')
  })

  it('не зависит от порядка слов', () => {
    expect(modifierWords('образец резюме таргетолога', 'резюме таргетолога')).toBe('образец')
  })
})

describe('buildWordstatBlock', () => {
  it('называет бюджет вхождений вместо «используй органично»', () => {
    const selection = selectLsiPhrases(targetolog, 'резюме таргетолога', 480)
    const block = buildWordstatBlock(selection, 'резюме таргетолога', 480)

    expect(block).toContain(`не более\n${MAX_MAIN_KEY_USES} раз`)
    expect(block).toContain('переспам')
    expect(block).not.toContain('используй эти ключи органично')
  })

  it('подаёт уточняющие смыслы без главного ключа в самой строке', () => {
    const selection = selectLsiPhrases(targetolog, 'резюме таргетолога', 480)
    const block = buildWordstatBlock(selection, 'резюме таргетолога', 480)

    const bullets = block.split('\n').filter((l) => l.startsWith('  - '))
    expect(bullets.length).toBeGreaterThan(0)
    for (const line of bullets) {
      const [modifier] = line.slice(4).split(' (из ')
      expect(modifier).not.toContain('резюме таргетолога')
    }
  })

  it('на пустой выдаче не даёт мусорный блок', () => {
    const empty = selectLsiPhrases([], 'резюме таргетолога', null)
    expect(buildWordstatBlock(empty, 'резюме таргетолога', null)).toBe('')
  })
})
