/**
 * Чистые преобразования между находкой и задачей Todoist.
 *
 * Вынесено из create-tasks.mjs в TypeScript по той же причине, что и
 * findings.ts: jest не читает голый .mjs, а разбор пользовательского ввода из
 * чата — ровно то место, где ошибка обходится дорого и тесты нужны.
 */

import type { Finding } from './findings'

/**
 * Сколько задач крон заводит за один прогон.
 *
 * Ограничение есть намеренно: за две недели может накопиться три десятка
 * поводов, и вывалить их разом в доску — то же самое, что не заводить вовсе,
 * разгребать всё равно никто не станет. Берём самые тяжёлые по баллу,
 * остальные перечисляем в отчёте — молча ничего не теряем.
 */
export const MAX_NEW_TASKS_PER_RUN = 12

/** Метка находки прячется в описании — по ней задача узнаётся при следующем прогоне. */
export const DEDUP_PREFIX = 'SEO-КРОН-МЕТКА:'

/** Описание задачи. Первая строка — балл в том же формате, что у остальной доски. */
export function describeFinding(f: Finding): string {
  return [
    `БАЛЛ: ${f.score.total}/100  (спрос ${f.score.s}/30 · готовность ${f.score.g}/25 · ` +
      `разблокировка ${f.score.r}/25 · автономность ${f.score.a}/20)`,
    `Почему: заведено SEO-кроном по сравнению снапшотов, дожим уже сделанного`,
    '─'.repeat(40),
    '',
    f.detail,
    '',
    `Ключ или страница: ${f.key}`,
    `Тип находки: ${f.type}`,
    '',
    `${DEDUP_PREFIX} ${f.dedupKey}`,
    '(метка нужна крону, чтобы не заводить эту же задачу повторно — не удалять)',
  ].join('\n')
}

/**
 * Метки из уже заведённых задач.
 *
 * Ключ может содержать пробелы («near-top10:вакансии smm»), поэтому читаем
 * строку до конца, а не до первого пробела: иначе половина ключей не
 * совпадёт и крон заведёт дубли.
 */
export function extractDedupKeys(tasks: Array<{ description?: string | null }>): Set<string> {
  const keys = new Set<string>()
  const re = new RegExp(`${DEDUP_PREFIX}\\s*(.+)`)
  for (const t of tasks) {
    const m = (t.description || '').match(re)
    if (m) keys.add(m[1].trim())
  }
  return keys
}

/**
 * Подходит ли уже существующая задача под находку.
 *
 * Два уровня. Точный — по метке, её крон ставит сам. Свободный — по тому, что
 * в заголовке задачи упоминается тот же ключ или адрес страницы: такие задачи
 * Тони и я заводим руками, метки у них нет, а дублировать их незачем.
 */
export function matchesFinding(
  finding: Finding,
  task: { content?: string | null; description?: string | null }
): 'mark' | 'text' | null {
  const desc = task.description || ''
  if (desc.includes(`${DEDUP_PREFIX} ${finding.dedupKey}`)) return 'mark'

  const needle = finding.key.toLowerCase().trim()
  if (needle.length < 4) return null
  const hay = `${task.content || ''} ${desc}`.toLowerCase()
  return hay.includes(needle) ? 'text' : null
}

/** Блок, который дописывается в уже существующую задачу вместо нового тикета. */
export function mergeNote(finding: Finding, date: string): string {
  return [
    '',
    '─'.repeat(40),
    `ОБНОВЛЕНИЕ SEO-КРОНА ${date}`,
    finding.title,
    finding.detail,
    `Балл находки: ${finding.score.total}/100`,
    `${DEDUP_PREFIX} ${finding.dedupKey}`,
  ].join('\n')
}
