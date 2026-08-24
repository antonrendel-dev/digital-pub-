/**
 * Замок «одна задача за раз».
 *
 * Требование Тони: если вчерашняя задача не закрыта, новая сегодня не
 * активируется. Иначе через неделю в работе семь начатых задач и ни одной
 * законченной.
 *
 * Состояние — обычный файл рядом со скриптом. База тут не нужна: запись одна,
 * читается раз в сутки, а файл переживает перезапуск и виден глазами.
 */
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const LOCK_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'current-task.json')

export function readLock(path = LOCK_PATH) {
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    return raw?.taskId ? raw : null
  } catch {
    // Файла нет или он битый — считаем, что в работе ничего нет. Падать здесь
    // нельзя: сломанный замок не должен останавливать утренний прогон.
    return null
  }
}

export function writeLock(lock, path = LOCK_PATH) {
  writeFileSync(path, JSON.stringify(lock, null, 2))
}

export function clearLock(path = LOCK_PATH) {
  if (existsSync(path)) unlinkSync(path)
}

export { LOCK_PATH }
