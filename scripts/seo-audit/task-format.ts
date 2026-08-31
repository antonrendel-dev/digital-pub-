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

/**
 * Сколько находок одного типа собираются в одну задачу.
 *
 * Двенадцать карточек «ключ X на 14 — кандидат на дожим» — это не двенадцать
 * задач, а одна работа: садишься и проходишь список. Порознь они засоряют
 * доску и каждая по отдельности выглядит мелкой. Две находки объединять смысла
 * нет — заголовок станет обобщённым, а конкретики в нём убавится.
 */
export const MIN_GROUP_SIZE = 3

/** Как называется пачка находок каждого типа. */
const GROUP_TITLES: Record<Finding['type'], (n: number) => string> = {
  'left-top10': (n) => `${n} ключей вышли из топ-10 — разобрать пачкой`,
  'position-drop': (n) => `${n} ключей просели в топ-100 — разобрать пачкой`,
  'near-top10': (n) => `${n} ключей в шаге от топ-10 — пачка на дожим`,
  'pageviews-drop': (n) => `Просмотры упали у ${n} страниц — разобрать пачкой`,
  'zero-clicks': (n) => `${n} запросов с показами и нулём кликов — пачка на сниппеты`,
  'wrong-page': (n) => `${n} ключей отвечают не той страницей — разобрать пачкой`,
  // Статьи в пачки собираются по типу правки: переписать текст и подобрать
  // ключ — разные работы, и садиться за них удобнее по отдельности.
  'article-not-read': (n) => `${n} статей в топе, но их не читают — переписать текст`,
  'article-not-ranked': (n) => `${n} статей читают, но их нет в топе — подобрать ключи`,
}

/** Заголовок пачки по типу и числу находок в ней. */
export function groupTitle(type: Finding['type'], count: number): string {
  return GROUP_TITLES[type](count)
}

export interface FindingGroup {
  /** Тип, общий для всех находок пачки. */
  type: Finding['type']
  title: string
  findings: Finding[]
  /** Балл пачки — по самой тяжёлой находке: работа не легче своего худшего случая. */
  score: Finding['score']
}

/**
 * Раскладывает находки на пачки и одиночек.
 *
 * Порядок внутри сохраняется — находки приходят уже отсортированными по баллу,
 * так что в начале списка окажется самое дорогое.
 */
export function groupFindings(findings: Finding[]): FindingGroup[] {
  const byType = new Map<Finding['type'], Finding[]>()
  for (const f of findings) {
    const list = byType.get(f.type)
    if (list) list.push(f)
    else byType.set(f.type, [f])
  }

  const groups: FindingGroup[] = []
  for (const [type, list] of byType) {
    if (list.length >= MIN_GROUP_SIZE) {
      groups.push({
        type,
        title: groupTitle(type, list.length),
        findings: list,
        score: list.reduce((a, b) => (b.score.total > a.score.total ? b : a)).score,
      })
    } else {
      for (const f of list) groups.push({ type, title: f.title, findings: [f], score: f.score })
    }
  }
  return groups.sort((a, b) => b.score.total - a.score.total)
}

/** Метка пачки: по ней находка того же типа дописывается в существующую задачу. */
export const GROUP_PREFIX = 'SEO-КРОН-ПАЧКА:'

/** Описание пачки: список находок и метка каждой, чтобы дедуп работал по отдельности. */
export function describeGroup(g: FindingGroup): string {
  if (g.findings.length === 1) return describeFinding(g.findings[0])
  const s = g.score
  return [
    `БАЛЛ: ${s.total}/100  (спрос ${s.s}/30 · готовность ${s.g}/25 · ` +
      `разблокировка ${s.r}/25 · автономность ${s.a}/20)`,
    `Почему: заведено SEO-кроном, пачка однотипных находок — ${g.findings.length} шт., ` +
      `балл по самой тяжёлой`,
    '─'.repeat(40),
    '',
    g.findings[0].detail,
    '',
    `СПИСОК (${g.findings.length}):`,
    ...g.findings.map((f, i) => `${i + 1}. ${f.title}`),
    '',
    `${GROUP_PREFIX} ${g.type}`,
    ...g.findings.map((f) => `${DEDUP_PREFIX} ${f.dedupKey}`),
    '(метки нужны крону, чтобы не заводить эти задачи повторно — не удалять)',
  ].join('\n')
}

/**
 * Есть ли уже открытая задача-пачка этого типа.
 *
 * Нужна, чтобы находка, появившаяся между прогонами, дописывалась в готовую
 * пачку, а не рождала тринадцатую карточку рядом с ней.
 */
export function matchesGroup(
  type: Finding['type'],
  task: { description?: string | null }
): boolean {
  return (task.description || '').includes(`${GROUP_PREFIX} ${type}`)
}
