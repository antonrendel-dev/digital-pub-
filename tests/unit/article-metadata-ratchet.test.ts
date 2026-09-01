import fs from 'fs'
import path from 'path'

/**
 * Храповик на метаданные статей.
 *
 * 01.09.2026 прогон 142 страниц по трём чек-листам показал, что 70 статей из 83
 * держат title длиннее 65 знаков, а 125 страниц не имеют числовой вилки в
 * description. Чинить это будем постепенно, поэтому запрещать нарушения
 * целиком нельзя — тест бы падал с первого дня и его бы отключили.
 *
 * Вместо запрета — храповик: числа ниже это зафиксированный уровень долга.
 * Опускать их можно и нужно, поднимать нельзя. Любая правка, которая заводит
 * НОВОЕ нарушение, роняет тест.
 *
 * Когда счётчик уходит заметно ниже порога — обнови порог тем же коммитом,
 * иначе храповик перестаёт держать.
 */

const ARTICLES_DIR = path.join(process.cwd(), 'content', 'articles')

const BRAND_SUFFIX = ' | Диджитал Паб'
const TITLE_LIMIT = 65
const DESC_MIN = 140
const DESC_MAX = 175

// Зафиксировано прогоном page-quality от 01.09.2026, опущено после переписки
// 41 статьи под ключи: длинных title было 70, description вне коридора — 40.
const DEBT = {
  titleTooLong: 37,
  descOutOfRange: 11,
  noFaq: 37,
  descEchoesTitle: 5,
}

interface Front {
  slug: string
  title: string
  description: string
  hasFaq: boolean
}

function readFrontmatter(): Front[] {
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8')
      const block = raw.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''
      const field = (name: string) =>
        block.match(new RegExp(`^${name}:\\s*"(.*)"\\s*$`, 'm'))?.[1] ?? ''
      return {
        slug: file.replace(/\.mdx$/, ''),
        title: field('metaTitle') || field('title'),
        description: field('metaDescription') || field('description'),
        hasFaq: /^faqSchema:/m.test(block),
      }
    })
}

const articles = readFrontmatter()

describe('метаданные статей — храповик долга', () => {
  it('статьи вообще читаются', () => {
    expect(articles.length).toBeGreaterThan(50)
    expect(articles.every((a) => a.title.length > 0)).toBe(true)
  })

  it('длинных title не стало больше', () => {
    const long = articles.filter((a) => (a.title + BRAND_SUFFIX).length > TITLE_LIMIT)
    expect(long.length).toBeLessThanOrEqual(DEBT.titleTooLong)
  })

  it('description вне коридора не стало больше', () => {
    const out = articles.filter(
      (a) => a.description.length < DESC_MIN || a.description.length > DESC_MAX
    )
    expect(out.length).toBeLessThanOrEqual(DEBT.descOutOfRange)
  })

  it('статей без FAQ не стало больше', () => {
    const noFaq = articles.filter((a) => !a.hasFaq)
    expect(noFaq.length).toBeLessThanOrEqual(DEBT.noFaq)
  })

  it('description не пересказывает title первыми же словами', () => {
    // Пункт 5 второго чек-листа. Совпадение первых четырёх слов — уже пересказ.
    // Пять статей так делают, это тоже долг под храповиком.
    const echo = articles.filter((a) => {
      const t = a.title.toLowerCase().split(/\s+/).slice(0, 4)
      const d = a.description.toLowerCase().split(/\s+/).slice(0, 4)
      let same = 0
      while (same < t.length && t[same] === d[same]) same++
      return same >= 4
    })
    expect(echo.length).toBeLessThanOrEqual(DEBT.descEchoesTitle)
  })

  it('у каждой статьи есть и title, и description', () => {
    const broken = articles.filter((a) => !a.title || !a.description)
    expect(broken.map((a) => a.slug)).toEqual([])
  })
})
