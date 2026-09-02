import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

/**
 * Страж раннера дожима.
 *
 * 02.09.2026 перенос функций в boost-plan.ts оставил boost.ts без импортов:
 * tsc их не видел (scripts/** исключены из основного конфига), esbuild
 * свободные идентификаторы пропустил, а try/catch вокруг кандидата печатал
 * ReferenceError как «сорвалось» — то есть под сбой модели. Раннер уехал
 * в коммит неработающим.
 *
 * Сухой прогон в модель не ходит вовсе, поэтому такой тест ловит подобное за
 * миллисекунды. Собираем во ВРЕМЕННЫЙ каталог: прежняя версия звала build.sh
 * и переписывала отслеживаемые *.compiled.js, оставляя грязное дерево после
 * каждого прогона тестов.
 */
const ROOT = process.cwd()
const FACTORY = path.join(ROOT, 'scripts', 'content-factory')

let tmp: string
let bundle: string
let articles: string
let input: string

function run(args: string[]): { out: string; code: number } {
  const env = { ...process.env, BOOST_ARTICLES_DIR: articles }
  try {
    return { out: execFileSync('node', [bundle, ...args], { encoding: 'utf8', env }), code: 0 }
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; status?: number }
    return { out: `${err.stdout ?? ''}${err.stderr ?? ''}`, code: err.status ?? 1 }
  }
}

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boost-guard-'))
  bundle = path.join(tmp, 'boost.compiled.js')
  execFileSync(
    'npx',
    [
      'esbuild',
      path.join(FACTORY, 'boost.ts'),
      '--bundle',
      '--platform=node',
      '--format=esm',
      '--external:@anthropic-ai/sdk',
      `--outfile=${bundle}`,
    ],
    { cwd: ROOT, stdio: 'pipe' }
  )

  // Статья-фикстура вместо живой: живую могут переименовать, и тест упадёт
  // по причине, к раннеру отношения не имеющей.
  articles = path.join(tmp, 'articles')
  fs.mkdirSync(articles)
  fs.writeFileSync(
    path.join(articles, 'test-article.mdx'),
    '---\ntitle: "Тестовая статья"\nmetaTitle: "Тестовая статья"\n---\n## Заголовок\n\nТекст статьи.\n'
  )

  input = path.join(tmp, 'range.tsv')
  fs.writeFileSync(
    input,
    'тестовый ключ\t11\thttps://d-pub.ru/articles/test-article\n' +
      'tilda вакансии\t13\thttps://d-pub.ru/tools/tilda\n'
  )
}, 120_000)

afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

describe('раннер дожима — сухой прогон', () => {
  it('доходит до конца и называет кандидата', () => {
    const { out, code } = run([`--input=${input}`, '--dry-run'])
    expect(out).toContain('test-article')
    expect(out).toContain('взял бы в работу')
    expect(code).toBe(0)
  })

  it('не спотыкается на ненайденных именах', () => {
    const { out } = run([`--input=${input}`, '--dry-run'])
    expect(out).not.toMatch(/is not defined|сорвалось/)
  })

  it('объясняет, почему листинг не взят', () => {
    expect(run([`--input=${input}`, '--dry-run']).out).toContain('тело лежит в коде')
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

describe('закоммиченные бандлы завода', () => {
  /**
   * На сервере крутится закоммиченный *.compiled.js, а не исходник. Страж,
   * который сам всё пересобирает, устаревший артефакт поймать не может по
   * построению — он его перезаписывает. Поэтому сверяем отдельно.
   *
   * Команда повторяет build.sh дословно: esbuild нумерует переменные иначе,
   * когда точки входа собираются по одной, и сравнение поштучных сборок
   * с общей давало бы вечное расхождение.
   */
  const ENTRIES = [
    'analyst.ts',
    'writer.ts',
    'boost.ts',
    'publisher.ts',
    'content-bot.ts',
    'scheduler.ts',
    'regen.ts',
    'warm-lsi-cache.ts',
  ]

  let outdir: string

  beforeAll(() => {
    outdir = path.join(tmp, 'bundles')
    // cwd — каталог завода, как в build.sh: esbuild печатает пути модулей
    // в комментариях относительно рабочего каталога, и из корня репозитория
    // сборка отличалась бы от закоммиченной одними лишь этими строками.
    execFileSync(
      'npx',
      [
        'esbuild',
        ...ENTRIES,
        '--bundle',
        '--platform=node',
        '--format=esm',
        '--external:@anthropic-ai/sdk',
        `--outdir=${outdir}`,
        '--out-extension:.js=.compiled.js',
      ],
      { cwd: FACTORY, stdio: 'pipe' }
    )
  }, 120_000)

  // Сверяем все восемь: сборка уже оплачена beforeAll, а на сервере крутятся
  // они все — scheduler и analyst каждую ночь.
  it.each(ENTRIES.map((e) => e.replace(/\.ts$/, '')))(
    '%s.compiled.js собран из текущего исходника',
    (name) => {
      const fresh = fs.readFileSync(path.join(outdir, `${name}.compiled.js`), 'utf8')
      const committed = fs.readFileSync(path.join(FACTORY, `${name}.compiled.js`), 'utf8')
      expect(fresh).toBe(committed)
    }
  )
})
