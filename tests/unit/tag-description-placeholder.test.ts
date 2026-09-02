import fs from 'fs'
import path from 'path'

/**
 * Плейсхолдер {N} подставляется только там, где страница вызывает fillCount.
 *
 * 02.09.2026 на проде вышло описание «{N} резюме специалистов…» — я написал
 * четыре описания тегов резюме по образцу категорий вакансий, а страница
 * /resumes/tag/[tagSlug] счётчик не подставляет. Тест закрывает эту разницу:
 * в описаниях резюме плейсхолдера быть не должно.
 */

const source = fs.readFileSync(path.join(process.cwd(), 'lib', 'tagH1.ts'), 'utf8')

function block(name: string): string {
  const m = source.match(
    new RegExp(`export const ${name}: Record<string, string> = \\{([\\s\\S]*?)\\n\\}`)
  )
  if (!m) throw new Error(`не найден блок ${name}`)
  return m[1]
}

function entries(name: string): Array<[string, string]> {
  return block(name)
    .split('\n')
    .map((line) => line.match(/^\s*'?([a-z-]+)'?: `(.*)`,$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => [m[1], m[2]] as [string, string])
}

describe('описания тегов и категорий', () => {
  it('в описаниях резюме нет неподставляемого {N}', () => {
    const withPlaceholder = entries('RESUME_TAG_DESCRIPTION')
      .filter(([, value]) => value.includes('{N}'))
      .map(([key]) => key)
    expect(withPlaceholder).toEqual([])
  })

  it('описания категорий вакансий и резюме укладываются в коридор сниппета', () => {
    const out: string[] = []
    for (const name of ['TAG_DESCRIPTION', 'RESUME_TAG_DESCRIPTION']) {
      for (const [key, value] of entries(name)) {
        // {N} заменяется трёхзначным счётчиком — длина почти не меняется.
        const length = value.replace('{N}', '100').length
        if (length < 140 || length > 175) out.push(`${name}.${key}: ${length}`)
      }
    }
    expect(out).toEqual([])
  })
})
