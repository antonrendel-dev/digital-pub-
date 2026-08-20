import { SITE_NAME } from '../../lib/seoTitle'
import { RESUME_TAG_TITLE, TAG_TITLE } from '../../lib/tagH1'
import {
  FORMAT_SLUGS,
  LEVEL_SLUGS,
  SPEC_SLUGS,
  getSpecFilterTitle,
} from '../../lib/spec-filter-meta'

// Яндекс и Google обрезают сниппет примерно на этой длине. Считаем то, что реально
// увидит пользователь: шаблон layout дописывает « | Диджитал Паб» к каждому title.
const MAX_TITLE = 65
const BRAND_SUFFIX = ` | ${SITE_NAME}`

// {N} — подстановка числа вакансий, берём худший случай в три знака
const rendered = (title: string) => title.replace('{N}', '100') + BRAND_SUFFIX

const tooLong = (entries: [string, string][]) =>
  entries
    .map(([key, title]) => [key, rendered(title)] as const)
    .filter(([, title]) => title.length > MAX_TITLE)
    .map(([key, title]) => `${title.length} ${key}: ${title}`)

describe('длина <title> листингов', () => {
  it('title категорий вакансий влезает в сниппет', () => {
    expect(tooLong(Object.entries(TAG_TITLE))).toEqual([])
  })

  it('title категорий резюме влезает в сниппет', () => {
    expect(tooLong(Object.entries(RESUME_TAG_TITLE))).toEqual([])
  })

  it('title посадочных спец×фильтр влезает в сниппет', () => {
    const entries: [string, string][] = []
    for (const spec of SPEC_SLUGS) {
      for (const filter of [...FORMAT_SLUGS, ...LEVEL_SLUGS]) {
        entries.push([`${spec}/${filter}`, getSpecFilterTitle(spec, filter)])
      }
    }

    expect(tooLong(entries)).toEqual([])
  })
})
