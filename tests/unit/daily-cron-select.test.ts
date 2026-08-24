import {
  LABEL_ASK,
  LABEL_AUTO,
  LABEL_TONY,
  SECTION_DONE,
  STALE_AFTER_DAYS,
  candidates,
  decide,
  labelOf,
  needScoring,
  parseScore,
  type Task,
} from '../../scripts/daily-cron/select'

const task = (over: Partial<Task> & { id: string }): Task => ({
  content: 'задача',
  description:
    'БАЛЛ: 50/100  (спрос 20/30 · готовность 10/25 · разблокировка 10/25 · автономность 10/20)',
  labels: [LABEL_AUTO],
  section_id: '6grWxXRp2mx5hHH9',
  checked: false,
  ...over,
})

const NOW = '2026-08-24T06:00:00.000Z'

describe('чтение балла', () => {
  it('берёт число из первой строки', () => {
    expect(parseScore(task({ id: '1' }))).toBe(50)
  })

  it('без балла — null, задача в выбор не идёт', () => {
    expect(parseScore(task({ id: '1', description: 'просто текст' }))).toBeNull()
    expect(parseScore(task({ id: '1', description: null }))).toBeNull()
  })

  // Балл обязан стоять первой строкой: иначе «БАЛЛ» из середины чужого текста
  // подхватится как оценка задачи.
  it('балл не из первой строки не считается', () => {
    expect(parseScore(task({ id: '1', description: 'описание\nБАЛЛ: 99/100' }))).toBeNull()
  })

  it('значение вне шкалы отбрасывается', () => {
    expect(parseScore(task({ id: '1', description: 'БАЛЛ: 900/100' }))).toBeNull()
  })
})

describe('метки исполнителя', () => {
  it('находит метку среди прочих', () => {
    expect(labelOf(task({ id: '1', labels: ['feature', LABEL_ASK] }))).toBe(LABEL_ASK)
  })

  it('без метки — null', () => {
    expect(labelOf(task({ id: '1', labels: ['feature'] }))).toBeNull()
  })
})

describe('отбор кандидатов', () => {
  it('сортирует по баллу, тяжёлое сверху', () => {
    const list = candidates([
      task({ id: 'a', description: 'БАЛЛ: 40/100' }),
      task({ id: 'b', description: 'БАЛЛ: 81/100' }),
    ])
    expect(list.map((c) => c.task.id)).toEqual(['b', 'a'])
  })

  // Задача на 90 баллов, упирающаяся в регистрации Тони, не должна всплывать
  // каждое утро — предложить её крон всё равно не может.
  it('задачи «тони» не предлагаются, даже с высоким баллом', () => {
    const list = candidates([
      task({ id: 'a', description: 'БАЛЛ: 95/100', labels: [LABEL_TONY] }),
      task({ id: 'b', description: 'БАЛЛ: 30/100' }),
    ])
    expect(list.map((c) => c.task.id)).toEqual(['b'])
  })

  it('без метки не предлагается', () => {
    expect(candidates([task({ id: 'a', labels: [] })])).toHaveLength(0)
  })

  it('лежащие в «Готово» и отмеченные не участвуют', () => {
    expect(candidates([task({ id: 'a', section_id: SECTION_DONE })])).toHaveLength(0)
    expect(candidates([task({ id: 'b', checked: true })])).toHaveLength(0)
  })
})

describe('задачи без балла', () => {
  it('собираются отдельно для авторазметки', () => {
    const list = needScoring([task({ id: 'a', description: 'нет балла' }), task({ id: 'b' })])
    expect(list.map((t) => t.id)).toEqual(['a'])
  })

  it('закрытые разметке не подлежат', () => {
    expect(
      needScoring([task({ id: 'a', description: '', section_id: SECTION_DONE })])
    ).toHaveLength(0)
  })
})

describe('решение на утро', () => {
  const lock = { taskId: 'x', title: 'вчерашняя', startedAt: '2026-08-23T06:00:00.000Z' }

  // Главное правило: пока вчерашняя не закрыта, новая не активируется.
  // Иначе через неделю в работе семь начатых задач и ни одной законченной.
  it('незакрытая вчерашняя блокирует новую', () => {
    const d = decide([task({ id: 'x' }), task({ id: 'y', description: 'БАЛЛ: 99/100' })], lock, NOW)
    expect(d.kind).toBe('continue')
  })

  it('закрытая вчерашняя освобождает очередь', () => {
    const d = decide(
      [task({ id: 'x', section_id: SECTION_DONE }), task({ id: 'y', description: 'БАЛЛ: 99/100' })],
      lock,
      NOW
    )
    expect(d.kind).toBe('offer')
    if (d.kind === 'offer') expect(d.task.id).toBe('y')
  })

  it('исчезнувшая задача не держит замок вечно', () => {
    const d = decide([task({ id: 'y', description: 'БАЛЛ: 70/100' })], lock, NOW)
    expect(d.kind).toBe('offer')
  })

  it('зависшая дольше порога помечается отдельно', () => {
    const old = { ...lock, startedAt: '2026-08-01T06:00:00.000Z' }
    const d = decide([task({ id: 'x' })], old, NOW)
    expect(d.kind).toBe('stale')
    if (d.kind === 'stale') expect(d.days).toBeGreaterThanOrEqual(STALE_AFTER_DAYS)
  })

  it('без кандидатов молчит с объяснением', () => {
    const d = decide([task({ id: 'a', labels: [LABEL_TONY] })], null, NOW)
    expect(d.kind).toBe('idle')
  })

  it('на пустой доске не падает', () => {
    expect(decide([], null, NOW).kind).toBe('idle')
  })
})

// У тикета контент-завода полсотни подзадач — по одной на тему. Предлагать
// «написать статью про резюме дизайнера» отдельной задачей дня бессмысленно:
// её пишет завод по своему расписанию.
describe('подзадачи', () => {
  it('не попадают ни в кандидаты, ни в разметку', () => {
    const sub = task({ id: 'sub', parent_id: 'parent', description: 'нет балла' })
    expect(candidates([sub])).toHaveLength(0)
    expect(needScoring([sub])).toHaveLength(0)
  })

  it('верхний уровень при этом остаётся', () => {
    expect(candidates([task({ id: 'top', parent_id: null })])).toHaveLength(1)
  })
})
