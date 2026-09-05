/**
 * Валидатор MDX перед автопушем завода (S17, аудит 04.09.2026).
 *
 * Цепочка без человека: выдача и LSI попадают в промпт → модель пишет MDX →
 * writer делает git push в main → CI деплоит → next-mdx-remote/rsc исполняет
 * выражения `{…}` на сервере. `mdxComponents` на странице режет script/iframe,
 * но выражение в фигурных скобках — это код, а не тег.
 *
 * Что исполняется, решает парсер MDX, поэтому и проверка идёт по его дереву,
 * а не по регэкспам: первая версия на регэкспах (04.09) пропускала
 * `style={process.env}`, spread-атрибут и бэктик внутри тега (ревью S17).
 * Здесь текст компилируется тем же `@mdx-js/mdx` с remark-gfm, что и
 * страница, и в mdast запрещено всё, кроме обычного Markdown и `<img>` со
 * строковыми атрибутами из списка и `style={{…}}` из фиксированного набора
 * свойств. Ошибка компиляции — тоже отказ: такая статья уронила бы страницу.
 */
import { compileSync } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'

export interface MdxSafetyIssue {
  rule: string
  detail: string
  line: number
}

const IMG_ALLOWED_ATTRS = new Set(['src', 'alt', 'style', 'width', 'height', 'loading'])
const IMG_SRC = /^(?:\/images\/[a-z0-9/_.-]+|https:\/\/[^\s"'<>]+)$/i
const STYLE_PROP =
  '(?:width|maxWidth|height|maxHeight|borderRadius|margin|marginTop|marginBottom|display)'
const STYLE_VALUE = "'[0-9a-z%. ]{1,40}'"
/** Значение выражения style без внешних скобок: `{width: '100%', …}`. */
const STYLE_OBJECT = new RegExp(
  `^\\{\\s*${STYLE_PROP}:\\s*${STYLE_VALUE}(?:\\s*,\\s*${STYLE_PROP}:\\s*${STYLE_VALUE}){0,7}\\s*,?\\s*\\}$`
)
/** Схема ссылки после снятия управляющих символов: javascript:, data:, vbscript: — отказ. */
const BAD_SCHEME = /^(?:javascript|data|vbscript):/i

interface Node {
  type: string
  name?: string | null
  value?: string
  url?: string
  attributes?: Attr[]
  children?: Node[]
  position?: { start: { line: number } }
}
interface Attr {
  type: string
  name?: string
  value?: string | { type: string; value: string } | null
}

export interface MdxSafetyOptions {
  /**
   * Есть ли у входа frontmatter. Для тела статьи без него (writer до сборки
   * файла, boost) — false: иначе тело, начинающееся с `---`, «снималось» бы
   * как frontmatter вместе с выражением внутри (ревью S17, круг 2).
   */
  frontmatter?: boolean
}

/** Frontmatter — только с первого символа и до строки `---`; иначе тело не трогаем. */
function splitFrontmatter(mdx: string, expected: boolean): { body: string; offset: number } {
  if (!expected) return { body: mdx, offset: 0 }
  const m = /^---\n[\s\S]*?\n---\n?/.exec(mdx)
  if (!m) return { body: mdx, offset: 0 }
  return { body: mdx.slice(m[0].length), offset: m[0].split('\n').length - 1 }
}

function badScheme(url: string): boolean {
  // Entity уже раскрыты парсером; управляющие символы и пробелы внутри слова снимаем.
  return BAD_SCHEME.test(url.replace(/[\x00-\x20]/g, ''))
}

function walk(node: Node, offset: number, issues: MdxSafetyIssue[]): void {
  const line = (node.position?.start.line ?? 0) + offset
  const push = (rule: string, detail: string) => issues.push({ rule, detail, line })
  const short = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 80)

  switch (node.type) {
    case 'mdxjsEsm':
      push('import/export', short(node.value ?? ''))
      break
    case 'mdxFlowExpression':
    case 'mdxTextExpression':
      push('выражение в фигурных скобках', `{${short(node.value ?? '')}}`)
      break
    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement':
      checkJsx(node, push, short)
      break
    case 'link':
    case 'definition':
    case 'image':
      if (node.url && badScheme(node.url)) push('опасная схема в ссылке', short(node.url))
      if (node.type === 'image' && node.url && !IMG_SRC.test(node.url)) {
        push('src картинки вне /images/ и https', short(node.url))
      }
      break
    case 'html':
      // В формате mdx сырого html не бывает; на всякий случай — отказ.
      push('сырой HTML', short(node.value ?? ''))
      break
  }
  for (const child of node.children ?? []) walk(child, offset, issues)
}

function checkJsx(
  node: Node,
  push: (rule: string, detail: string) => void,
  short: (s: string) => string
): void {
  if (node.name !== 'img') {
    push('JSX-элемент вне списка', node.name ? `<${node.name}>` : 'фрагмент <>')
    return
  }
  for (const attr of node.attributes ?? []) {
    if (attr.type !== 'mdxJsxAttribute' || !attr.name) {
      push('spread-атрибут img', short(String(attr.value ?? '{...}')))
      continue
    }
    if (!IMG_ALLOWED_ATTRS.has(attr.name)) {
      push('атрибут img вне списка', `${attr.name}=…`)
      continue
    }
    const v = attr.value
    if (attr.name === 'style') {
      const expr = typeof v === 'object' && v ? v.value : null
      if (expr === null || !STYLE_OBJECT.test(expr.trim())) {
        push('style картинки вне шаблона', short(typeof v === 'string' ? v : (expr ?? '')))
      }
      continue
    }
    if (v === null || v === undefined) {
      push('булев атрибут img без значения', attr.name)
      continue
    }
    if (typeof v !== 'string') {
      push('выражение в атрибуте img', `${attr.name}={${short(v.value)}}`)
      continue
    }
    if (attr.name === 'src' && !IMG_SRC.test(v)) push('src картинки вне /images/ и https', short(v))
  }
}

export function findUnsafeMdx(mdx: string, opts: MdxSafetyOptions = {}): MdxSafetyIssue[] {
  const issues: MdxSafetyIssue[] = []
  const { body, offset } = splitFrontmatter(mdx.replace(/\r\n/g, '\n'), opts.frontmatter ?? true)
  const inspect = () => (tree: Node) => walk(tree, offset, issues)
  try {
    compileSync({ value: body }, { format: 'mdx', remarkPlugins: [remarkGfm, inspect] })
  } catch (e) {
    const err = e as Error & { line?: number; place?: { line?: number; start?: { line: number } } }
    const line = err.line ?? err.place?.line ?? err.place?.start?.line ?? 0
    issues.push({
      rule: 'MDX не компилируется',
      detail: err.message.replace(/\s+/g, ' ').slice(0, 120),
      line: line + offset,
    })
  }
  return issues
}

/** Бросает Error со списком находок: вызывающий пишет в лог и не коммитит. */
export function assertSafeMdx(mdx: string, label = 'MDX', opts: MdxSafetyOptions = {}): void {
  const issues = findUnsafeMdx(mdx, opts)
  if (issues.length === 0) return
  throw new Error(
    `${label}: небезопасная разметка, публикация остановлена:\n` +
      issues.map((i) => `• строка ${i.line}, ${i.rule}: ${i.detail}`).join('\n')
  )
}
