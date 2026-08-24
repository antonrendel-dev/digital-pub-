/**
 * Чистые преобразования между находкой и задачей Todoist.
 *
 * Вынесено из create-tasks.mjs в TypeScript по той же причине, что и
 * findings.ts: jest не читает голый .mjs, а разбор пользовательского ввода из
 * чата — ровно то место, где ошибка обходится дорого и тесты нужны.
 */

import type { Finding } from './findings'

/** Метка находки прячется в описании — по ней задача узнаётся при следующем прогоне. */
export const DEDUP_PREFIX = 'SEO-КРОН-МЕТКА:'

/**
 * «1 3» → [0, 2]; «all», «все» и пустой ввод → все индексы.
 * Номера приходят из чата, поэтому мусор и промахи пальцем молча отбрасываем,
 * а не отвечаем ошибкой на каждую опечатку.
 */
export function parseSelection(args: string[], total: number): number[] {
  const joined = args.join(' ').trim().toLowerCase()
  if (!joined || joined === 'all' || joined === 'все') {
    return Array.from({ length: total }, (_, i) => i)
  }
  const picked = new Set<number>()
  for (const part of joined.split(/[\s,]+/)) {
    const n = Number(part)
    if (Number.isInteger(n) && n >= 1 && n <= total) picked.add(n - 1)
  }
  return [...picked].sort((a, b) => a - b)
}

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
