// Наряд на переписку статьи: что править и под какой ключ.
//
// Сводит три источника в один список работ:
//   • целевой ключ из Топвизора и его частотность из Вордстата;
//   • вложенные фразы ключа — доказательство интента, а не одна цифра
//     (правило записано после разбора /tools: широкая частотность врёт);
//   • провалы по трём чек-листам из page-quality.
//
// Usage:
//   node scripts/seo-audit/rewrite-orders.mjs                 → все статьи
//   node scripts/seo-audit/rewrite-orders.mjs --ready         → только те,
//                                                               где ключ подтверждён
//   node scripts/seo-audit/rewrite-orders.mjs --slug=xxx      → одна статья

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const WORK = '/tmp/claude-1000'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)

const readJson = (p, fallback = {}) =>
  fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback

// ── источники ───────────────────────────────────────────────────────────────

const nested = readJson(path.join(WORK, 'wordstat-nested.json'))
const decision = readJson(path.join(WORK, 'decision.json'), { good: {}, weak: {}, pending: [] })

const qualityFile = fs
  .readdirSync(path.join(HERE, 'data'))
  .filter((f) => f.startsWith('page-quality-'))
  .sort()
  .pop()
const quality = new Map()
if (qualityFile) {
  const lines = fs
    .readFileSync(path.join(HERE, 'data', qualityFile), 'utf8')
    .trim()
    .split('\n')
  const head = lines[0].split('\t')
  for (const line of lines.slice(1)) {
    const cells = line.split('\t')
    const row = Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']))
    quality.set(row.url, row)
  }
}

// Читаемые названия пунктов — наряд должен быть понятен без сверки с кодом.
const RULE_NAMES = {
  l1_02_no_artifact_word: 'в title нет слова-артефакта',
  l1_03_no_digit: 'в title нет цифры или года',
  l1_04_title_long: 'title длиннее 65 знаков',
  l1_05_desc_len: 'description вне коридора 140-175',
  l1_06_desc_no_range: 'в description нет числовой вилки',
  l1_07_few_tables: 'меньше трёх таблиц',
  l1_08_no_faq: 'нет FAQ-разметки',
  l1_09_orphan: 'сирота: ноль входящих ссылок',
  l1_10_few_outgoing: 'меньше трёх исходящих ссылок',
  l1_11_thin: 'тоньше 1500 слов',
  l1_12_stale: 'дата обновления старше квартала',
  l2_05_desc_echoes_title: 'description повторяет начало title',
  l2_07_no_source_date: 'в description нет источника и даты',
  l3_05_promise_buried: 'обещанное лежит глубже 30% текста',
  l3_11_first_link_late: 'первая ссылка ниже трети текста',
  l3_12_title_h2_mismatch: 'title и первый H2 обещают разное',
}

// ── интент ──────────────────────────────────────────────────────────────────

// Одна цифра частотности ничего не доказывает: у «работа фотошоп» 4489 в месяц,
// и почти всё это ноутбуки и уроки. Смотрим, какая доля вложенных фраз
// действительно про то, о чём статья.
// Корни, а не словоформы: «работа» не совпадает с «работу», и на этом
// классификатор уже один раз соврал, объявив чужим запрос «где искать работу».
const JOB_INTENT =
  /ваканс|работ|зарплат|оклад|резюме|собеседован|наня|найм|нанима|стажиров|фриланс|портфолио|навык|обязанност|професс|специалист|сколько (зараба|плат|получ)|кто так|кто это|чем занима|с нуля|без опыта|курс|обучен|требован|доход|ставк/i

function intentOf(key) {
  const rec = nested[key]
  if (!rec || !rec.nested?.length) return null
  const total = rec.nested.reduce((s, n) => s + n.count, 0) || 1
  const matched = rec.nested
    .filter((n) => JOB_INTENT.test(n.phrase))
    .reduce((s, n) => s + n.count, 0)
  const share = Math.round((matched / total) * 100)
  const foreign = rec.nested
    .filter((n) => !JOB_INTENT.test(n.phrase))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
  return { share, volume: rec.volume, foreign, top: rec.nested.slice(0, 3) }
}

// ── сборка ──────────────────────────────────────────────────────────────────

const orders = []
for (const [slug, [key, volume]] of Object.entries(decision.good ?? {})) {
  const url = `/articles/${slug}`
  const row = quality.get(url) ?? {}
  const failed = Object.keys(RULE_NAMES).filter((k) => row[k] === '1')
  const intent = intentOf(key)
  orders.push({
    slug,
    key,
    volume,
    intent,
    verdict:
      intent === null
        ? 'ждёт проверки интента'
        : intent.share >= 50
          ? 'брать'
          : intent.share >= 25
            ? 'сомнительный — сверить выдачу'
            : 'отклонить: интент чужой',
    failed,
    visits: row.visits90 ?? '',
    imp: row.gscImp90 ?? '',
    pos: row.gscPos ?? '',
  })
}

let list = orders
if (args.slug) list = list.filter((o) => o.slug === args.slug)
if (args.ready) list = list.filter((o) => o.verdict === 'брать')

list.sort((a, b) => Number(b.imp || 0) - Number(a.imp || 0))

const outFile = path.join(HERE, 'data', 'rewrite-orders.json')
fs.writeFileSync(outFile, JSON.stringify(list, null, 2))

const byVerdict = {}
for (const o of orders) byVerdict[o.verdict] = (byVerdict[o.verdict] ?? 0) + 1
console.log('ВЕРДИКТЫ ПО КЛЮЧАМ\n')
for (const [v, n] of Object.entries(byVerdict)) console.log(`${String(n).padStart(4)}  ${v}`)

console.log(`\nНАРЯДЫ (${list.length}), по убыванию показов\n`)
for (const o of list.slice(0, Number(args.limit ?? 20))) {
  const intent = o.intent ? `интент ${o.intent.share}%` : 'интент ?'
  console.log(
    `${String(o.imp || 0).padStart(6)} показов  ${String(o.volume).padStart(6)}/мес  ` +
      `${intent.padEnd(12)}  ${o.key.slice(0, 30).padEnd(30)}  ${o.slug.slice(0, 40)}`,
  )
  if (o.failed.length) {
    console.log(`        чинить: ${o.failed.map((f) => RULE_NAMES[f]).join('; ')}`)
  }
}
console.log(`\nзаписано: ${outFile}`)
