/**
 * Сквозной путь: статья → листинг → карточка → бот → отклик.
 *
 * Собирает воронку из Метрики и печатает pre-таблицу для топика. Раньше этот
 * путь не измерялся вовсе: цели в счётчике не были заведены (обнаружено
 * 31.08.2026), а клик по карточке из листинга не помечался нигде (закрыто
 * 01.09.2026, цель card_open).
 *
 * Цели ищем по УСЛОВИЮ, а не по имени: имя человек пишет как хочет, а условие
 * совпадает с идентификатором из lib/metrika.ts. Так отчёт переживает
 * переименование цели в интерфейсе и не ломается, когда цель ещё не заведена —
 * она просто помечается прочерком.
 *
 * Usage:
 *   node scripts/analytics/funnel.mjs            → за 30 дней
 *   node scripts/analytics/funnel.mjs --days=90
 *   node scripts/analytics/funnel.mjs --send     → отправить в топик
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const COUNTER = '109131123'

/**
 * Токен берётся оттуда же, где его держит скилл seo-data-sources: отдельной
 * копии не заводим, чтобы не расходилась при ротации.
 */
function loadToken() {
  if (process.env.YANDEX_METRIKA_TOKEN) return process.env.YANDEX_METRIKA_TOKEN
  try {
    const path = join(homedir(), '.claude', 'skills', 'seo-data-sources', '.env')
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^YANDEX_METRIKA_TOKEN=(.*)$/)
      if (m) return m[1].trim()
    }
  } catch {
    /* дальше упадём с понятным сообщением */
  }
  return null
}

const TOKEN = loadToken()
const DAYS = Number((process.argv.find((a) => a.startsWith('--days=')) || '').split('=')[1] || 30)
const SEND = process.argv.includes('--send')

/** Шаги воронки в порядке прохождения. Идентификаторы — из lib/metrika.ts. */
const STEPS = [
  ['article_read', 'дочитал статью'],
  ['listing_search', 'искал в листинге'],
  ['tag_filter', 'включил фильтр'],
  ['card_open', 'открыл карточку'],
  ['vacancy_click', 'ушёл к работодателю'],
  ['telegram_click', 'перешёл в Telegram'],
  ['resume_submit', 'пошёл в бота с резюме'],
]

async function metrika(path, params) {
  const u = new URL(`https://api-metrika.yandex.net${path}`)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  const r = await fetch(u, { headers: { Authorization: `OAuth ${TOKEN}` } })
  if (!r.ok) throw new Error(`Метрика HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return r.json()
}

/** Идентификатор цели → её id в счётчике. Ищем по условию, не по названию. */
async function goalIds() {
  const { goals } = await metrika(`/management/v1/counter/${COUNTER}/goals`, {})
  const map = {}
  for (const g of goals || []) {
    for (const c of g.conditions || []) {
      if (c.url) map[c.url] = g.id
    }
  }
  return map
}

const stat = (params) =>
  metrika('/stat/v1/data', {
    ids: COUNTER,
    date1: `${DAYS}daysAgo`,
    date2: 'today',
    accuracy: 'full',
    ...params,
  })

function pad(s, n) {
  s = String(s)
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length)
}
const num = (v) => String(Math.round(v)).padStart(7)

async function main() {
  if (!TOKEN) throw new Error('YANDEX_METRIKA_TOKEN не задан')
  const ids = await goalIds()

  const base = await stat({ metrics: 'ym:s:visits,ym:s:users' })
  const [visits, users] = Array.isArray(base.totals?.[0]) ? base.totals[0] : base.totals

  const lines = []
  lines.push(`СКВОЗНОЙ ПУТЬ ЗА ${DAYS} ДН.`)
  lines.push('-'.repeat(52))
  lines.push(`${pad('визиты', 24)}${num(visits)}`)
  lines.push(`${pad('посетители', 24)}${num(users)}`)
  lines.push('')
  lines.push(`${pad('шаг', 24)}${'достижения'.padStart(11)}  ${'от визитов'.padStart(10)}`)
  lines.push('-'.repeat(52))

  const missing = []
  for (const [key, human] of STEPS) {
    const id = ids[key]
    if (!id) {
      missing.push(key)
      lines.push(`${pad(human, 24)}${'—'.padStart(11)}  ${'цель не заведена'.padStart(10)}`)
      continue
    }
    const d = await stat({ metrics: `ym:s:goal${id}reaches` })
    const v = (Array.isArray(d.totals?.[0]) ? d.totals[0] : d.totals)[0] ?? 0
    const share = visits ? ((v / visits) * 100).toFixed(1) + '%' : '—'
    lines.push(`${pad(human, 24)}${num(v)}    ${share.padStart(8)}`)
  }

  // Какие страницы входа доводят до открытия карточки — то, ради чего всё
  // и затевалось: какие статьи приводят людей, готовых смотреть вакансии.
  const openId = ids['card_open']
  if (openId) {
    const d = await stat({
      metrics: `ym:s:visits,ym:s:goal${openId}reaches`,
      dimensions: 'ym:s:startURL',
      filters: "ym:s:lastTrafficSource=='organic'",
      sort: `-ym:s:goal${openId}reaches`,
      limit: '15',
    })
    const rows = d.data.filter((r) => r.metrics[1] > 0)
    if (rows.length) {
      lines.push('')
      lines.push('СТРАНИЦЫ ВХОДА, ДОВОДЯЩИЕ ДО КАРТОЧКИ')
      lines.push('-'.repeat(52))
      for (const r of rows) {
        const url = String(r.dimensions[0].name).replace(/^https?:\/\/d-pub\.ru/, '') || '/'
        lines.push(`${num(r.metrics[1])} из ${String(Math.round(r.metrics[0])).padEnd(4)} ${url.slice(0, 34)}`)
      }
    }
  }

  if (missing.length) {
    lines.push('')
    lines.push(`Не заведены в счётчике: ${missing.join(', ')}`)
    lines.push('До заведения события не сохраняются.')
  }

  const text = lines.join('\n')
  console.log(text)

  if (SEND) {
    const { sendMessage } = await import('../seo-audit/lib/telegram.mjs')
    await sendMessage(`<pre>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`)
    console.log('\n[funnel] Отправлено в топик')
  }
}

main().catch((e) => {
  console.error('[funnel]', e.message)
  process.exit(1)
})
