import { extractQuestions, render } from '../../scripts/daily-cron/message'
import { LABEL_ASK, LABEL_AUTO, type Task } from '../../scripts/daily-cron/select'

const task = (over: Partial<Task> = {}): Task => ({
  id: '1',
  content: 'Перевести 8 разделов на профессии',
  description: 'БАЛЛ: 77/100',
  labels: [LABEL_AUTO],
  ...over,
})

describe('вопросы из карточки', () => {
  it('достаются из блока «ВОПРОСЫ»', () => {
    const t = task({
      description: [
        'БАЛЛ: 45/100',
        '',
        'ВОПРОСЫ, НА КОТОРЫЕ НУЖЕН ОТВЕТ ПЕРЕД СТАРТОМ:',
        '1. По каким критериям строится рейтинг?',
        '2. Обновляется автоматически или руками?',
        '',
        'дальше не вопросы',
      ].join('\n'),
    })
    expect(extractQuestions(t)).toEqual([
      'По каким критериям строится рейтинг?',
      'Обновляется автоматически или руками?',
    ])
  })

  it('нет блока — пустой список, а не падение', () => {
    expect(extractQuestions(task())).toEqual([])
  })

  // Крон не придумывает вопросы сам: он достаёт то, что мы записали в карточку.
  // Длинный список в утреннее сообщение не влезет.
  it('больше шести вопросов не берёт', () => {
    const many = [
      'ВОПРОСЫ:',
      ...Array.from({ length: 10 }, (_, i) => `${i + 1}. вопрос ${i}`),
    ].join('\n')
    expect(extractQuestions(task({ description: many }))).toHaveLength(6)
  })
})

describe('утреннее сообщение', () => {
  it('для «авто» — просто предложение начать', () => {
    const text = render({ kind: 'offer', task: task(), score: 77, label: LABEL_AUTO })
    expect(text).toContain('Задача на сегодня')
    expect(text).toContain('77/100')
    expect(text).toContain('Делаю сам')
  })

  it('для «вопрос» — сразу со списком того, что нужно от Тони', () => {
    const t = task({
      labels: [LABEL_ASK],
      description: 'БАЛЛ: 45/100\n\nВОПРОСЫ:\n1. Пришли список каналов\n2. Показываем подписчиков?',
    })
    const text = render({ kind: 'offer', task: t, score: 45, label: LABEL_ASK })
    expect(text).toContain('без тебя не начать')
    expect(text).toContain('Пришли список каналов')
  })

  it('продолжение вчерашней объясняет, почему новой нет', () => {
    const text = render({
      kind: 'continue',
      lock: { taskId: '1', title: 'вчерашняя', startedAt: '2026-08-23T06:00:00.000Z' },
      days: 1,
    })
    expect(text).toContain('Продолжаю вчерашнее')
    expect(text).toContain('В работе 1 день')
    expect(text).toContain('Новую задачу не беру')
  })

  it('зависшая спрашивает, бросаем или нет', () => {
    const text = render({
      kind: 'stale',
      lock: { taskId: '1', title: 'зависшая', startedAt: '2026-08-01T06:00:00.000Z' },
      days: 5,
    })
    expect(text).toContain('зависла')
    expect(text).toContain('5 дней')
  })

  it('склонение дней не машинное', () => {
    const days = (n: number) =>
      render({
        kind: 'stale',
        lock: { taskId: '1', title: 'x', startedAt: '2026-08-01T06:00:00.000Z' },
        days: n,
      })
    expect(days(1)).toContain('1 день')
    expect(days(3)).toContain('3 дня')
    expect(days(11)).toContain('11 дней')
    expect(days(21)).toContain('21 день')
  })

  // Заголовки задач приходят с доски и содержат «/», «>» и прочее.
  it('разметка в заголовке экранируется', () => {
    const text = render({
      kind: 'offer',
      task: task({ content: 'Переезд /tools → /professii <b>' }),
      score: 39,
      label: LABEL_AUTO,
    })
    // Обёртка заголовка в <b> наша, а разметка из самого заголовка — чужая
    // и должна приехать экранированной, иначе Telegram отвергнет сообщение.
    expect(text).toContain('&lt;b&gt;')
    expect(text).toContain('<b>Переезд /tools → /professii &lt;b&gt;</b>')
  })
})
