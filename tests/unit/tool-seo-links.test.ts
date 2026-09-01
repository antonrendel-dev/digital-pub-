import fs from 'fs'
import path from 'path'
import { PROFESSIONS } from '@/lib/professions'
import { RESUME_TAG_TITLE, TAG_TITLE } from '@/lib/tagH1'

/**
 * Ссылки внутри SEO-текстов инструментов ведут на живые страницы.
 *
 * Повод: в тексте /tools/yandex-direct стояла ссылка на /resumes/tag/targetolog,
 * а такого тега нет — правильный слаг target. Страница отдавала 404, и заметить
 * это можно было только сходив по ссылке руками.
 *
 * Тексты живут строкой внутри page.tsx, поэтому читаем файл как текст: собрать
 * их из модуля нельзя — объект TOOLS не экспортируется, а экспортировать его
 * только ради теста значит менять код под тест.
 */
const PAGE = path.join(process.cwd(), 'app', '(main)', 'tools', '[toolSlug]', 'page.tsx')
const source = fs.readFileSync(PAGE, 'utf8')

const toolSlugs = [...source.matchAll(/^    slug: '([a-z0-9-]+)'/gm)].map((m) => m[1])

/** Адреса, которые страница может назвать: листинги, резюме, профессии, инструменты. */
function isKnown(href: string): boolean {
  const clean = href.replace(/\/$/, '')
  if (['/vacancies', '/resumes', '/articles', '/tools'].includes(clean)) return true
  const vacancy = clean.match(/^\/vacancies\/([a-z0-9-]+)$/)
  if (vacancy) return vacancy[1] in TAG_TITLE
  const resume = clean.match(/^\/resumes\/tag\/([a-z0-9-]+)$/)
  if (resume) return resume[1] in RESUME_TAG_TITLE
  const profession = clean.match(/^\/professions\/([a-z0-9-]+)$/)
  if (profession) return profession[1] in PROFESSIONS
  const tool = clean.match(/^\/tools\/([a-z0-9-]+)$/)
  if (tool) return toolSlugs.includes(tool[1])
  return false
}

describe('SEO-тексты инструментов', () => {
  it('перечень инструментов вообще нашёлся', () => {
    expect(toolSlugs.length).toBeGreaterThanOrEqual(18)
  })

  it('все внутренние ссылки ведут на существующие страницы', () => {
    const broken = [...source.matchAll(/href="(\/[^"#]+)"/g)]
      .map((m) => m[1])
      .filter((href) => !isKnown(href))
    expect([...new Set(broken)]).toEqual([])
  })

  it('на каждой странице есть блок «кем возьмут»', () => {
    const missing = toolSlugs.filter((slug) => {
      const start = source.indexOf(`slug: '${slug}'`)
      const end = source.indexOf('  },\n', start)
      return !/кем меня возьмут|кем возьмут/i.test(source.slice(start, end))
    })
    expect(missing).toEqual([])
  })
  it('ни один заголовок не остался без текста', () => {
    // Вставка нового H2 между заголовком и его абзацем оставляет читателя
    // с пустым разделом: «Зарплаты» без цифр, а цифры — ниже чужого блока.
    const orphans = source
      .split('\n')
      .filter((line, i, all) => /^<h2>/.test(line) && /^<h2>/.test(all[i + 1] ?? ''))
    expect(orphans).toEqual([])
  })
})
