import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

/**
 * Валидатор MDX (lib/mdx-safety.ts) проверяется через настоящий компилятор:
 * @mdx-js/mdx — ESM-only и в jest (CJS) не грузится, поэтому все пробы и
 * статьи каталога прогоняются одним подпроцессом tsx (tests/helpers/mdx-safety-run.ts).
 */
const ROOT = path.join(__dirname, '../..')
const FM = `---\ntitle: "x"\nfaqSchema: '[{"question":"a","answer":"b"}]'\nschemaJsonLd: '{"@context":"https://schema.org"}'\n---\n\n`
const IMG = `<img src="/images/posts/rezyume-bez-opyta-raboty-obrazec-chart1.png" alt="Динамика, по данным hh.ru" style={{width: '100%', maxWidth: '700px', borderRadius: '8px', margin: '20px 0'}} />`
const GOOD = `${FM}Крючок.\n\n## Раздел\n\nТекст с \\{экранированной\\} скобкой.\n\n${IMG}\n\n| а | б |\n|---|---|\n| 1 | 2 |\n\n\`\`\`js\nconst x = {a: 1}\n\`\`\`\n\n~~~\n{тоже код}\n~~~\n\nИнлайн \`{code}\` тоже можно.\n`

/** Пробы-обходы из ревью S17: каждая компилируется настоящим MDX в код — валидатор обязан отклонить. */
const EXPLOITS: Record<string, string> = {
  'style с одинарной скобкой': `<img src="/images/posts/a.png" alt="a" style={globalThis.process.env} />`,
  'spread-атрибут': `<img {...(globalThis.__x = process.env)} src="/images/posts/a.png" alt="a" />`,
  'src выражением': `<img src={process.env.PAYLOAD_SECRET} alt="a" />`,
  'бэктик внутри тега': `<img src="/images/posts/a.png" alt="\`" onerror="alert(1)" style={process.env} title="\`" />`,
  'fence не с начала строки': `Абзац \`\`\` x\n{process.env.PAYLOAD_SECRET}\n\`\`\` y`,
  'выражение в тексте': `Цена {(() => 1)()} рублей.`,
  'блочное выражение': `{process.env}`,
  import: `import x from 'y'\n\n## Р`,
  export: `export const a = 1`,
  'JSX-компонент': `<Evil />`,
  'div с выражением': `<div>{x}</div>`,
  фрагмент: `<>{x}</>`,
  'href выражением': `<a href={x}>y</a>`,
}

const CASES: Record<string, string> = {
  good: GOOD,
  'line-lf': `${FM}Крючок.\n\n## Раздел\n\nЦена {(() => 1)()} рублей.\n`,
  'line-crlf': `${FM}Крючок.\n\n## Раздел\n\nЦена {(() => 1)()} рублей.\n`.replace(/\n/g, '\r\n'),
  'img-https': `${FM}<img src="https://cdn.example.com/a.png" alt="a" />`,
  'img-http': `${FM}<img src="http://evil/a.png" alt="a" />`,
  'img-rel': `${FM}<img src="../x.png" alt="a" />`,
  'img-srcset': `${FM}<img src="/images/a.png" alt="a" srcset="x" />`,
  'img-onerror': `${FM}<img src="/images/a.png" alt="a" onerror="alert(1)" />`,
  'img-style-color': `${FM}<img src="/images/a.png" alt="a" style={{color: 'red'}} />`,
  'img-style-string': `${FM}<img src="/images/a.png" alt="a" style="color:red" />`,
  script: `${FM}<script>alert(1)</script>`,
  svg: `${FM}<svg onload="x"></svg>`,
  'link-js': `${FM}[клик](javascript:alert(1))`,
  'link-js-tab': `${FM}[клик](<java\tscript:alert(1)>)`,
  'def-js': `${FM}[x]: javascript:alert(1)\n\n[клик][x]`,
  'image-data': `${FM}![a](data:text/html,x)`,
  'links-ok': `${FM}[ок](https://d-pub.ru/vacancies) и [свой](/tools/excel)`,
  'brace-literal': `${FM}Скобка { в тексте`,
  'html-comment': `${FM}<!-- {x} -->`,
  'img-boolean-attr': `${FM}<img src="/images/a.png" alt="a" loading />`,
}
/** Тело без frontmatter, начинающееся с горизонтальной черты: снимать «frontmatter» нельзя. */
const BODY_HR = `---\nabc\n{process.env}\n---\n`

type Result = { issues: { rule: string; detail: string; line: number }[]; executable: boolean }
let out: Record<string, Result>

beforeAll(() => {
  const dir = path.join(ROOT, 'content/articles')
  const articles = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => ({ name: `article:${f}`, mdx: fs.readFileSync(path.join(dir, f), 'utf8') }))
  const input = [
    ...Object.entries(CASES).map(([name, mdx]) => ({ name, mdx })),
    ...Object.entries(EXPLOITS).map(([name, body]) => ({
      name: `exploit:${name}`,
      mdx: `${FM}${body}\n`,
      body,
    })),
    { name: 'body-hr-as-body', mdx: BODY_HR, frontmatter: false },
    { name: 'body-hr-with-fm', mdx: `${FM}${BODY_HR}` },
    ...articles,
  ]
  // @mdx-js/mdx — ESM-only: помощник собирается esbuild-ом в ESM и запускается node,
  // как страж бандлов завода в boost-runner.test.ts.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdx-safety-'))
  const bundle = path.join(tmp, 'run.mjs')
  execFileSync(
    'npx',
    [
      'esbuild',
      path.join(__dirname, '../helpers/mdx-safety-run.ts'),
      '--bundle',
      '--platform=node',
      '--format=esm',
      '--log-level=error',
      `--outfile=${bundle}`,
    ],
    { cwd: ROOT, encoding: 'utf8', timeout: 120_000 }
  )
  const inputFile = path.join(tmp, 'input.json')
  fs.writeFileSync(inputFile, JSON.stringify(input))
  const raw = execFileSync('node', [bundle, inputFile], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 180_000,
  })
  out = JSON.parse(raw)
}, 200_000)

const rules = (name: string) => out[name].issues.map((i) => i.rule)

describe('findUnsafeMdx — валидатор против компилятора', () => {
  it('легитимная статья: картинка по шаблону, таблица, оба вида fence, \\{ и inline-code', () => {
    expect(out.good.issues).toEqual([])
  })

  it.each(Object.keys(EXPLOITS))('обход «%s» компилируется в код и отклоняется', (name) => {
    expect(out[`exploit:${name}`].executable).toBe(true)
    expect(out[`exploit:${name}`].issues.length).toBeGreaterThan(0)
  })

  it('номер строки считается после frontmatter, CRLF не сдвигает', () => {
    expect(out['line-lf'].issues[0].rule).toBe('выражение в фигурных скобках')
    expect(out['line-lf'].issues[0].line).toBe(11)
    expect(out['line-crlf'].issues[0].line).toBe(11)
  })

  it('img: чужой src, чужой атрибут, style вне шаблона, опасные теги', () => {
    expect(rules('img-https')).toEqual([])
    expect(rules('img-http')).toContain('src картинки вне /images/ и https')
    expect(rules('img-rel')).toContain('src картинки вне /images/ и https')
    expect(rules('img-srcset')).toContain('атрибут img вне списка')
    expect(rules('img-onerror')).toContain('атрибут img вне списка')
    expect(rules('img-style-color')).toContain('style картинки вне шаблона')
    expect(rules('img-style-string')).toContain('style картинки вне шаблона')
    expect(rules('script')).toContain('JSX-элемент вне списка')
    expect(rules('svg')).toContain('JSX-элемент вне списка')
  })

  it('javascript:/data: в ссылках и картинках — отказ, включая табуляцию внутри схемы; обычные ссылки проходят', () => {
    expect(rules('link-js')).toContain('опасная схема в ссылке')
    expect(rules('link-js-tab')).toContain('опасная схема в ссылке')
    expect(rules('def-js')).toContain('опасная схема в ссылке')
    expect(rules('image-data')).toContain('опасная схема в ссылке')
    expect(rules('links-ok')).toEqual([])
  })

  it('тело без frontmatter, начинающееся с ---, проверяется целиком (frontmatter: false)', () => {
    expect(out['body-hr-as-body'].executable).toBe(true)
    expect(rules('body-hr-as-body')).toContain('выражение в фигурных скобках')
    expect(rules('body-hr-with-fm')).toContain('выражение в фигурных скобках')
    expect(rules('img-boolean-attr')).toContain('булев атрибут img без значения')
  })

  it('@mdx-js/mdx объявлен в зависимостях и совпадает с экземпляром next-mdx-remote', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    expect(pkg.dependencies['@mdx-js/mdx']).toBeDefined()
    // Один hoisted-экземпляр: у next-mdx-remote нет вложенной копии другой версии.
    const hoisted = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'node_modules/@mdx-js/mdx/package.json'), 'utf8')
    )
    expect(hoisted.version).toMatch(/^3\./)
    expect(
      fs.existsSync(path.join(ROOT, 'node_modules/next-mdx-remote/node_modules/@mdx-js/mdx'))
    ).toBe(false)
  })

  it('литерал { в тексте и HTML-комментарий не компилируются — отказ с текстом ошибки', () => {
    expect(rules('brace-literal')).toContain('MDX не компилируется')
    expect(rules('html-comment')).toContain('MDX не компилируется')
  })
})

describe('валидатор стоит перед записью MDX во всех трёх скриптах завода', () => {
  const src = (f: string) => fs.readFileSync(path.join(ROOT, 'scripts/content-factory', f), 'utf8')

  it.each([
    [
      'writer.ts',
      /assertSafeMdx\(mdxContent, `writer \$\{result\.slug\}`\)[\s\S]*?fs\.writeFileSync\(path\.join\(ARTICLES_DIR/,
    ],
    ['boost.ts', /assertSafeMdx\(updated, `boost [\s\S]*?fs\.writeFileSync\(file, updated\)/],
    [
      'regen.ts',
      /assertSafeMdx\(updatedMdx, `regen \$\{slug\}`\)[\s\S]*?fs\.writeFileSync\(mdxPath, updatedMdx\)/,
    ],
  ])('%s: assertSafeMdx до writeFileSync', (file, re) => {
    expect(src(file)).toMatch(re)
  })

  it('writer проверяет текст до генерации картинок, regen — до обложки, boost кладёт находки в общий список', () => {
    const w = src('writer.ts')
    expect(w.indexOf('assertSafeMdx(result.markdown')).toBeGreaterThan(-1)
    expect(w.indexOf('assertSafeMdx(result.markdown')).toBeLessThan(w.indexOf('Шаг 5а + 5б'))
    const r = src('regen.ts')
    expect(r.indexOf('assertSafeMdx(mdxContent')).toBeGreaterThan(-1)
    expect(r.indexOf('assertSafeMdx(mdxContent')).toBeLessThan(r.indexOf('await generateImage('))
    expect(w).toMatch(/assertSafeMdx\(\s*result\.markdown,[\s\S]{0,120}?\{ frontmatter: false \}/)
    expect(src('boost.ts')).toMatch(/findUnsafeMdx\(next, \{ frontmatter: false \}\)/)
  })

  it('assertSafeMdx бросает со списком находок и меткой (по исходнику)', () => {
    const lib = fs.readFileSync(path.join(ROOT, 'lib/mdx-safety.ts'), 'utf8')
    expect(lib).toMatch(/throw new Error\(\s*`\$\{label\}: небезопасная разметка/)
  })
})

describe('все статьи каталога проходят валидатор', () => {
  it('статьи нашлись и ни одна не отклонена', () => {
    const names = Object.keys(out).filter((n) => n.startsWith('article:'))
    expect(names.length).toBeGreaterThan(50)
    const failed = names
      .filter((n) => out[n].issues.length > 0)
      .map((n) => `${n}: ${JSON.stringify(out[n].issues)}`)
    expect(failed).toEqual([])
  })
})
