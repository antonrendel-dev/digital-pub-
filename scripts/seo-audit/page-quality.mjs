// Прогон страниц d-pub.ru по трём чек-листам качества.
//
// Чек-листы собраны 01.09.2026 разбором сегментов трафика и лежат в памяти
// проекта (reference-page-quality-checklists). Здесь механическая часть:
// всё, что считается из mdx, из отрендеренной страницы и из датасета
// сегментации. Смысловые пункты — интент, честность сниппета, сила первого
// экрана — скрипт не решает, он только готовит для них почву.
//
// Usage:
//   node scripts/seo-audit/page-quality.mjs                 → полный прогон
//   node scripts/seo-audit/page-quality.mjs --only=articles → один сегмент
//   node scripts/seo-audit/page-quality.mjs --limit=5       → быстрая проверка
//
// На выходе: data/page-quality-<дата>.tsv (строка на страницу, колонка на
// пункт) и сводка в stdout.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const ARTICLES_DIR = path.join(ROOT, 'content/articles')
const OUT_DIR = path.join(HERE, 'data')
const SEGMENTATION = path.join(
  process.env.HOME,
  '.claude/skills/seo-data-sources/cache/pages-segmentation-2026-09-01.tsv',
)
const BASE = 'https://d-pub.ru'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)

// Слова-артефакты из пункта 2 чек-листа 1: обещание вещи, а не объяснения.
const ARTIFACT_WORDS =
  /образец|шаблон|пример|чек-?лист|вилк|площадк|цен[аыу]|список|подборк|таблиц|инструкц|разбор|сравнени/i

// ── источники ───────────────────────────────────────────────────────────────

function readSegmentation() {
  if (!fs.existsSync(SEGMENTATION)) return new Map()
  const lines = fs.readFileSync(SEGMENTATION, 'utf8').trim().split('\n')
  const head = lines[0].split('\t')
  const map = new Map()
  for (const line of lines.slice(1)) {
    const cells = line.split('\t')
    const row = Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']))
    map.set(row.path.replace(/\/$/, ''), row)
  }
  return map
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!m) return { data: {}, body: raw }
  const data = {}
  // Плоский разбор: значения в кавычках либо массив тегов. Вложенности во
  // фронтматтере статей нет, поэтому полноценный yaml не нужен.
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z]+):\s*(.*)$/)
    if (!kv) continue
    let v = kv[2].trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    data[kv[1]] = v
  }
  return { data, body: raw.slice(m[0].length) }
}

function readArticles() {
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf8')
      const { data, body } = parseFrontmatter(raw)
      return { slug: f.replace(/\.mdx$/, ''), data, body, raw }
    })
}

// ── измерения ───────────────────────────────────────────────────────────────

const words = (t) => t.split(/\s+/).filter(Boolean).length

function stripMarkup(body) {
  return body
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
}

// Где в тексте появляется обещанный артефакт: таблица, образец, пример.
// Пункт 5 третьего чек-листа — решающий, у лидеров он лежал на 94–98%.
function promisedPositionPct(body) {
  const plain = stripMarkup(body)
  const total = plain.length || 1
  const marks = []
  const table = body.search(/\n\|[^\n]*\|\n\|[\s:|-]+\|/)
  if (table > 0) marks.push(table)
  const heading = body.search(
    /^#{2,3}\s+[^\n]*(образец|шаблон|пример|чек-?лист|таблиц)/im,
  )
  if (heading > 0) marks.push(heading)
  if (!marks.length) return null
  return Math.round((Math.min(...marks) / total) * 100)
}

function firstInternalLinkPct(body) {
  const total = body.length || 1
  const i = body.search(/\]\(\/(?!images)/)
  return i < 0 ? null : Math.round((i / total) * 100)
}

// Пункт 2 третьего чек-листа: первый абзац отвечает, а не объясняет важность.
function firstParaIsDefinition(body) {
  const plain = stripMarkup(body).trim()
  const firstPara = plain.split(/\n\s*\n/).find((p) => p.trim().length > 60) ?? ''
  return /^[^.!?]{0,80}(—|-)\s*это\b/i.test(firstPara.trim())
}

function countTables(body) {
  return (body.match(/\n\|[^\n]*\|\n\|[\s:|-]+\|/g) ?? []).length
}

function outgoingInternal(body) {
  return (body.match(/\]\(\/(?!images)[^)]*\)/g) ?? []).length
}

function hasNumericRange(text) {
  return /\d[\d\s  ]*\s*(—|–|-|до)\s*\d/.test(text ?? '')
}

function sharedPrefix(title, description) {
  const a = (title ?? '').toLowerCase().split(/\s+/).slice(0, 4)
  const b = (description ?? '').toLowerCase().split(/\s+/).slice(0, 4)
  let n = 0
  while (n < a.length && a[n] === b[n]) n++
  return n
}

// ── живая страница ──────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'd-pub-page-quality/1.0' },
      redirect: 'follow',
    })
    const html = await res.text()
    return { status: res.status, html }
  } catch (e) {
    return { status: 0, html: '', error: String(e.message ?? e) }
  }
}

const pick = (html, re) => (html.match(re)?.[1] ?? '').trim()

function readRendered(html) {
  const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').trim(),
  )
  return {
    title: pick(html, /<title>([\s\S]*?)<\/title>/i),
    description: pick(html, /<meta name="description" content="([^"]*)"/i),
    h1: pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, '').trim(),
    h2,
    robots: pick(html, /<meta name="robots" content="([^"]*)"/i),
    hasFaqSchema: /"@type"\s*:\s*"FAQPage"/.test(html),
    tables: (html.match(/<table[\b>]/gi) ?? []).length,
  }
}

// ── правила ─────────────────────────────────────────────────────────────────

// Каждое правило возвращает true, когда пункт ПРОВАЛЕН. Так строки TSV читаются
// как список работ: где единица — там чинить.
function evaluate(page) {
  const t = page.title ?? ''
  const d = page.description ?? ''
  const f = {}

  // Чек-лист 1 — страница приводит людей
  f.l1_02_no_artifact_word = !ARTIFACT_WORDS.test(t)
  f.l1_03_no_digit = !/\d/.test(t)
  f.l1_04_title_long = t.length > 65
  f.l1_05_desc_len = d.length < 140 || d.length > 175
  f.l1_06_desc_no_range = !hasNumericRange(d)
  f.l1_07_few_tables = (page.tables ?? 0) < 3
  f.l1_08_no_faq = !page.hasFaq
  f.l1_09_orphan = page.incoming != null && page.incoming < 1
  f.l1_10_few_outgoing = page.outgoing != null && page.outgoing < 3
  f.l1_11_thin = page.words != null && page.words < 1500
  f.l1_12_stale = page.staleModified === true

  // Чек-лист 2 — сниппет, на который кликают
  f.l2_05_desc_echoes_title = sharedPrefix(t, d) >= 3
  f.l2_06_no_range_in_desc = f.l1_06_desc_no_range
  f.l2_07_no_source_date =
    !/(hh\.ru|Вордстат|Wordstat|Метрика|Росстат|202\d)/i.test(d)
  f.l2_09_desc_len = f.l1_05_desc_len

  // Чек-лист 3 — зашёл и остался
  f.l3_02_defines_instead_of_answers = page.firstParaDefinition === true
  f.l3_05_promise_buried =
    page.promisedPct != null ? page.promisedPct > 30 : null
  f.l3_11_first_link_late =
    page.firstLinkPct != null ? page.firstLinkPct > 33 : null
  f.l3_12_title_h2_mismatch = page.titleH2Mismatch === true

  return f
}

// ── сборка страниц ──────────────────────────────────────────────────────────

function articlePages(articles) {
  const incoming = new Map(articles.map((a) => [a.slug, 0]))
  for (const a of articles) {
    for (const m of a.body.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)) {
      if (incoming.has(m[1]) && m[1] !== a.slug) {
        incoming.set(m[1], incoming.get(m[1]) + 1)
      }
    }
  }

  return articles.map((a) => {
    const plain = stripMarkup(a.body)
    const modified = a.data.dateModified ?? a.data.publishedAt
    const ageDays = (Date.now() - Date.parse(modified)) / 86400000
    const h2s = [...a.body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim())
    const title = a.data.metaTitle || a.data.title
    return {
      url: `/articles/${a.slug}`,
      kind: 'статья',
      title,
      description: a.data.metaDescription || a.data.description,
      tables: countTables(a.body),
      hasFaq: Boolean(a.data.faqSchema),
      incoming: incoming.get(a.slug) ?? 0,
      outgoing: outgoingInternal(a.body),
      words: words(plain),
      staleModified: ageDays > 92,
      promisedPct: promisedPositionPct(a.body),
      firstLinkPct: firstInternalLinkPct(a.body),
      firstParaDefinition: firstParaIsDefinition(a.body),
      titleH2Mismatch: h2s.length
        ? !sharedWord(title, h2s[0])
        : true,
    }
  })
}

function sharedWord(a, b) {
  const norm = (s) =>
    (s ?? '')
      .toLowerCase()
      .replace(/[^а-яёa-z0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .map((w) => w.slice(0, 5))
  const A = new Set(norm(a))
  return norm(b).some((w) => A.has(w))
}

const TOOLS = [
  'tilda', 'figma', 'chatgpt', 'canva', 'midjourney', 'tablicy', 'capcut',
  'yandex-metrika', 'yandex-direct', 'bitrix24', 'semrush', 'vk-ads',
  'wordpress', 'photoshop', 'excel', 'notion', 'google-analytics',
  'screaming-frog',
]
const CATEGORIES = [
  'seo', 'marketing', 'copywriting', 'dizajn', 'content', 'target',
  'menedzher', 'razrabotka', 'smm', 'analitika', 'hr', 'wordpress',
  'finansy', 'kontekstnaya-reklama', 'kreativ',
]
const PROFESSIONS = [
  'rilsmeyker', 'ux-ui-dizayner', 'prodzhekt-menedzher', 'veb-dizayner',
  'biznes-assistent', 'montazher-video', 'prodyuser', 'stsenarist',
]
const FILTER_HUBS = ['udalyonka', 'ofis', 'gibrid', 'junior', 'middle', 'senior']
const RESUME_TAGS = ['udalyonka', 'ofis', 'senior', 'junior', 'gibrid', 'middle']
const HUBS = ['/', '/articles', '/vacancies', '/resumes']

function liveTargets() {
  const out = []
  for (const s of TOOLS) out.push({ url: `/tools/${s}`, kind: 'инструмент' })
  out.push({ url: '/tools', kind: 'инструмент' })
  for (const s of CATEGORIES) out.push({ url: `/vacancies/${s}`, kind: 'категория' })
  for (const s of PROFESSIONS) out.push({ url: `/professions/${s}`, kind: 'профессия' })
  out.push({ url: '/professions', kind: 'профессия' })
  for (const s of FILTER_HUBS) out.push({ url: `/vacancies/${s}`, kind: 'хаб фильтра' })
  for (const s of RESUME_TAGS) out.push({ url: `/resumes/tag/${s}`, kind: 'тег резюме' })
  for (const u of HUBS) out.push({ url: u, kind: 'хаб' })
  return out
}

// ── прогон ──────────────────────────────────────────────────────────────────

async function main() {
  const started = Date.now()
  const seg = readSegmentation()
  const articles = readArticles()

  let pages = []
  if (args.only !== 'live') pages.push(...articlePages(articles))
  if (args.only !== 'articles') pages.push(...liveTargets())
  if (args.limit) pages = pages.slice(0, Number(args.limit))

  console.log(`[page-quality] страниц в прогоне: ${pages.length}`)

  const rows = []
  let n = 0
  for (const page of pages) {
    n++
    const live = await fetchPage(BASE + page.url)
    const rendered = live.status === 200 ? readRendered(live.html) : null

    const merged = { ...page }
    if (rendered) {
      // Отрендеренная страница — источник истины для title и description:
      // у листингов они собираются в рантайме и во фронтматтере их нет.
      merged.title = rendered.title || merged.title
      merged.description = rendered.description || merged.description
      merged.hasFaq = merged.hasFaq ?? rendered.hasFaqSchema
      merged.tables = merged.tables ?? rendered.tables
      merged.robots = rendered.robots
      merged.h1 = rendered.h1
      if (merged.kind !== 'статья') {
        const plain = live.html
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
        merged.words = words(plain)
        merged.titleH2Mismatch = rendered.h2.length
          ? !sharedWord(merged.title, rendered.h2[0])
          : null
      }
    }
    merged.httpStatus = live.status

    const s = seg.get(page.url.replace(/\/$/, ''))
    merged.visits90 = s?.visits_90d ?? ''
    merged.gscImp90 = s?.gsc_imp_90d ?? ''
    merged.gscPos = s?.gsc_pos ?? ''

    const flags = evaluate(merged)
    rows.push({ ...merged, ...flags })

    if (n % 20 === 0) console.log(`[page-quality] ${n}/${pages.length}`)
    await new Promise((r) => setTimeout(r, 120))
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 10)
  const flagKeys = Object.keys(evaluate({}))
  const cols = [
    'url', 'kind', 'httpStatus', 'visits90', 'gscImp90', 'gscPos',
    'titleLen', 'descLen', 'words', 'tables', 'incoming', 'outgoing',
    'promisedPct', 'firstLinkPct', ...flagKeys,
  ]
  const tsv = [cols.join('\t')]
  for (const r of rows) {
    tsv.push(
      cols
        .map((c) => {
          if (c === 'titleLen') return (r.title ?? '').length
          if (c === 'descLen') return (r.description ?? '').length
          const v = r[c]
          if (v === true) return '1'
          if (v === false) return '0'
          return v ?? ''
        })
        .join('\t'),
    )
  }
  const outFile = path.join(OUT_DIR, `page-quality-${stamp}.tsv`)
  fs.writeFileSync(outFile, tsv.join('\n') + '\n')

  // ── сводка ────────────────────────────────────────────────────────────────
  const byKind = {}
  for (const r of rows) (byKind[r.kind] ??= []).push(r)

  console.log(`\n[page-quality] записано: ${outFile}`)
  console.log(`\nПРОВАЛЫ ПО ПУНКТАМ (страниц, где пункт не выполнен)\n`)
  for (const key of flagKeys) {
    const applicable = rows.filter((r) => r[key] !== null && r[key] !== undefined)
    const failed = applicable.filter((r) => r[key] === true)
    if (!applicable.length) continue
    console.log(
      `${key.padEnd(34)} ${String(failed.length).padStart(4)} / ${applicable.length}`,
    )
  }

  console.log(`\nПО ТИПАМ СТРАНИЦ\n`)
  for (const [kind, list] of Object.entries(byKind)) {
    const fails = list.map(
      (r) => flagKeys.filter((k) => r[k] === true).length,
    )
    const avg = (fails.reduce((a, b) => a + b, 0) / list.length).toFixed(1)
    const broken = list.filter((r) => r.httpStatus !== 200).length
    console.log(
      `${kind.padEnd(14)} страниц ${String(list.length).padStart(3)}  ` +
        `провалов в среднем ${avg}  не 200: ${broken}`,
    )
  }

  const secs = Math.round((Date.now() - started) / 1000)
  console.log(`\n[page-quality] готово за ${secs} c`)
}

main().catch((e) => {
  console.error('[page-quality] УПАЛ:', e)
  process.exit(1)
})
