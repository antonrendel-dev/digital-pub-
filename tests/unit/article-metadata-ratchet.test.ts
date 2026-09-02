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

// Пороги живут в lib/article-metadata-gate.ts — там же, откуда их берёт
// контент-завод. Дублировать числа здесь значит однажды развести их с заводом.
import {
  BRAND_SUFFIX,
  TITLE_LIMIT,
  DESC_MIN,
  DESC_MAX,
  ECHO_WORDS,
  SOURCE_OR_YEAR,
  echoedWords,
} from '../../lib/article-metadata-gate'

// Зафиксировано прогоном page-quality от 01.09.2026, опущено после переписки
// 41 статьи под ключи: длинных title было 70, description вне коридора — 40.
const DEBT = {
  titleTooLong: 0,
  descOutOfRange: 0,
  noFaq: 0,
  descEchoesTitle: 0,
  descNoSourceOrYear: 0,
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
    const echo = articles.filter((a) => echoedWords(a.title, a.description) >= ECHO_WORDS)
    expect(echo.length).toBeLessThanOrEqual(DEBT.descEchoesTitle)
  })

  it('в description есть источник или год', () => {
    // Пункт 7 второго чек-листа: сниппет без даты и источника читается как
    // пересказ. Правился 02.09.2026 сразу после того, как переписка описаний
    // сама же и уронила этот показатель с 34 до 61 нарушения.
    const noSource = articles.filter((a) => !SOURCE_OR_YEAR.test(a.description))
    expect(noSource.length).toBeLessThanOrEqual(DEBT.descNoSourceOrYear)
  })

  it('у каждой статьи есть и title, и description', () => {
    const broken = articles.filter((a) => !a.title || !a.description)
    expect(broken.map((a) => a.slug)).toEqual([])
  })
})
