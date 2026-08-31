import fs from 'fs'
import path from 'path'
import { ARTICLE_TAGS, NOINDEX_TAG_SLUGS } from '../../lib/article-tags'

/**
 * Закрытие от индексации легко расширить случайно: слаги тегов статей и
 * категорий вакансий совпадают по именам — smm, seo, targetolog, hr — и живут
 * рядом. Отличает их только маршрут: /articles/tag/smm против /vacancies/smm.
 * Поэтому проверяем не пересечение имён (оно неизбежно), а то, что список
 * применяется ровно там, где должен.
 */
const ALLOWED_USAGE = [
  'lib/article-tags.ts',
  'app/(main)/articles/tag/[slug]/page.tsx',
  'app/sitemap.ts',
  'tests/unit/noindex-scope.test.ts',
]

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) sourceFiles(full, acc)
    else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(full)
  }
  return acc
}

describe('граница noindex', () => {
  it('список применяется только в теге статей и в карте сайта', () => {
    const root = path.join(__dirname, '..', '..')
    const used = sourceFiles(root)
      .filter((f) => fs.readFileSync(f, 'utf8').includes('NOINDEX_TAG_SLUGS'))
      .map((f) => path.relative(root, f))
    expect(used.sort()).toEqual(ALLOWED_USAGE.sort())
  })

  it('каждый закрытый слаг существует среди тегов статей', () => {
    const known = new Set(ARTICLE_TAGS.map((t) => t.slug))
    expect([...NOINDEX_TAG_SLUGS].filter((s) => !known.has(s))).toEqual([])
  })

  it('закрывает ровно те двенадцать тегов, о которых договаривались', () => {
    expect([...NOINDEX_TAG_SLUGS].sort()).toEqual([
      'analitika-dannykh',
      'dizajner',
      'hr',
      'nejroseti',
      'rezyume',
      'seo',
      'smm',
      'targetolog',
      'udalennaya-rabota',
      'vakansii',
      'veb-analitika',
      'zarplaty',
    ])
  })

  it('в карте сайта остаются категории вакансий с теми же именами', () => {
    const sitemap = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'sitemap.ts'), 'utf8')
    // фильтр висит на тегах статей, а не на общем списке маршрутов
    expect(sitemap).toContain('ARTICLE_TAGS.filter(')
    expect(sitemap).not.toMatch(/tagRoutes[^\n]*NOINDEX_TAG_SLUGS/)
  })
})
