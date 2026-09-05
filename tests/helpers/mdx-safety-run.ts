/**
 * Прогон валидатора MDX для jest: @mdx-js/mdx — ESM-only, ts-jest грузит
 * тесты как CJS, а tsx без "type": "module" тоже грузит lib как CJS. Поэтому
 * тест собирает этот файл esbuild-ом в ESM-бандл (как страж бандлов завода)
 * и запускает node. На вход
 * JSON [{ name, mdx }], на выход JSON { [name]: { issues, executable } },
 * где executable — есть ли в mdast настоящего компилятора исполняемые узлы.
 */
import fs from 'fs'
import { compileSync } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import { findUnsafeMdx } from '../../lib/mdx-safety'

type N = {
  type: string
  name?: string | null
  attributes?: { type: string; value?: { type?: string } | string | null }[]
  children?: N[]
}

function executable(body: string): boolean {
  let found = false
  const mark = () => (tree: N) => {
    const walk = (n: N) => {
      if (/^(mdxjsEsm|mdxFlowExpression|mdxTextExpression)$/.test(n.type)) found = true
      // Компонент с заглавной — ссылка на JS-идентификатор, рендер его исполняет.
      if (/^mdxJsx(Flow|Text)Element$/.test(n.type) && n.name && /^[A-Z]/.test(n.name)) found = true
      for (const a of n.attributes ?? []) {
        if (a.type === 'mdxJsxExpressionAttribute') found = true
        if (typeof a.value === 'object' && a.value?.type === 'mdxJsxAttributeValueExpression')
          found = true
      }
      for (const c of n.children ?? []) walk(c)
    }
    walk(tree)
  }
  try {
    compileSync({ value: body }, { format: 'mdx', remarkPlugins: [remarkGfm, mark] })
  } catch {
    return true // не компилируется — страница упала бы, тоже отказ
  }
  return found
}

const input = JSON.parse(fs.readFileSync(0, 'utf8')) as {
  name: string
  mdx: string
  body?: string
  frontmatter?: boolean
}[]
const out: Record<string, { issues: ReturnType<typeof findUnsafeMdx>; executable: boolean }> = {}
for (const { name, mdx, body, frontmatter } of input) {
  out[name] = {
    issues: findUnsafeMdx(mdx, { frontmatter: frontmatter ?? true }),
    executable: executable(body ?? mdx),
  }
}
process.stdout.write(JSON.stringify(out))
