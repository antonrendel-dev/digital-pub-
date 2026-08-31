// Фаза 2: сравнить два последних снапшота, собрать алерты, отрендерить и отправить.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import {
  PER_GROUP,
  TOP_POSITION,
  displayShare,
  groupArticles,
  isRead,
} from './articles.compiled.mjs'
import { bestPositionByPage } from './lib/sources.mjs'
import { readArticleLengths } from './lib/articles.mjs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { escapeHtml, sendDocument, sendLongMessage } from './lib/telegram.mjs'

const BASE_DIR = dirname(fileURLToPath(import.meta.url))
const SNAPSHOT_DIR = join(BASE_DIR, 'data', 'snapshots')
const EXPORT_DIR = join(BASE_DIR, 'data', 'exports')

// Пороги согласованы с SEO-агентом на базовых линиях 18.08.2026
// (топ-3 = 24, топ-10 = 45, показы Вебмастера 349/нед, визиты из поиска 41 за 14 дн).
const T = {
  top10DropP0: 5,
  top30DropP1: 8,
  showsDropPctP0: 25,
  searchVisitsMinP1: 15,
  bounceRateMaxP1: 40,
  zeroClickShowsP2: 50,
}

export function loadSnapshots() {
  const files = readdirSync(SNAPSHOT_DIR)
    .filter((f) => f.startsWith('seo_') && f.endsWith('.json'))
    .sort()
  const read = (f) => JSON.parse(readFileSync(join(SNAPSHOT_DIR, f), 'utf8'))
  return {
    current: files.length ? read(files.at(-1)) : null,
    previous: files.length > 1 ? read(files.at(-2)) : null,
  }
}

const ok = (section) => section?.ok === true
const data = (section) => section?.data

// Вебмастер подмешивает запросы, не относящиеся к сайту (чужие бренды, VPN, случайный
// шум молодого домена). В рекомендации и алерты пускаем только профильные.
const RELEVANT = ['вакан', 'работ', 'удал', 'зарплат', 'резюме', 'портфолио', 'фриланс', 'найм', 'наня', 'соискат', 'digital', 'диджитал', 'маркетолог', 'маркетинг', 'дизайн', 'smm', 'смм', 'таргет', 'копирайт', 'аналитик', 'контент', 'специалист', 'менеджер', 'директ', 'собеседов', 'стажер', 'стажёр', 'd-pub', 'паб']
const SPAM = /https?:|www\.|\S+\.(ru|su|com|net|org|io|me|ai|рф)\b/i
// Чужие бренды, пролезающие через общие слова («менеджер уведомлений evatelecom»).
// Список пополняется по мере появления мусора в Вебмастере.
const BRAND_NOISE = ['evatelecom', 'midas', 'vpn', 'orlov', 'vector ads']

const isRelevant = (query) => {
  const q = query.toLowerCase()
  if (SPAM.test(q) || BRAND_NOISE.some((b) => q.includes(b))) return false
  return RELEVANT.some((t) => q.includes(t))
}

const plural = (n, forms) => {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (last > 1 && last < 5) return forms[1]
  if (last === 1) return forms[0]
  return forms[2]
}

function pctChange(cur, prev) {
  if (!prev) return null
  return Math.round(((cur - prev) / prev) * 100)
}

function fmtDelta(delta) {
  if (delta === null || delta === undefined) return ''
  if (delta === 0) return ' (=)'
  return delta > 0 ? ` (+${delta})` : ` (${delta})`
}

export const zeroClickQueries = (current) =>
  (data(current.webmaster)?.queries ?? [])
    .filter((q) => q.shows > 0 && q.clicks === 0 && isRelevant(q.query))
    .sort((a, b) => b.shows - a.shows)

// Полный список в сообщение не влезает и не читается — отдаём файлом.
// BOM нужен, чтобы Excel не превратил кириллицу в кракозябры.
export function exportZeroClicks(queries, dateIso) {
  if (!queries.length) return null
  mkdirSync(EXPORT_DIR, { recursive: true })
  const csv = ['Показы;Запрос', ...queries.map((q) => `${q.shows};"${q.query.replace(/"/g, '""')}"`)]
  const path = join(EXPORT_DIR, `zero-clicks_${dateIso.split('T')[0]}.csv`)
  writeFileSync(path, `﻿${csv.join('\n')}\n`)
  return path
}

const daysBetween = (fromDate, toIso) =>
  Math.round((new Date(toIso) - new Date(fromDate)) / 86_400_000)

export function analyze(current, previous) {
  const alerts = []
  const tv = data(current.topvisor)
  const prevTvRaw = ok(previous?.topvisor) ? data(previous.topvisor) : null

  // Топвизор отдаёт последний снятый съём. Если позиции не переснимали, обе выборки
  // окажутся одинаковыми и дельта покажет мнимую стабильность — такие дельты не считаем.
  const positionsRestale = Boolean(prevTvRaw && tv && prevTvRaw.checkDate === tv.checkDate)
  const prevTv = positionsRestale ? null : prevTvRaw
  const checkAgeDays = tv ? daysBetween(tv.checkDate, current.collectedAt) : null

  if (positionsRestale) {
    alerts.push({
      level: 'P1',
      text: `позиции не переснимались с прошлого отчёта (съём ${tv.checkDate}) — динамика по ключам недоступна`,
    })
  } else if (checkAgeDays !== null && checkAgeDays > 5) {
    alerts.push({
      level: 'P1',
      text: `позиции сняты ${checkAgeDays} дней назад (${tv.checkDate}) — цифры устарели`,
    })
  }
  const wm = data(current.webmaster)
  const prevWm = ok(previous?.webmaster) ? data(previous.webmaster) : null
  const mt = data(current.metrika)
  const prevMt = ok(previous?.metrika) ? data(previous.metrika) : null

  // Выпавшие из топ-3: были ≤3, стали хуже 10 (или пропали из выдачи)
  const droppedFromTop3 = []
  if (tv && prevTv) {
    for (const [keyword, prevPos] of Object.entries(prevTv.positions)) {
      if (prevPos === null || prevPos > 3) continue
      const nowPos = tv.positions[keyword]
      if (nowPos === null || nowPos > 10) {
        droppedFromTop3.push({ keyword, from: prevPos, to: nowPos })
      }
    }
  }
  for (const d of droppedFromTop3) {
    alerts.push({
      level: 'P0',
      text: `«${d.keyword}» ${d.from} → ${d.to ?? 'вне топ-100'}`,
      group: 'Выпали из топ-3',
    })
  }

  const top10Delta = tv && prevTv ? tv.top10 - prevTv.top10 : null
  if (top10Delta !== null && top10Delta <= -T.top10DropP0) {
    alerts.push({
      level: 'P0',
      text: `ключей в топ-10 стало меньше на ${-top10Delta} (${prevTv.top10} → ${tv.top10})`,
    })
  }

  const top30Delta = tv && prevTv ? tv.top30 - prevTv.top30 : null
  if (top30Delta !== null && top30Delta <= -T.top30DropP1) {
    alerts.push({
      level: 'P1',
      text: `топ-30 сжался на ${-top30Delta} ключей (${prevTv.top30} → ${tv.top30})`,
    })
  }

  const showsPct = wm && prevWm ? pctChange(wm.totalShows, prevWm.totalShows) : null
  if (showsPct !== null && showsPct <= -T.showsDropPctP0) {
    alerts.push({
      level: 'P0',
      text: `показы в Яндексе упали на ${-showsPct}% (${prevWm.totalShows} → ${wm.totalShows})`,
    })
  }

  if (mt && mt.searchVisits < T.searchVisitsMinP1) {
    alerts.push({
      level: 'P1',
      text: `визитов из поиска всего ${mt.searchVisits} за ${mt.days} дней (порог ${T.searchVisitsMinP1})`,
    })
  }

  if (mt && mt.bounceRate > T.bounceRateMaxP1) {
    alerts.push({
      level: 'P1',
      text: `отказы ${mt.bounceRate.toFixed(1)}% (порог ${T.bounceRateMaxP1}%)`,
    })
  }

  const zeroClick = (wm?.queries ?? [])
    .filter((q) => q.shows >= T.zeroClickShowsP2 && q.clicks === 0 && isRelevant(q.query))
    .sort((a, b) => b.shows - a.shows)
  for (const q of zeroClick) {
    alerts.push({
      level: 'P2',
      text: `«${q.query}» — ${q.shows} показов, 0 кликов`,
      group: 'Показы без кликов',
    })
  }

  // Кандидаты «дожать»: позиции 11–30, ближе к топ-10 — выше в списке
  const pushCandidates = tv
    ? Object.entries(tv.positions)
        .filter(([, p]) => p !== null && p >= 11 && p <= 30)
        .map(([keyword, pos]) => ({ keyword, pos, prevPos: prevTv?.positions[keyword] ?? null }))
        .sort((a, b) => a.pos - b.pos)
    : []

  return {
    alerts,
    droppedFromTop3,
    pushCandidates,
    positionsRestale,
    checkAgeDays,
    checkDate: tv?.checkDate ?? null,
    deltas: {
      top10: top10Delta,
      top30: top30Delta,
      top3: tv && prevTv ? tv.top3 - prevTv.top3 : null,
      shows: wm && prevWm ? wm.totalShows - prevWm.totalShows : null,
      showsPct,
      searchVisits: mt && prevMt ? mt.searchVisits - prevMt.searchVisits : null,
      visits: mt && prevMt ? mt.visits - prevMt.visits : null,
    },
  }
}

function nextAction(analysis, current) {
  if (analysis.droppedFromTop3.length) {
    const d = analysis.droppedFromTop3[0]
    return `вернуть «${d.keyword}» в топ-3 — проверить, что изменилось на странице и у конкурентов`
  }
  const zeroClick = (data(current.webmaster)?.queries ?? [])
    .filter((q) => q.shows >= 10 && q.clicks === 0 && isRelevant(q.query))
    .sort((a, b) => b.shows - a.shows)[0]
  if (zeroClick) {
    return `переписать title и description под «${zeroClick.query}» — ${zeroClick.shows} показов и ни одного клика`
  }
  if (analysis.pushCandidates.length) {
    const c = analysis.pushCandidates[0]
    return `дожать «${c.keyword}» с ${c.pos} позиции — ближе всех к топ-10`
  }
  return 'критичных сигналов нет — работаем по контент-плану'
}

// Моноширинная таблица: первая колонка по левому краю, числовые — по правому,
// чтобы разряды выстраивались друг под другом.
function table(headers, rows) {
  const all = [headers, ...rows]
  const widths = headers.map((_, i) => Math.max(...all.map((r) => String(r[i]).length)))
  const numeric = headers.map((_, i) => rows.every((r) => /^[-+]?[\d.,]+$|^[-=—]$/.test(String(r[i]))))
  const line = (cells) =>
    cells
      .map((c, i) => (numeric[i] ? String(c).padStart(widths[i]) : String(c).padEnd(widths[i])))
      .join('  ')
      .trimEnd()
  const divider = widths.map((w) => '-'.repeat(w)).join('  ')
  return `<pre>${escapeHtml([line(headers), divider, ...rows.map(line)].join('\n'))}</pre>`
}

const fmtCell = (v) => (v === null || v === undefined ? '—' : String(v))
const fmtSigned = (v) => (v === null || v === undefined ? '—' : v === 0 ? '=' : v > 0 ? `+${v}` : String(v))

function positionBuckets(positions) {
  const buckets = [
    ['Топ-3', (p) => p <= 3],
    ['4-10', (p) => p >= 4 && p <= 10],
    ['11-20', (p) => p >= 11 && p <= 20],
    ['21-30', (p) => p >= 21 && p <= 30],
    ['31-50', (p) => p >= 31 && p <= 50],
    ['51-100', (p) => p >= 51 && p <= 100],
  ]
  const values = Object.values(positions)
  const counts = buckets.map(([label, test]) => [label, values.filter((p) => p !== null && test(p)).length])
  counts.push(['>100', values.filter((p) => p === null || p > 100).length])
  return counts
}

const fmtDate = (iso) => {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Блок про статьи: сколько их в топе, сколько читают и какие пора править.
 *
 * Две цифры сверху — то, что растим. Дальше списки по группам: пересечение
 * позиции и глубины чтения говорит, что именно чинить, а не просто «статья
 * плохая». В каждую группу берём по три штуки, отсортированные по визитам —
 * где больше людей, там правка ценнее. Полный список из девяноста строк
 * никто бы не разобрал.
 */
/** Сколько всего статей — знаменатель доли в топ-10. */
function articleCount() {
  return readArticleLengths().size
}

/** Сколько статей держат хотя бы один ключ в топ-10. */
function countArticlesInTop10(topvisor) {
  if (!topvisor) return 0
  const pages = new Set()
  for (const [path, position] of bestPositionByPage(topvisor)) {
    if (path.startsWith('/articles/') && position <= TOP_POSITION) pages.add(path)
  }
  return pages.size
}

function renderArticles(articles, totalArticles, articlesInTop10) {
  if (!articles?.rows?.length) return []

  const { rows, windowDays, minVisits } = articles
  const groups = groupArticles(rows)
  const readCount = rows.filter(isRead).length
  const lines = ['', '<b>📄 Статьи</b>']
  lines.push(
    table(
      ['показатель', 'значение'],
      [
        ['в топ-10', `${Math.round((articlesInTop10 / totalArticles) * 100)}% (${articlesInTop10} из ${totalArticles})`],
        ['читают', `${Math.round((readCount / rows.length) * 100)}% (${readCount} из ${rows.length})`],
      ]
    )
  )
  lines.push(
    `<i>Чтение — за ${windowDays} дн., от ${minVisits} визитов: за две недели у статьи набегает 2–3 захода, ` +
      `и вердикт описывал бы случайных людей. Доля — от времени, нужного на прочтение.</i>`
  )

  for (const group of groups) {
    lines.push('', `<b>${group.title} — ${group.action}</b> — ${group.rows.length}`)
    lines.push(
      table(
        ['статья', 'виз', 'проч', 'поз'],
        group.rows
          .slice(0, PER_GROUP)
          .map((r) => [
            r.slug.slice(0, 34) + (r.leftPage ? ' *' : ''),
            r.visits,
            `${displayShare(r.share)}%`,
            fmtCell(r.position),
          ])
      )
    )
  }

  if (rows.some((r) => r.leftPage)) {
    lines.push(
      '<i>* человек ушёл со статьи дальше по сайту: считается время визита, ' +
        'а не страницы. Такую долю эталоном не берём.</i>'
    )
  }
  return lines
}

export function render(current, previous, analysis) {
  const tv = data(current.topvisor)
  const wm = data(current.webmaster)
  const mt = data(current.metrika)
  const { deltas, alerts } = analysis

  const p0 = alerts.filter((a) => a.level === 'P0')
  const p1 = alerts.filter((a) => a.level === 'P1')
  const p2 = alerts.filter((a) => a.level === 'P2')
  const light = p0.length ? '🔴' : p1.length ? '🟡' : '🟢'

  const lines = []
  const alertWord = plural(alerts.length, ['алерт', 'алерта', 'алертов'])
  lines.push(
    `${light} <b>SEO-аудит ${fmtDate(current.collectedAt)}</b> · ${alerts.length} ${alertWord}`
  )

  if (!previous) {
    lines.push('<i>Первый замер — сравнивать пока не с чем, дельты появятся в следующем отчёте.</i>')
  }

  // При непереснятых позициях «было» совпадает с «сейчас» — прячем, чтобы не рисовать ложный ноль
  const prevTv = analysis.positionsRestale || !ok(previous?.topvisor) ? null : data(previous.topvisor)
  const prevWm = ok(previous?.webmaster) ? data(previous.webmaster) : null
  const prevMt = ok(previous?.metrika) ? data(previous.metrika) : null

  // На первом замере колонки «Было» и «Δ» состоят из прочерков — не показываем их вовсе.
  const hasBaseline = Boolean(previous)
  const mainRows = []
  const row = (label, now, was, delta) =>
    mainRows.push(hasBaseline ? [label, fmtCell(now), fmtCell(was), fmtSigned(delta)] : [label, fmtCell(now)])
  if (tv) {
    row('Топ-3', tv.top3, prevTv?.top3, deltas.top3)
    row('Топ-10', tv.top10, prevTv?.top10, deltas.top10)
    row('Топ-30', tv.top30, prevTv?.top30, deltas.top30)
  }
  if (wm) row('Показы (нед)', wm.totalShows, prevWm?.totalShows, deltas.shows)
  if (mt) {
    row('Визиты', mt.visits, prevMt?.visits, deltas.visits)
    row('Из поиска', mt.searchVisits, prevMt?.searchVisits, deltas.searchVisits)
    const bounceDelta = prevMt ? Number((mt.bounceRate - prevMt.bounceRate).toFixed(1)) : null
    row('Отказы, %', mt.bounceRate.toFixed(1), prevMt ? prevMt.bounceRate.toFixed(1) : null, bounceDelta)
  }
  if (mainRows.length) {
    lines.push('')
    lines.push(table(hasBaseline ? ['Показатель', 'Сейчас', 'Было', 'Δ'] : ['Показатель', 'Сейчас'], mainRows))
  }

  lines.push('')
  lines.push(`🎯 <b>Действие:</b> ${escapeHtml(nextAction(analysis, current))}`)

  const renderGroup = (list, title) => {
    if (!list.length) return
    lines.push('')
    lines.push(`<b>${title}</b>`)
    // Одиночные пункты идут первыми: иначе они визуально прилипают
    // к последней группе и читаются как её продолжение.
    const grouped = new Map()
    for (const a of list.filter((a) => a.group)) {
      if (!grouped.has(a.group)) grouped.set(a.group, [])
      grouped.get(a.group).push(a)
    }
    for (const a of list.filter((a) => !a.group)) lines.push(`  • ${escapeHtml(a.text)}`)
    for (const [group, items] of grouped) {
      lines.push(`  ${escapeHtml(group)}:`)
      for (const a of items.slice(0, 5)) lines.push(`  • ${escapeHtml(a.text)}`)
      if (items.length > 5) lines.push(`  • …ещё ${items.length - 5}`)
    }
  }
  renderGroup(p0, '⚠️ P0 — критично')
  renderGroup(p1, '⚠️ P1 — важно')
  renderGroup(p2, 'ℹ️ P2 — к сведению')

  if (tv) {
    const buckets = positionBuckets(tv.positions)
    const prevBuckets = prevTv ? new Map(positionBuckets(prevTv.positions)) : null
    lines.push('')
    const age =
      analysis.checkAgeDays === 0
        ? 'сегодня'
        : `${analysis.checkAgeDays} ${plural(analysis.checkAgeDays, ['день', 'дня', 'дней'])} назад`
    lines.push(`<b>📊 Распределение ${tv.total} ключей</b> · съём ${tv.checkDate} (${age})`)
    lines.push(
      table(
        prevBuckets ? ['Диапазон', 'Ключей', 'Δ'] : ['Диапазон', 'Ключей'],
        buckets.map(([label, count]) =>
          prevBuckets ? [label, count, fmtSigned(count - prevBuckets.get(label))] : [label, count]
        )
      )
    )
  }

  if (analysis.pushCandidates.length) {
    const near = analysis.pushCandidates
    lines.push('')
    lines.push(`<b>🎯 Дожать в топ-10 — ${near.length} ${plural(near.length, ['ключ', 'ключа', 'ключей'])} на 11–30</b>`)
    lines.push(
      table(
        hasBaseline ? ['Поз.', 'Δ', 'Ключ'] : ['Поз.', 'Ключ'],
        near.map((c) =>
          hasBaseline
            ? [c.pos, c.prevPos && c.prevPos !== c.pos ? fmtSigned(c.prevPos - c.pos) : '—', c.keyword]
            : [c.pos, c.keyword]
        )
      )
    )
  }

  if (wm) {
    const zeroClick = zeroClickQueries(current)
    if (zeroClick.length) {
      lines.push('')
      lines.push(
        `<b>🔎 Показы без кликов — ${zeroClick.length} ${plural(zeroClick.length, ['профильный запрос', 'профильных запроса', 'профильных запросов'])}</b>`
      )
      lines.push(table(['Показы', 'Запрос'], zeroClick.slice(0, 5).map((q) => [q.shows, q.query])))
      lines.push('<i>Полный список — файлом ниже</i>')
    }
  }

  // Статьи идут последним содержательным блоком: они про долгую работу,
  // а выше — то, что требует реакции сейчас.
  const art = data(current.articles)
  if (art) {
    const totalArticles = articleCount()
    const inTop10 = countArticlesInTop10(tv)
    lines.push(...renderArticles(art, totalArticles, inTop10))
  }

  const status = (section, name) => `${name} ${section?.ok ? '✅' : '❌'}`
  lines.push('')
  lines.push(
    `<i>${status(current.topvisor, 'Топвизор')} · ${status(current.webmaster, 'Вебмастер')} · ${status(current.metrika, 'Метрика')}${current.articles ? ' · ' + status(current.articles, 'Статьи') : ''}</i>`
  )
  for (const [section, name] of [
    [current.topvisor, 'Топвизор'],
    [current.webmaster, 'Вебмастер'],
    [current.metrika, 'Метрика'],
  ]) {
    if (!section.ok) lines.push(`<i>${name}: ${escapeHtml(section.error)}</i>`)
  }

  return lines.join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes('--dry-run')
  const { current, previous } = loadSnapshots()
  if (!current) {
    console.error('Нет ни одного снапшота — сначала collect.mjs')
    process.exit(1)
  }
  const analysis = analyze(current, previous)
  const text = render(current, previous, analysis)
  const zeroClick = zeroClickQueries(current)
  const csvPath = exportZeroClicks(zeroClick, current.collectedAt)

  if (dryRun) {
    console.log(text)
    if (csvPath) console.log(`\nCSV: ${csvPath} (${zeroClick.length} запросов)`)
  } else {
    const ids = await sendLongMessage(text)
    console.log(`Отправлено в SEO лабу: ${ids.length} сообщ. (${ids.join(', ')})`)
    if (csvPath) {
      const id = await sendDocument(csvPath, `Показы без кликов — ${zeroClick.length} запросов`)
      console.log(`Файл отправлен: ${csvPath} (msg ${id})`)
    }
  }
}
