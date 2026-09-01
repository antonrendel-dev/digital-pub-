import { findByTopicId } from '../../scripts/content-factory/lib/todoist'

/**
 * Связка «тема → подзадача» идёт по строке «id темы: N» из описания.
 * По заголовку сопоставлять нельзя: проверено 01.09.2026 на живых данных —
 * нечёткий матч по названиям дал десять совпадений вместо восьми, две статьи
 * были приписаны чужим темам.
 */
const task = (id: string, content: string, description: string) => ({ id, content, description })

const TASKS = [
  task('a', '📘 Как стать тестировщиком', 'id темы: 210\nКлюч: как стать тестировщиком'),
  task('b', '📘 Менеджер маркетплейсов', 'id темы: 211\nКлюч: менеджер маркетплейсов с нуля'),
  task('c', '📘 Нейросети для дизайнеров', 'id темы: 215\nКлюч: нейросети для дизайнеров'),
  task('d', 'Обычная задача без темы', 'Просто описание'),
]

describe('поиск подзадачи темы', () => {
  it('находит по точному id', () => {
    expect(findByTopicId(TASKS, 211)?.id).toBe('b')
  })

  it('не путает 21 с 210 и 215', () => {
    expect(findByTopicId(TASKS, 21)).toBeUndefined()
  })

  it('не цепляет 15 внутри 215', () => {
    expect(findByTopicId(TASKS, 15)).toBeUndefined()
  })

  it('возвращает undefined, если темы нет', () => {
    expect(findByTopicId(TASKS, 999)).toBeUndefined()
  })

  it('переживает пустое описание', () => {
    expect(findByTopicId([{ id: 'x', content: 'y', description: null }], 210)).toBeUndefined()
  })
})
