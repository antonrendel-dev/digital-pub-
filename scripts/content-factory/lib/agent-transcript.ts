import fs from 'fs'
import path from 'path'

/**
 * Переписка с агентами прогона, сохранённая на диск.
 *
 * До 30.08.2026 ответы агентов жили только в памяти процесса: в
 * `logs/content-factory.log` попадали служебные строки вроде «Шаг 5б:
 * генерирую графики», а что именно ответил писатель — нет. Разобрать
 * постфактум, почему статья вышла такой, было нечем; метку `[WRITER]`
 * в семи статьях заметили только с сайта.
 *
 * Каждый обмен ложится отдельным файлом: промпт и ответ целиком. Прогон —
 * это каталог с датой и темой, так что «покажи, что там наотвечали 14-го»
 * — это `ls`, а не раскопки в общем логе.
 *
 * Запись никогда не роняет прогон: статья важнее своей стенограммы.
 */

// От корня проекта, не от process.cwd(): планировщик и бот запускают writer из
// scripts/content-factory, и с 03.09.2026 стенограммы уезжали в
// scripts/content-factory/logs/. Абсолютный путь, как в alert.ts: модуль едет
// в ESM-бандл (нет __dirname) и в ts-jest как CJS (нет import.meta).
const RUNS_ROOT = '/home/claude/projects/digital-pub-/logs/factory-runs'

// Месяц — компромисс между «разобрать позавчерашнюю жалобу» и размером:
// прогон весит 100–300 КБ, тридцать штук укладываются в единицы мегабайт.
const KEEP_DAYS = 30

let runDirectory: string | null = null
let counter = 0

function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-zа-я0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'run'
  )
}

/** Открывает каталог прогона. Повторный вызов внутри процесса ничего не меняет. */
export function startRun(label: string): string | null {
  if (runDirectory) return runDirectory
  try {
    const stamp = new Date().toISOString().slice(0, 10)
    const dir = path.join(RUNS_ROOT, `${stamp}-${slugify(label)}`)
    fs.mkdirSync(dir, { recursive: true })
    runDirectory = dir
    pruneOldRuns()
    return dir
  } catch {
    return null
  }
}

export function currentRunDir(): string | null {
  return runDirectory
}

/**
 * Кладёт один обмен на диск. Шаг берётся тот же, что писатель печатает
 * в лог, — иначе файлы придётся сопоставлять с логом по времени.
 */
export function recordExchange(
  agent: string,
  stage: string | null,
  prompt: string,
  answer: string
): void {
  if (!runDirectory) return
  try {
    counter += 1
    const name = `${String(counter).padStart(2, '0')}-${agent}-${slugify(stage ?? 'без-шага')}.md`
    const body =
      `# ${agent} · ${stage ?? 'шаг не отмечен'}\n\n` +
      `_${new Date().toISOString()}_\n\n` +
      `## Промпт\n\n${prompt}\n\n## Ответ\n\n${answer}\n`
    fs.writeFileSync(path.join(runDirectory, name), body, 'utf8')
  } catch {
    // Стенограмма не стоит упавшего прогона.
  }
}

function pruneOldRuns(): void {
  try {
    const edge = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000
    for (const entry of fs.readdirSync(RUNS_ROOT)) {
      const dir = path.join(RUNS_ROOT, entry)
      if (fs.statSync(dir).mtimeMs < edge) fs.rmSync(dir, { recursive: true, force: true })
    }
  } catch {
    // Уборка — не повод падать.
  }
}
