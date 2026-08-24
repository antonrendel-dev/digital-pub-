/**
 * Общий отбойник о падении для всего завода.
 *
 * Зачем отдельный модуль. Раньше при сбое приходило два бесполезных
 * сообщения: writer слал «Ошибка при генерации статьи: claude завершился с
 * кодом 1», scheduler добавлял «Ошибка планировщика: writer вышел с кодом 1».
 * Ни темы, ни шага, ни причины — чтобы понять, что случилось, надо было лезть
 * в лог руками. За 15–24.08.2026 так молча пропало три дня публикаций.
 *
 * Тем же механизмом будут пользоваться кроны автозадач, поэтому отправка
 * живёт здесь, а не внутри writer.
 */

import fs from 'fs'
import { sendMessage } from './telegram.js'

const FACTORY_DIR = '/home/claude/projects/digital-pub-/scripts/content-factory'
const LOG_PATH = '/home/claude/projects/digital-pub-/logs/content-factory.log'

/**
 * Метка о том, что подробный отбойник уже ушёл.
 *
 * Нужна из-за двухуровневого запуска: writer падает, шлёт подробность и
 * выходит с кодом 1, а scheduler видит только код возврата. Без метки он
 * отправит второе сообщение поверх первого. Но если writer умер ДО отправки
 * (17.08.2026 он падал на spawn E2BIG ещё до старта), молчать нельзя —
 * тогда отбойник шлёт scheduler.
 */
// Путь абсолютный, а не от import.meta: тот же модуль читается тестами
// в CommonJS-окружении, где import.meta недоступен.
const FLAG_PATH = `${FACTORY_DIR}/data/.alert-sent`
const FLAG_TTL_MS = 10 * 60 * 1000

export interface FailurePayload {
  /** Что запускали: «writer», «scheduler», имя крона. */
  source: string
  /** Шаг, на котором упало. Пустой, если упало до первого шага. */
  stage?: string | null
  topicId?: number | null
  topicTitle?: string | null
  error: unknown
  /** Номер попытки и сколько их было всего — если шли повторы. */
  attempt?: { current: number; total: number }
  /** Осталась ли тема в очереди на завтра. */
  topicStaysInQueue?: boolean
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Хвост лога — обычно там причина видна лучше, чем в тексте исключения. */
export function readLogTail(lines = 10, logPath = LOG_PATH): string {
  try {
    const all = fs.readFileSync(logPath, 'utf-8').split('\n')
    return all
      .slice(-lines - 1)
      .join('\n')
      .trim()
  } catch {
    return ''
  }
}

export function markAlertSent(): void {
  try {
    fs.writeFileSync(FLAG_PATH, String(Date.now()))
  } catch {
    // Метка — удобство, а не условие работы: не смогли записать, значит
    // придёт лишнее сообщение. Это лучше, чем упасть внутри обработчика ошибки.
  }
}

export function alertSentRecently(ttlMs = FLAG_TTL_MS): boolean {
  try {
    const at = Number(fs.readFileSync(FLAG_PATH, 'utf-8'))
    return Number.isFinite(at) && Date.now() - at < ttlMs
  } catch {
    return false
  }
}

export function formatFailure(p: FailurePayload, logTail = readLogTail()): string {
  const err = p.error instanceof Error ? p.error.message : String(p.error)
  const lines = [`❌ <b>Контент-завод: прогон не завершён</b>`, '']

  // Номер и заголовок независимы: writer узнаёт заголовок сразу, а падение
  // может случиться и до того, как известен номер.
  if (p.topicId != null || p.topicTitle) {
    const num = p.topicId != null ? `#${p.topicId}` : ''
    const title = p.topicTitle ? `${num ? ': ' : ''}${escapeHtml(p.topicTitle)}` : ''
    lines.push(`📌 Тема ${num}${title}`.replace(/\s+/g, ' ').trim())
  }
  lines.push(`⚙️ Упало на: ${escapeHtml(p.stage || 'старт, до первого шага')}`)
  lines.push(`🔧 Источник: ${escapeHtml(p.source)}`)
  if (p.attempt) lines.push(`🔁 Попытка ${p.attempt.current} из ${p.attempt.total}`)

  lines.push('', `<b>Ошибка</b>`, `<pre>${escapeHtml(err.slice(0, 600))}</pre>`)

  if (logTail) {
    lines.push(`<b>Хвост лога</b>`, `<pre>${escapeHtml(logTail.slice(-1200))}</pre>`)
  }

  if (p.topicStaysInQueue) {
    lines.push('', `✅ Тема осталась в очереди — завтра завод возьмёт её же.`)
  }

  return lines.join('\n')
}

/** Отправка с тремя попытками: сбой Telegram не должен съесть диагноз. */
export async function sendFailureAlert(p: FailurePayload): Promise<boolean> {
  const text = formatFailure(p)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await sendMessage(text)
      markAlertSent()
      return true
    } catch (e) {
      console.error(`[alert] не отправлен (попытка ${attempt}/3): ${(e as Error).message}`)
      if (attempt < 3) await new Promise((r) => setTimeout(r, 15_000))
    }
  }
  return false
}
