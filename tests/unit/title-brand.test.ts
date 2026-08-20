import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { SITE_NAME, stripBrandSuffix } from '../../lib/seoTitle'
import { TAG_TITLE } from '../../lib/tagH1'

const ROOT = path.join(__dirname, '../..')

function walk(dir: string, ext: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return walk(full, ext)
    return e.name.endsWith(ext) ? [full] : []
  })
}

// og:title и twitter:title бренд содержать обязаны: siteName из layout
// не наследуется, когда страница задаёт свой openGraph. Вырезаем эти блоки,
// чтобы проверять только то, что попадает в <title>.
function stripSocialBlocks(source: string): string {
  let out = ''
  for (let i = 0; i < source.length; ) {
    const next = source.slice(i).search(/\b(openGraph|twitter):\s*\{/)
    if (next === -1) {
      out += source.slice(i)
      break
    }
    out += source.slice(i, i + next)
    let j = i + next + source.slice(i + next).indexOf('{')
    let depth = 0
    for (; j < source.length; j++) {
      if (source[j] === '{') depth++
      else if (source[j] === '}' && --depth === 0) break
    }
    i = j + 1
  }
  return out
}

function titleLiterals(source: string): { name: string; value: string }[] {
  const found: { name: string; value: string }[] = []
  const re = /(?:^|[\s{,])(?:const\s+)?(\w*[Tt](?:itle|ITLE))\s*[:=]\s*(['"`])([\s\S]*?)\2/g
  for (const m of source.matchAll(re)) found.push({ name: m[1], value: m[3] })
  return found
}

describe('бренд в <title>', () => {
  it('шаблон бренда объявлен ровно в одном месте — в layout', () => {
    const layout = fs.readFileSync(path.join(ROOT, 'app/(main)/layout.tsx'), 'utf-8')
    expect(layout).toContain(`template: '%s | ${SITE_NAME}'`)

    const templates = walk(path.join(ROOT, 'app'), '.tsx').filter((f) =>
      /template:\s*['"`]%s/.test(fs.readFileSync(f, 'utf-8'))
    )
    expect(templates.map((f) => path.relative(ROOT, f))).toEqual(['app/(main)/layout.tsx'])
  })

  it('ни один источник <title> в app/ не содержит бренд — его добавит шаблон', () => {
    const offenders: string[] = []

    for (const file of walk(path.join(ROOT, 'app'), '.tsx')) {
      const rel = path.relative(ROOT, file)
      if (rel === 'app/(main)/layout.tsx') continue

      const source = stripSocialBlocks(fs.readFileSync(file, 'utf-8'))
      for (const { name, value } of titleLiterals(source)) {
        if (!value.includes(SITE_NAME)) continue
        // SOCIAL_TITLE по соглашению уходит только в og/twitter — там бренд нужен
        if (name.startsWith('SOCIAL')) continue
        // title: { absolute: ... } шаблон не трогает — бренд там законен
        if (source.includes(`absolute: '${value}'`)) continue
        offenders.push(`${rel}: ${value}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it('переопределения <title> категорий не содержат бренд', () => {
    const offenders = Object.entries(TAG_TITLE).filter(([, title]) => title.includes(SITE_NAME))
    expect(offenders).toEqual([])
  })

  it('фронтматтер статей не содержит бренд в title и metaTitle', () => {
    const offenders: string[] = []

    for (const file of walk(path.join(ROOT, 'content/articles'), '.mdx')) {
      const { data } = matter(fs.readFileSync(file, 'utf-8'))
      for (const field of ['title', 'metaTitle'] as const) {
        if (typeof data[field] === 'string' && data[field].includes(SITE_NAME)) {
          offenders.push(`${path.basename(file)} ${field}: ${data[field]}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })
})

describe('детектор дубля', () => {
  const page = `
    const TITLE = 'Вакансии дизайнера | Диджитал Паб'
    export const metadata: Metadata = {
      title: TITLE,
      openGraph: {
        title: 'Вакансии дизайнера — Диджитал Паб',
        images: [{ alt: 'Диджитал Паб' }],
      },
      twitter: { title: 'Вакансии дизайнера — Диджитал Паб' },
    }`

  it('видит бренд в источнике <title>', () => {
    const found = titleLiterals(stripSocialBlocks(page))
      .filter((t) => t.value.includes(SITE_NAME))
      .map((t) => t.value)

    expect(found).toEqual(['Вакансии дизайнера | Диджитал Паб'])
  })

  it('не считает нарушением бренд в og:title и twitter:title', () => {
    expect(stripSocialBlocks(page)).not.toContain('Вакансии дизайнера — Диджитал Паб')
  })
})

describe('stripBrandSuffix', () => {
  it('снимает бренд с любым разделителем в конце строки', () => {
    expect(stripBrandSuffix('Вакансии SEO | Диджитал Паб')).toBe('Вакансии SEO')
    expect(stripBrandSuffix('Вакансии SEO — Диджитал Паб')).toBe('Вакансии SEO')
    expect(stripBrandSuffix('Вакансии SEO – Диджитал Паб')).toBe('Вакансии SEO')
    expect(stripBrandSuffix('Вакансии SEO - Диджитал Паб')).toBe('Вакансии SEO')
  })

  it('не трогает бренд внутри строки — это часть смысла заголовка', () => {
    expect(stripBrandSuffix('Диджитал Паб для HR: как искать кандидатов')).toBe(
      'Диджитал Паб для HR: как искать кандидатов'
    )
  })

  it('оставляет заголовок без бренда как есть', () => {
    expect(stripBrandSuffix('Вакансии SMM-менеджера')).toBe('Вакансии SMM-менеджера')
  })

  it('снимает бренд один раз, повторный вызов ничего не меняет', () => {
    const once = stripBrandSuffix('Резюме дизайнера | Диджитал Паб')
    expect(stripBrandSuffix(once)).toBe(once)
  })
})
