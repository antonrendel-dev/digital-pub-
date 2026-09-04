/**
 * Защита бота завода (S9, аудит 04.09.2026).
 *
 * Три дыры в одном месте: slug из команды уходил в path.join без проверки
 * (`../x` пишет файл вне content/articles, а regen затем делает git push
 * в main), slug и сцена вставлялись в HTML-ответ без экранирования, а
 * /content_plan, /content_write и /content_regen запускали процессы без
 * лока — компрометация Telegram-аккаунта означала слив бюджета API одним
 * циклом сообщений (каждая генерация — десятки вызовов модели).
 *
 * Модуль без Telegram и без spawn: то, что можно проверить тестом,
 * проверяется тестом.
 */
import fs from 'fs'

/** Слаг статьи: хвост URL, только строчная латиница, цифры и дефис. */
export const SLUG_RE = /^[a-z0-9-]{3,120}$/

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug)
}

/** Для подстановок в sendMessage с parse_mode: 'HTML'. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface LockInfo {
  label: string
  pid: number
  startedAt: string
}

/**
 * Лок старше этого — протухший, даже если pid жив: самый долгий скрипт
 * завода (writer с картинками) укладывается в час, а pid после рестарта
 * может достаться любому долгоживущему процессу того же пользователя.
 */
export const LOCK_TTL_MS = 3 * 60 * 60 * 1000

/**
 * Один активный процесс на бота. Флаг в памяти плюс файл с pid ребёнка:
 * файл переживает аварийную смерть бота (штатный SIGTERM его снимает — под
 * systemd ребёнок умирает вместе с ботом), а протухший файл с мёртвым pid
 * или старше TTL не должен блокировать навсегда.
 */
export class ScriptLock {
  private current: LockInfo | null = null

  constructor(
    private readonly lockFile: string,
    private readonly isAlive: (pid: number) => boolean = defaultIsAlive
  ) {}

  /** Кто держит лок, если он занят; null — свободно. */
  holder(now: number = Date.now()): LockInfo | null {
    if (this.current) return this.current
    const onDisk = this.readFile()
    if (!onDisk || !this.isAlive(onDisk.pid)) return null
    const age = now - Date.parse(onDisk.startedAt)
    if (!Number.isFinite(age) || age > LOCK_TTL_MS) return null
    return onDisk
  }

  /** Записать pid ребёнка: после рестарта бота лок должен пережить именно его. */
  attachPid(pid: number): void {
    if (!this.current) return
    this.current = { ...this.current, pid }
    this.writeFile(this.current)
  }

  /** Захватить лок. Возвращает держателя, если занято, иначе null. */
  acquire(label: string, pid: number = process.pid): LockInfo | null {
    const busy = this.holder()
    if (busy) return busy
    const info: LockInfo = { label, pid, startedAt: new Date().toISOString() }
    this.current = info
    this.writeFile(info)
    return null
  }

  private writeFile(info: LockInfo): void {
    try {
      fs.writeFileSync(this.lockFile, JSON.stringify(info))
    } catch {
      // Файл — страховка на рестарт; без него лок в памяти всё равно работает.
    }
  }

  release(): void {
    this.current = null
    try {
      fs.unlinkSync(this.lockFile)
    } catch {
      // Файла может не быть, если запись не удалась.
    }
  }

  private readFile(): LockInfo | null {
    try {
      const raw = JSON.parse(fs.readFileSync(this.lockFile, 'utf8')) as Partial<LockInfo>
      if (typeof raw.pid !== 'number' || typeof raw.label !== 'string') return null
      return { label: raw.label, pid: raw.pid, startedAt: raw.startedAt ?? '' }
    } catch {
      return null
    }
  }
}

function defaultIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
