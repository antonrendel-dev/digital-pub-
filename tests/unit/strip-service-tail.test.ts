import { hasServiceText, stripServiceTail } from '../../lib/strip-service-tail'

/**
 * Формулировки хвоста взяты из семи статей, где он реально нашёлся 01.09.2026.
 * Каждая — отдельный случай: агент писал отчёт по-своему, и первая ручная
 * чистка по одной формулировке пропустила две статьи.
 */
const BODY = '## Сколько платят\n\nВилка 40 000–150 000 ₽ в штате.\n'

const TAILS = [
  '\n---\n\n**Служебное, вне тела статьи — для приёмки seo:** вхождения «ключ» — ровно 6.',
  '\n---\n\nГотово для проверки агентом seo. Использованные скиллы: `dpub-content-standard`.',
  '\n---\n\nИспользованный скилл: `dpub-content-standard` (мастер-промпт v6.6).',
  '\n---\n\nИспользован скилл: `dpub-content-standard`. Готово для проверки агентом seo.',
  '\n---\n\nСкиллы: `dpub-content-standard` (мастер-промпт v6.6 — правила вхождений).',
]

describe('срез служебного хвоста при публикации', () => {
  it.each(TAILS)('срезает хвост: %s', (tail) => {
    const cleaned = stripServiceTail(BODY + tail)
    expect(hasServiceText(cleaned)).toBe(false)
    expect(cleaned).toContain('Вилка 40 000–150 000 ₽')
  })

  it('не трогает статью без хвоста', () => {
    expect(stripServiceTail(BODY).trim()).toBe(BODY.trim())
  })

  it('не режет обычный горизонтальный разделитель в тексте', () => {
    const withRule = BODY + '\n---\n\n## Как войти в профессию\n\nЗа 1–3 месяца.\n'
    expect(stripServiceTail(withRule)).toContain('Как войти в профессию')
  })
})
