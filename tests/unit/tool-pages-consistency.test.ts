import fs from 'fs'
import path from 'path'

/**
 * Раздел инструментов живёт в трёх списках сразу: страницы в маршруте /tools,
 * редиректы в next.config и набор слагов, которые карта сайта не должна
 * показывать как /vacancies/*. Разъезжаются они молча — вакансия под новым
 * тегом просто уедет в карту адресом, который отдаёт редирект.
 *
 * Проверено 31.08.2026 по позициям Топвизора: перехвата инструментальных
 * ключей профессиональными страницами нет ни одного — все тринадцать
 * ранжирующихся держит их собственная цель. Тест сторожит, чтобы так и
 * осталось на уровне структуры.
 */
const root = process.cwd()
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8')

const toolsPage = read('app/(main)/tools/[toolSlug]/page.tsx')
const sitemapLib = read('lib/sitemap/vacancies.ts')
const nextConfig = read('next.config.mjs')

const redirectSources = [...nextConfig.matchAll(/source: '\/vacancies\/([a-z0-9-]+)'/g)].map(
  (m) => m[1]
)
const sitemapExcluded = [
  ...(sitemapLib.match(/TOOL_REDIRECT_SLUGS = new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? '').matchAll(
    /'([a-z0-9-]+)'/g
  ),
].map((m) => m[1])

describe('раздел инструментов согласован сам с собой', () => {
  it('каждый редирект /vacancies/* исключён из карты сайта', () => {
    // «other» — служебная категория без своей страницы, к инструментам не относится.
    const missing = redirectSources.filter((s) => s !== 'other' && !sitemapExcluded.includes(s))
    expect(missing).toEqual([])
  })

  it('в исключениях карты нет слагов без редиректа', () => {
    const orphans = sitemapExcluded.filter((s) => !redirectSources.includes(s))
    expect(orphans).toEqual([])
  })

  it('у каждой страницы инструмента есть свой редирект или её адрес свободен', () => {
    const toolSlugs = [...toolsPage.matchAll(/^ {2}'([a-z0-9-]+)':/gm)].map((m) => m[1])
    expect(toolSlugs.length).toBeGreaterThan(0)
    // Инструменты без редиректа допустимы: у bitrix24, excel и notion адреса
    // /vacancies/{slug} не существует вовсе, перехватывать нечего.
    const KNOWN_WITHOUT_TWIN = ['bitrix24', 'excel', 'notion']
    const unexpected = toolSlugs.filter(
      (s) => !redirectSources.includes(s) && !KNOWN_WITHOUT_TWIN.includes(s)
    )
    expect(unexpected).toEqual([])
  })
})
