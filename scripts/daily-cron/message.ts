/**
 * Тексты утренних сообщений. Отдельно от механики, чтобы формулировки можно
 * было править и проверять тестами, не трогая работу с Todoist.
 */

import { LABEL_ASK, type Decision, type Lock, type Task } from './select'

const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const plural = (n: number, forms: [string, string, string]) => {
  const m100 = Math.abs(n) % 100
  const m10 = m100 % 10
  if (m100 >= 11 && m100 <= 14) return forms[2]
  if (m10 === 1) return forms[0]
  if (m10 >= 2 && m10 <= 4) return forms[1]
  return forms[2]
}

/**
 * Вопросы к задаче лежат в её описании отдельным блоком. Крон их не
 * придумывает — он достаёт то, что мы записали, когда заводили карточку.
 */
export function extractQuestions(task: Task): string[] {
  const desc = task.description || ''
  const m = desc.match(/ВОПРОСЫ[^\n]*\n([\s\S]*?)(?:\n\n|$)/)
  if (!m) return []
  return m[1]
    .split('\n')
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 6)
}

export function renderOffer(task: Task, score: number, label: string): string {
  const lines = [
    `☀️ <b>Задача на сегодня</b>`,
    '',
    `<b>${esc(task.content)}</b>`,
    `Балл: ${score}/100`,
  ]

  if (label === LABEL_ASK) {
    const qs = extractQuestions(task)
    lines.push('', 'Эту задачу без тебя не начать.')
    if (qs.length) {
      lines.push('', '<b>Что нужно от тебя:</b>')
      qs.forEach((q, i) => lines.push(`${i + 1}. ${esc(q)}`))
    }
    lines.push('', 'Ответь — и берусь.')
  } else {
    lines.push('', 'Делаю сам, ничего от тебя не нужно.', '', 'Отвечай «делай» — и начинаю.')
  }
  return lines.join('\n')
}

export function renderContinue(lock: Lock, days: number): string {
  const d = days === 0 ? 'сегодня' : `${days} ${plural(days, ['день', 'дня', 'дней'])}`
  return [
    `⏳ <b>Продолжаю вчерашнее</b>`,
    '',
    `<b>${esc(lock.title)}</b>`,
    `В работе ${d}.`,
    '',
    'Новую задачу не беру, пока эта не в «Готово».',
  ].join('\n')
}

export function renderStale(lock: Lock, days: number): string {
  return [
    `🐌 <b>Задача зависла</b>`,
    '',
    `<b>${esc(lock.title)}</b>`,
    `В работе ${days} ${plural(days, ['день', 'дня', 'дней'])}.`,
    '',
    'Ковыряем дальше или бросаем и берём следующую?',
  ].join('\n')
}

export function renderIdle(reason: string): string {
  return [
    `😴 <b>Задач на сегодня нет</b>`,
    '',
    esc(reason),
    '',
    'Доска ждёт разметки или пополнения.',
  ].join('\n')
}

export function render(decision: Decision): string {
  switch (decision.kind) {
    case 'offer':
      return renderOffer(decision.task, decision.score, decision.label)
    case 'continue':
      return renderContinue(decision.lock, decision.days)
    case 'stale':
      return renderStale(decision.lock, decision.days)
    case 'idle':
      return renderIdle(decision.reason)
  }
}
