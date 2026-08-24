import fs from 'fs'
import path from 'path'

/**
 * Кластер «конкуренты hh/Avito» — три статьи под три разных бренд-якоря.
 * Каннибализации между ними нет, а вот перелинковки не было вовсе: каждая
 * ссылалась только на собственный канонический адрес. Тикет 20 требовал
 * связать их треугольником, и этот тест держит связь на месте.
 */
const CLUSTER = [
  'gde-iskat-rabotu-krome-hh-ru-15-ploshchadok-2026',
  'gde-iskat-rabotu-krome-avito',
  'agregatory-vakansij-digital-sravnenie-ploshhadok',
]

const read = (slug: string) =>
  fs.readFileSync(path.join(process.cwd(), 'content', 'articles', `${slug}.mdx`), 'utf8')

// Ссылка в теле статьи, а не упоминание адреса во frontmatter или JSON-LD.
const body = (src: string) => src.split(/^---$/m).slice(2).join('---')

describe('перелинковка кластера hh/Avito', () => {
  it.each(CLUSTER)('%s ссылается на обе соседние статьи', (slug) => {
    const text = body(read(slug))
    for (const other of CLUSTER.filter((s) => s !== slug)) {
      expect(text).toContain(`(/articles/${other})`)
    }
  })

  it('на себя статья не ссылается', () => {
    for (const slug of CLUSTER) {
      expect(body(read(slug))).not.toContain(`(/articles/${slug})`)
    }
  })

  // Голый адрес в скобках читается как ссылка ни на что: у markdown-ссылки
  // обязателен текст, и он должен нести ключ, а не слово «тут».
  it('у каждой ссылки осмысленный текст', () => {
    for (const slug of CLUSTER) {
      const links = [...body(read(slug)).matchAll(/\[([^\]]+)\]\(\/articles\/[a-z0-9-]+\)/g)]
      expect(links.length).toBeGreaterThanOrEqual(2)
      for (const [, anchor] of links) {
        expect(anchor.length).toBeGreaterThan(8)
        expect(anchor).not.toMatch(/^(тут|здесь|ссылка|подробнее)$/i)
      }
    }
  })
})
