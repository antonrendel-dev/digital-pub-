import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

/**
 * Страж раннера дожима.
 *
 * 02.09.2026 перенос функций в boost-plan.ts оставил boost.ts без импортов:
 * tsc их не увидел (scripts/** исключены из основного конфига), esbuild
 * свободные идентификаторы пропустил, а try/catch вокруг кандидата напечатал
 * ReferenceError как «сорвалось» — то есть под сбой модели. Раннер уехал в
 * коммит неработающим.
 *
 * Сухой прогон в модель не ходит вовсе, поэтому такой тест ловит подобное за
 * миллисекунды. Собираем бандл здесь же: тест на устаревшем бандле бесполезен.
 */
const ROOT = process.cwd()
const BUNDLE = path.join(ROOT, 'scripts', 'content-factory', 'boost.compiled.js')

function run(args: string[]): { out: string; code: number } {
  try {
    const out = execFileSync('node', [BUNDLE, ...args], { encoding: 'utf8', stdio: 'pipe' })
    return { out, code: 0 }
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; status?: number }
    return { out: `${err.stdout ?? ''}${err.stderr ?? ''}`, code: err.status ?? 1 }
  }
}

describe('раннер дожима — сухой прогон', () => {
  let input: string

  beforeAll(() => {
    execFileSync('bash', [path.join(ROOT, 'scripts', 'content-factory', 'build.sh')], {
      stdio: 'pipe',
    })
    // Слаг живой статьи: раннер читает файл и считает слова.
    input = path.join(os.tmpdir(), `boost-test-${process.pid}.tsv`)
    fs.writeFileSync(
      input,
      'резюме контент менеджера\t11\thttps://d-pub.ru/articles/rezume-kontent-menedzhera\n' +
        'tilda вакансии\t13\thttps://d-pub.ru/tools/tilda\n'
    )
  }, 120_000)

  afterAll(() => fs.rmSync(input, { force: true }))

  it('доходит до конца и называет кандидата', () => {
    const { out, code } = run([`--input=${input}`, '--dry-run'])
    expect(out).toContain('rezume-kontent-menedzhera')
    expect(out).toContain('взял бы в работу')
    expect(code).toBe(0)
  })

  it('не падает на ненайденных именах — их и не должно быть', () => {
    const { out } = run([`--input=${input}`, '--dry-run'])
    expect(out).not.toMatch(/is not defined|сорвалось/)
  })

  it('объясняет, почему листинг не взят', () => {
    const { out } = run([`--input=${input}`, '--dry-run'])
    expect(out).toContain('тело лежит в коде')
  })

  it('падает с кодом 2 на непонятном --limit', () => {
    const { out, code } = run([`--input=${input}`, '--dry-run', '--limit=abc'])
    expect(code).toBe(2)
    expect(out).toContain('--limit должен быть целым числом')
  })

  it('не пускает произвольный путь в --slug', () => {
    const { out, code } = run(['--slug=../etc/passwd', '--key=x'])
    expect(code).toBe(2)
    expect(out).toContain('--slug должен быть слагом статьи')
  })
})
