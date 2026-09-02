/**
 * Дожим статей, стоящих в 11–30.
 *
 * Ключи этого коридора уже закреплены за страницами, поэтому новой статьёй тут
 * ничего не решается — вторая страница на тот же запрос даст каннибализацию.
 * Работать надо с существующим телом, а инструмента для этого в заводе не было:
 * regen.ts вопреки названию перегенерирует только картинки.
 *
 * Что делает: берёт кандидатов из выгрузки Топвизора, просит писателя усилить
 * статью под её ключ, принимает результат по формальным признакам и по тому же
 * гейту метаданных, что стоит на публикации. Не принял — файл не трогается.
 *
 *   node boost.compiled.js --input=/tmp/range.tsv --dry-run   план без вызовов модели
 *   node boost.compiled.js --input=/tmp/range.tsv --limit=1   один заход
 *   node boost.compiled.js --slug=rezyume-targetologa --key="резюме таргетолога"
 *
 * Вход — TSV из трёх колонок: ключ, позиция, целевой URL. Топвизор своей
 * выгрузкой (`topvisor.mjs --range=11-30 --tsv`) отдаёт только позицию и ключ,
 * целевые URL лежат в поле target и тянутся отдельным запросом к API — поэтому
 * вход готовится скриптом рядом со скиллом, а завод к Топвизору не ходит и его
 * ключей не хранит.
 */

import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { askAgent } from './lib/ask-agent.js'
import { modelFor } from './lib/model.js'
import {
  parseRows,
  selectCandidates,
  validateRewrite,
  type BoostCandidate,
} from './lib/boost-plan.js'
import { checkArticleMetadata, normalizeFaqHeading } from '../../lib/article-metadata-gate'
import { faqSchemaLine } from '../../lib/faq-schema'
import { hasServiceText, stripServiceTail } from '../../lib/strip-service-tail'

const ARTICLES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'content',
  'articles'
)

interface Args {
  input?: string
  slug?: string
  key?: string
  limit: number
  dryRun: boolean
}

/** Опечатка в --limit раньше давала slice(0, NaN) и «кандидатов нет» с кодом 0. */
function parseLimit(raw: string | undefined): number {
  if (raw === undefined) return 3
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) {
    console.error(`--limit должен быть целым числом от 1, получено «${raw}»`)
    process.exit(2)
  }
  return n
}

function parseArgs(argv: string[]): Args {
  const get = (name: string) =>
    argv
      .find((a) => a.startsWith(`--${name}=`))
      ?.split('=')
      .slice(1)
      .join('=')
  return {
    input: get('input'),
    slug: get('slug'),
    key: get('key'),
    limit: parseLimit(get('limit')),
    dryRun: argv.includes('--dry-run'),
  }
}

function buildPrompt(key: string, position: number, title: string, body: string): string {
  // В ручном режиме позиции нет, и врать модели «позиция 0» нельзя.
  const where = position
    ? `Статья уже стоит на позиции ${position} по ключу «${key}» в Яндексе. Это ближе к топ-10, чем большинство наших страниц, поэтому задача — не переписать её заново, а усилить под этот ключ.`
    : `Статью нужно усилить под ключ «${key}», не переписывая заново.`
  return `${where}

ОБЯЗАТЕЛЬНО применяй скилл dpub-content-standard: правки принимаются по нему.

ЧТО НУЖНО:
- ключ «${key}» должен стоять буквально в одном из H2 или в первых 60 словах;
- объём не уменьшать: статья уже ранжируется, терять ей есть что;
- заголовки не выбрасывать, раздел вопросов сохранить;
- добавить недостающее по стандарту: атомарный ответ в начале блоков, таблицу, если её нет, закрыть ось, которой не хватает;
- новых чисел не выдумывать. Разрешено только то, что уже есть в тексте, либо отраслевая норма с явной атрибуцией.

ЗАГОЛОВОК СТАТЬИ: ${title}

ТЕКУЩЕЕ ТЕЛО:
${body}

Верни ТОЛЬКО исправленный Markdown тела статьи — без frontmatter, без пояснений, без списка правок.`
}

async function boostOne(c: BoostCandidate, dryRun: boolean): Promise<string> {
  const file = path.join(ARTICLES_DIR, `${c.slug}.mdx`)
  if (!fs.existsSync(file)) return `${c.slug}: файла нет, пропуск`

  const raw = fs.readFileSync(file, 'utf8')
  const { frontmatter, body } = splitMdx(raw)
  const title = field(frontmatter, 'metaTitle') || field(frontmatter, 'title')

  if (dryRun) {
    const w = body.split(/\s+/).filter(Boolean).length
    return `${c.slug}: поз. ${c.position}, ключ «${c.key}», сейчас ${w} слов — взял бы в работу`
  }

  const answer = await askAgent(buildPrompt(c.key, c.position, title, body), {
    agent: 'writer',
    modelFor,
  })
  // Преамбулу режем по началу строки, а не по подстроке: «### Что изменено»
  // содержит «## » внутри, и первый вариант резал по середине решётки.
  // Хвост приёмки («Title: …», «Скиллы: …») срезаем тем же кодом, что и на
  // публикации — первый боевой прогон приклеил его прямо в тело статьи.
  const next = normalizeFaqHeading(stripServiceTail(stripPreamble(answer)))

  const problems = validateRewrite(body, next, c.key)
  const meta = checkArticleMetadata({
    metaTitle: field(frontmatter, 'metaTitle') || field(frontmatter, 'title'),
    metaDescription: field(frontmatter, 'metaDescription') || field(frontmatter, 'description'),
    markdown: next,
  })
  const all = [...problems, ...meta]
  // Если срезалка хвост не узнала, лучше не принять, чем выпустить служебный
  // текст на сайт: формулировки хвоста меняются вместе с профилями агентов.
  if (hasServiceText(next)) {
    all.push({ rule: 'SERVICE_TEXT', detail: 'в теле остался служебный хвост приёмки' })
  }
  if (all.length) {
    // Отклонённый текст сохраняем: без него «не принято» — это приговор без
    // дела. Разобрать, ошиблась модель или придирается проверка, можно только
    // по самому ответу.
    const dump = path.join(os.tmpdir(), `boost-rejected-${c.slug}.md`)
    fs.writeFileSync(dump, next)
    return (
      `${c.slug}: НЕ ПРИНЯТО — ${all.map((p) => `${p.rule} (${p.detail})`).join('; ')}` +
      `\n[boost] ответ модели сохранён: ${dump}`
    )
  }

  // faqSchema пересобираем из нового тела: разметка, отставшая от текста, —
  // обещание поисковику того, чего на странице нет.
  const fmWithoutFaq = frontmatter
    .replace(/^faqSchema: '.*'$/m, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
  const line = faqSchemaLine(next).replace(/^\n/, '')
  fs.writeFileSync(file, `---\n${fmWithoutFaq}\n${line}\n---\n${next}`)

  const wBefore = body.split(/\s+/).filter(Boolean).length
  const wAfter = next.split(/\s+/).filter(Boolean).length
  return `${c.slug}: принято, ${wBefore} → ${wAfter} слов, ключ «${c.key}» (поз. ${c.position})`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  let candidates: BoostCandidate[] = []
  if (args.slug && args.key) {
    if (!/^[a-z0-9-]+$/.test(args.slug)) {
      console.error(`--slug должен быть слагом статьи, получено «${args.slug}»`)
      process.exit(2)
    }
    candidates = [{ slug: args.slug, key: args.key, position: 0, url: `/articles/${args.slug}` }]
  } else if (args.input) {
    const { take, skip } = selectCandidates(parseRows(fs.readFileSync(args.input, 'utf8')))
    candidates = take.slice(0, args.limit)
    // Пропущенные называем поимённо: молчаливое сокращение списка читается как
    // «сделано всё», а это ровно то, из-за чего задачи считались закрытыми.
    for (const s of skip) console.log(`[boost] пропуск: «${s.key}» поз. ${s.position} — ${s.why}`)
    if (take.length > candidates.length) {
      console.log(`[boost] в работу взято ${candidates.length} из ${take.length} (--limit)`)
    }
  } else {
    console.error('Нужен либо --input=файл.tsv, либо пара --slug= и --key=')
    process.exit(2)
  }

  if (!candidates.length) {
    console.log('[boost] кандидатов нет')
    return
  }

  // Осечка модели на одном кандидате не должна снимать остальных: до неё
  // askAgent тратит четыре попытки и до семи минут пауз, и терять из-за этого
  // ещё двоих — расточительство.
  let failed = 0
  for (const c of candidates) {
    console.log(`[boost] ${c.slug}: ключ «${c.key}», позиция ${c.position}`)
    try {
      console.log(`[boost] ${await boostOne(c, args.dryRun)}`)
    } catch (e) {
      failed++
      console.error(`[boost] ${c.slug}: сорвалось — ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  if (failed) {
    console.error(`[boost] сорвалось кандидатов: ${failed} из ${candidates.length}`)
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error('[boost] Ошибка:', e)
  process.exit(1)
})
