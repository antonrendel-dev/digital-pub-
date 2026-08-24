/**
 * Выбор задачи дня и состояние «одна задача за раз».
 *
 * Чистая логика без сети: сюда подаются задачи как есть из Todoist, обратно
 * приходит решение. Так поведение можно прогонять тестами, не дожидаясь утра
 * и не трогая живую доску.
 */

export const LABEL_AUTO = 'авто'
export const LABEL_ASK = 'вопрос'
export const LABEL_TONY = 'тони'

/** Крон предлагает только то, что может сдвинуть сам или после ответа Тони. */
export const OFFERABLE = [LABEL_AUTO, LABEL_ASK]

/** Раздел «Готово»: в этой доске закрытые задачи переносят сюда, а не отмечают. */
export const SECTION_DONE = '6grWxXVqjwQ7c8wh'

/** Сколько дней задача может висеть, прежде чем крон спросит, бросаем ли. */
export const STALE_AFTER_DAYS = 3

export interface Task {
  id: string
  content: string
  description?: string | null
  labels?: string[] | null
  section_id?: string | null
  checked?: boolean
  parent_id?: string | null
}

export interface Lock {
  taskId: string
  title: string
  startedAt: string
}

/**
 * Балл лежит первой строкой описания в машиночитаемом виде.
 * Без балла задача не участвует в выборе: её сначала должен разметить крон.
 */
export function parseScore(task: Task): number | null {
  const m = (task.description || '').match(/^\s*БАЛЛ:\s*(\d{1,3})\s*\/\s*100/)
  if (!m) return null
  const n = Number(m[1])
  return n >= 0 && n <= 100 ? n : null
}

export function labelOf(task: Task): string | null {
  const found = (task.labels || []).find((l) => [LABEL_AUTO, LABEL_ASK, LABEL_TONY].includes(l))
  return found ?? null
}

/**
 * Подзадачи из выбора исключены. У тикета контент-завода их полсотни — по одной
 * на тему, — и предлагать «написать статью про резюме дизайнера» отдельной
 * задачей дня бессмысленно: её делает завод по своему расписанию. Крон работает
 * с верхним уровнем, где стоит балл.
 */
export function isLive(task: Task): boolean {
  return !task.checked && task.section_id !== SECTION_DONE && !task.parent_id
}

/** Кандидаты на сегодня: живые, размеченные, с баллом, не целиком за Тони. */
export function candidates(tasks: Task[]): Array<{ task: Task; score: number; label: string }> {
  return tasks
    .filter(isLive)
    .map((task) => ({ task, score: parseScore(task) ?? -1, label: labelOf(task) ?? '' }))
    .filter((c) => c.score >= 0 && OFFERABLE.includes(c.label))
    .sort((a, b) => b.score - a.score)
}

/** Задачи без балла — их крон разметит сам, чтобы они попали в очередь. */
export function needScoring(tasks: Task[]): Task[] {
  return tasks.filter((t) => isLive(t) && parseScore(t) === null)
}

export function daysBetween(fromIso: string, nowIso: string): number {
  const ms = new Date(nowIso).getTime() - new Date(fromIso).getTime()
  return Math.floor(ms / 86_400_000)
}

export type Decision =
  | { kind: 'continue'; lock: Lock; days: number }
  | { kind: 'stale'; lock: Lock; days: number }
  | { kind: 'offer'; task: Task; score: number; label: string }
  | { kind: 'idle'; reason: string }

/**
 * Что делать этим утром.
 *
 * Главное правило от Тони: если вчерашняя задача не закрыта, новая сегодня не
 * активируется. Иначе через неделю в работе окажется семь начатых задач и ни
 * одной законченной.
 */
export function decide(tasks: Task[], lock: Lock | null, nowIso: string): Decision {
  if (lock) {
    const current = tasks.find((t) => t.id === lock.taskId)
    const stillOpen = current && isLive(current)
    if (stillOpen) {
      const days = daysBetween(lock.startedAt, nowIso)
      return days >= STALE_AFTER_DAYS
        ? { kind: 'stale', lock, days }
        : { kind: 'continue', lock, days }
    }
    // Задача закрыта или исчезла — замок снимается, идём за новой.
  }

  const list = candidates(tasks)
  if (!list.length)
    return { kind: 'idle', reason: 'нет задач с баллом и меткой «авто» или «вопрос»' }
  const top = list[0]
  return { kind: 'offer', task: top.task, score: top.score, label: top.label }
}
