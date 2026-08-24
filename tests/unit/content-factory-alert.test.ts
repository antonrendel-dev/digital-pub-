import fs from 'fs'
import os from 'os'
import path from 'path'

// telegram.ts падает на импорте, если нет BOT_TOKEN и SEO_LAB_CHAT_ID.
// Отправку здесь не проверяем — только сборку текста и метку о дубле.
jest.mock('../../scripts/content-factory/lib/telegram', () => ({
  sendMessage: jest.fn().mockResolvedValue(1),
}))

import {
  formatFailure,
  readLogTail,
  markAlertSent,
  alertSentRecently,
} from '../../scripts/content-factory/lib/alert'

describe('formatFailure', () => {
  // Регрессия 24.08.2026: при падении приходило «Ошибка планировщика: writer
  // вышел с кодом 1». Ни темы, ни шага, ни причины — диагноз приходилось
  // искать в логе руками, и три дня публикаций так пропали молча.
  it('называет тему, шаг и причину, а не код возврата', () => {
    const text = formatFailure(
      {
        source: 'writer',
        stage: 'Шаг 1б: SEO-рисерч',
        topicId: 207,
        topicTitle: 'Собеседование на работу: вопросы работодателю',
        error: new Error('API Error: 529 Overloaded'),
        topicStaysInQueue: true,
      },
      ''
    )
    expect(text).toContain('#207')
    expect(text).toContain('Собеседование на работу')
    expect(text).toContain('Шаг 1б: SEO-рисерч')
    expect(text).toContain('529 Overloaded')
    expect(text).toContain('осталась в очереди')
  })

  it('без шага пишет, что упало до первого шага', () => {
    const text = formatFailure({ source: 'scheduler', error: new Error('spawn E2BIG') }, '')
    expect(text).toContain('до первого шага')
    expect(text).toContain('spawn E2BIG')
  })

  it('прикладывает хвост лога', () => {
    const text = formatFailure({ source: 'writer', error: new Error('бум') }, 'строка лога')
    expect(text).toContain('строка лога')
  })

  // Сообщение уходит с parse_mode HTML. Текст ошибки приходит извне, и угловые
  // скобки в нём ломают разбор — Telegram отвечает 400 и диагноз теряется.
  it('экранирует HTML в тексте ошибки и заголовке темы', () => {
    const text = formatFailure(
      {
        source: 'writer',
        topicTitle: 'Тема <b>жирная</b>',
        error: new Error('unexpected <token> & more'),
      },
      ''
    )
    expect(text).toContain('&lt;token&gt;')
    expect(text).toContain('&amp;')
    expect(text).not.toContain('<token>')
    expect(text).toContain('Тема &lt;b&gt;жирная&lt;/b&gt;')
  })

  it('обрезает длинную ошибку, чтобы влезть в лимит сообщения', () => {
    const text = formatFailure({ source: 'writer', error: new Error('я'.repeat(5000)) }, '')
    expect(text.length).toBeLessThan(4096)
  })

  it('принимает не только Error', () => {
    expect(formatFailure({ source: 'writer', error: 'getPayload failed' }, '')).toContain(
      'getPayload failed'
    )
  })
})

describe('readLogTail', () => {
  it('берёт последние строки', () => {
    const f = path.join(os.tmpdir(), `alert-test-${process.pid}.log`)
    fs.writeFileSync(f, Array.from({ length: 50 }, (_, i) => `строка ${i}`).join('\n'))
    const tail = readLogTail(3, f)
    expect(tail).toContain('строка 49')
    expect(tail).not.toContain('строка 40')
    fs.unlinkSync(f)
  })

  it('на отсутствующем файле возвращает пустоту, а не падает', () => {
    expect(readLogTail(5, '/nope/never/here.log')).toBe('')
  })
})

// Двухуровневый запуск: writer падает, шлёт подробность и выходит с кодом 1,
// scheduler видит только код. Без метки он отправит второе сообщение поверх.
describe('метка о доставленном отбойнике', () => {
  it('свежая метка видна, протухшая — нет', () => {
    markAlertSent()
    expect(alertSentRecently(60_000)).toBe(true)
    expect(alertSentRecently(0)).toBe(false)
  })
})
