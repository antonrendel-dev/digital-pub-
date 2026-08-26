/**
 * Topvisor position report for d-pub.ru
 * Usage: npx ts-node scripts/topvisor-positions.ts [--top=50] [--filter=smm] [--all]
 */

import * as dotenv from 'dotenv'
dotenv.config()

const API_KEY = process.env.TOPVISOR_API_KEY!
const USER_ID = '503425'
const PROJECT_ID = 29110027
const REGION_INDEX = 5 // Яндекс Москва (определён эмпирически)
const BASE_URL = 'https://api.topvisor.com/v2/json'

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace('--', '').split('=')
    return [k, v ?? true]
  })
)

const TOP = parseInt(String(args.top ?? 50))
const FILTER = args.filter ? String(args.filter).toLowerCase() : null
const SHOW_ALL = !!args.all

async function tv(method: string, body: object): Promise<any> {
  const res = await fetch(`${BASE_URL}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `bearer ${API_KEY}`,
      'User-Id': USER_ID,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json() as { result: any; errors?: any[] }
  if (data.errors?.length) throw new Error(JSON.stringify(data.errors[0]))
  return data.result
}

function findLastCheckDate(): Promise<string | null> {
  return tv('get/positions_2/summary', {
    project_id: PROJECT_ID,
    region_index: REGION_INDEX,
    dates: ['2025-01-01', new Date().toISOString().split('T')[0]],
  }).then(r => r?.dates?.[0] ?? null)
}

async function main() {
  if (!API_KEY) {
    console.error('❌ TOPVISOR_API_KEY не задан в .env')
    process.exit(1)
  }

  const lastDate = await findLastCheckDate()
  if (!lastDate) {
    console.log('📭 Нет данных о проверках позиций.')
    console.log('   Зайди на topvisor.com → D-PUB → «Снять позиции»')
    process.exit(0)
  }

  const history = await tv('get/positions_2/history', {
    project_id: PROJECT_ID,
    regions_indexes: [REGION_INDEX],
    date1: lastDate,
    date2: lastDate,
  })

  const keywords: { name: string; positionsData: any }[] = history.keywords ?? []

  const rows: { keyword: string; pos: number | null }[] = keywords.map(k => {
    const pd = k.positionsData ?? {}
    let pos: number | null = null
    for (const v of Object.values(pd) as any[]) {
      const raw = v?.position
      if (raw && raw !== '--') pos = parseInt(raw)
    }
    return { keyword: k.name, pos }
  })

  let filtered = rows
  if (FILTER) filtered = rows.filter(r => r.keyword.toLowerCase().includes(FILTER!))

  filtered.sort((a, b) => {
    if (a.pos === null && b.pos === null) return 0
    if (a.pos === null) return 1
    if (b.pos === null) return -1
    return a.pos - b.pos
  })

  const inTop10  = rows.filter(r => r.pos !== null && r.pos <= 10).length
  const inTop30  = rows.filter(r => r.pos !== null && r.pos <= 30).length
  const inTop100 = rows.filter(r => r.pos !== null && r.pos <= 100).length
  const noPos    = rows.filter(r => r.pos === null).length

  console.log(`\n📊 Позиции d-pub.ru | ${lastDate} | Яндекс Москва`)
  if (FILTER) console.log(`🔍 Фильтр: "${FILTER}" — найдено ${filtered.length} ключей`)
  console.log(`   Всего: ${rows.length} | Топ-10: ${inTop10} | Топ-30: ${inTop30} | Топ-100: ${inTop100} | >100: ${noPos}\n`)

  const show = SHOW_ALL ? filtered : filtered.slice(0, TOP)

  console.log(`${'Поз'.padStart(5)}  Ключ`)
  console.log('─'.repeat(65))

  for (const r of show) {
    const pos = r.pos !== null ? String(r.pos).padStart(5) : '  >100'
    console.log(`${pos}  ${r.keyword}`)
  }

  if (!SHOW_ALL && filtered.length > TOP) {
    console.log(`\n   ...ещё ${filtered.length - TOP} ключей. Добавь --all чтобы показать все.`)
  }
  console.log()
}

main().catch(e => {
  console.error('❌ Ошибка:', e.message)
  process.exit(1)
})
