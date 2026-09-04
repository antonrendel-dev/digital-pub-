import fs from 'fs'
import path from 'path'

import { SERVICE_MARKER } from '../../lib/strip-service-tail'

/**
 * Гигиена опубликованных статей.
 *
 * Повод: 01.09.2026 в пяти статьях нашёлся служебный текст приёмки —
 * «Готово для проверки агентом seo», «Использованные скиллы: …», сводка
 * вхождений ключей. Он попал и в тело статьи, и внутрь поля faqSchema,
 * то есть в разметку FAQPage. На /articles/rilsmeyker-kto-eto, самой
 * показываемой странице сайта, это было видно живым читателям.
 *
 * Ловится только тестом: глазами такой хвост не заметен, он в самом низу.
 */
const DIR = path.join(process.cwd(), 'content', 'articles')
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.mdx'))
const read = (f: string) => fs.readFileSync(path.join(DIR, f), 'utf8')

// Список маркеров один на весь проект: третья копия здесь уже разъезжалась
// с боевой — 04.09.2026 тест не знал формулировки «**Title:**» и пропустил
// хвост, который срезалка тоже пропускала (ревью того же дня).
const SERVICE = SERVICE_MARKER

describe('гигиена статей', () => {
  it('статьи вообще нашлись', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('в статьях нет служебного текста приёмки', () => {
    const dirty = files.filter((f) => SERVICE.test(read(f)))
    expect(dirty).toEqual([])
  })

  it('faqSchema разбирается как валидный JSON-массив', () => {
    const broken: string[] = []
    for (const f of files) {
      const m = read(f).match(/faqSchema:\s*'((?:[^']|'')*)'/)
      if (!m) continue
      try {
        const parsed = JSON.parse(m[1].replace(/''/g, "'"))
        if (!Array.isArray(parsed) || parsed.length === 0) broken.push(`${f}: не массив`)
      } catch (e) {
        broken.push(`${f}: ${(e as Error).message.slice(0, 60)}`)
      }
    }
    expect(broken).toEqual([])
  })
})
