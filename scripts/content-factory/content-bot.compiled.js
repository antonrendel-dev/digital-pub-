var __defProp = Object.defineProperty
var __getOwnPropNames = Object.getOwnPropertyNames
var __esm = (fn, res) =>
  function __init() {
    return (fn && (res = (0, fn[__getOwnPropNames(fn)[0]])((fn = 0))), res)
  }
var __export = (target, all) => {
  for (var name in all) __defProp(target, name, { get: all[name], enumerable: true })
}

// ../seo-audit/findings.compiled.mjs
function scoreOf(s, g, r, a) {
  return { s, g, r, a, total: s + g + r + a }
}
function buildFindings(prev, curr) {
  const out = []
  const prevPos = prev?.topvisor?.ok ? (prev.topvisor.data?.positions ?? {}) : {}
  const currPos = curr?.topvisor?.ok ? (curr.topvisor.data?.positions ?? {}) : {}
  for (const [key, raw] of Object.entries(currPos)) {
    const now = pos(raw)
    const was = pos(prevPos[key])
    const hadBefore = Object.prototype.hasOwnProperty.call(prevPos, key)
    if (hadBefore && known(prevPos[key]) && was <= 10 && now > 10) {
      out.push({
        type: 'left-top10',
        key,
        title: `\u041A\u043B\u044E\u0447 \xAB${key}\xBB \u0432\u044B\u0448\u0435\u043B \u0438\u0437 \u0442\u043E\u043F-10: ${was} \u2192 ${known(raw) ? now : '>100'}`,
        detail: `\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043F\u043E \u044D\u0442\u043E\u043C\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u0443 \u0443\u0436\u0435 \u0431\u044B\u043B\u0430 \u0432 \u0434\u0435\u0441\u044F\u0442\u043A\u0435, \u0437\u043D\u0430\u0447\u0438\u0442 \u043A\u043E\u043D\u0442\u0435\u043D\u0442 \u0438 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u043B\u0438. \u0420\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C\u0441\u044F, \u0447\u0442\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u043E\u0441\u044C: \u043A\u043E\u043D\u043A\u0443\u0440\u0435\u043D\u0442, \u043A\u0430\u043D\u043D\u0438\u0431\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F \u0438\u043B\u0438 \u043F\u0440\u0430\u0432\u043A\u0430 \u043D\u0430 \u043D\u0430\u0448\u0435\u0439 \u0441\u0442\u043E\u0440\u043E\u043D\u0435.`,
        dedupKey: `left-top10:${key}`,
        score: scoreOf(20, 20, 0, 18),
      })
      continue
    }
    if (hadBefore && known(prevPos[key]) && known(raw) && now - was >= DROP_THRESHOLD) {
      out.push({
        type: 'position-drop',
        key,
        title: `\u041A\u043B\u044E\u0447 \xAB${key}\xBB \u043F\u0440\u043E\u0441\u0435\u043B \u043D\u0430 ${now - was}: ${was} \u2192 ${now}`,
        detail: `\u041F\u0430\u0434\u0435\u043D\u0438\u0435 \u0432\u043D\u0443\u0442\u0440\u0438 \u0442\u043E\u043F-100. \u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443, \u0441\u0432\u0435\u0436\u0435\u0441\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0445 \u0438 \u043F\u0435\u0440\u0435\u043B\u0438\u043D\u043A\u043E\u0432\u043A\u0443.`,
        dedupKey: `position-drop:${key}`,
        score: scoreOf(12, 18, 0, 18),
      })
      continue
    }
    if (known(raw) && now >= NEAR_TOP[0] && now <= NEAR_TOP[1]) {
      out.push({
        type: 'near-top10',
        key,
        title: `\u041A\u043B\u044E\u0447 \xAB${key}\xBB \u043D\u0430 ${now} \u2014 \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442 \u043D\u0430 \u0434\u043E\u0436\u0438\u043C`,
        detail: `\u0412 \u043A\u043E\u0440\u0438\u0434\u043E\u0440\u0435 ${NEAR_TOP[0]}\u2013${NEAR_TOP[1]} \u043F\u0440\u0438\u0440\u043E\u0441\u0442 \u0434\u0430\u0451\u0442 \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u044B\u0432\u0430\u043D\u0438\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B: \u043E\u0431\u044A\u0451\u043C, \u0432\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u044F, FAQ, \u043F\u0435\u0440\u0435\u043B\u0438\u043D\u043A\u043E\u0432\u043A\u0430. \u041D\u043E\u0432\u0430\u044F \u0441\u0442\u0430\u0442\u044C\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0434\u0435\u043B\u0438\u0442 \u0432\u044B\u0434\u0430\u0447\u0443.`,
        dedupKey: `near-top10:${key}`,
        score: scoreOf(18, 15, 0, 18),
      })
    }
  }
  const prevPages = new Map(
    (prev?.metrika?.ok ? (prev.metrika.data?.topPages ?? []) : []).map((p) => [p.path, p.pageviews])
  )
  for (const p of curr?.metrika?.ok ? (curr.metrika.data?.topPages ?? []) : []) {
    const before = prevPages.get(p.path)
    if (before == null || before < PAGEVIEW_FLOOR) continue
    const dropPct = Math.round(((before - p.pageviews) / before) * 100)
    if (dropPct >= PAGEVIEW_DROP_PCT) {
      out.push({
        type: 'pageviews-drop',
        key: p.path,
        title: `\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u044B ${p.path} \u0443\u043F\u0430\u043B\u0438 \u043D\u0430 ${dropPct}%: ${before} \u2192 ${p.pageviews}`,
        detail: `\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438\u043D\u0434\u0435\u043A\u0441\u0430\u0446\u0438\u044E, \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u043F\u043E \u043A\u043B\u044E\u0447\u0430\u043C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0438 \u043D\u0435 \u0441\u043B\u043E\u043C\u0430\u043B\u0430\u0441\u044C \u043B\u0438 \u043E\u043D\u0430.`,
        dedupKey: `pageviews-drop:${p.path}`,
        score: scoreOf(15, 18, 0, 18),
      })
    }
  }
  for (const q of curr?.webmaster?.ok ? (curr.webmaster.data?.queries ?? []) : []) {
    if (q.shows >= ZERO_CLICK_SHOWS && q.clicks === 0) {
      out.push({
        type: 'zero-clicks',
        key: q.query,
        title: `\xAB${q.query}\xBB: ${q.shows} \u043F\u043E\u043A\u0430\u0437\u043E\u0432, \u043D\u043E\u043B\u044C \u043A\u043B\u0438\u043A\u043E\u0432`,
        detail: `\u041D\u0430\u0441 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442, \u043D\u043E \u043D\u0435 \u0432\u044B\u0431\u0438\u0440\u0430\u044E\u0442. \u0421\u043C\u043E\u0442\u0440\u0435\u0442\u044C title \u0438 description \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B, \u043A\u043E\u0442\u043E\u0440\u0430\u044F \u0440\u0430\u043D\u0436\u0438\u0440\u0443\u0435\u0442\u0441\u044F, \u0438 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435 \u0438\u043D\u0442\u0435\u043D\u0442\u0443.`,
        dedupKey: `zero-clicks:${q.query}`,
        score: scoreOf(10, 15, 0, 18),
      })
    }
  }
  return out.sort((a, b) => b.score.total - a.score.total)
}
function filterKnown(findings, existingDedupKeys) {
  const seen = new Set(existingDedupKeys)
  return findings.filter((f) => !seen.has(f.dedupKey))
}
var DROP_THRESHOLD, NEAR_TOP, PAGEVIEW_DROP_PCT, PAGEVIEW_FLOOR, ZERO_CLICK_SHOWS, pos, known
var init_findings_compiled = __esm({
  '../seo-audit/findings.compiled.mjs'() {
    'use strict'
    DROP_THRESHOLD = 5
    NEAR_TOP = [11, 30]
    PAGEVIEW_DROP_PCT = 50
    PAGEVIEW_FLOOR = 10
    ZERO_CLICK_SHOWS = 30
    pos = (v) => (typeof v === 'number' ? v : 101)
    known = (v) => typeof v === 'number'
  },
})

// ../seo-audit/lib/telegram.mjs
function splitMessage(text, limit = CHUNK_LIMIT) {
  const chunks = []
  let lines = []
  let len = 0
  let insidePre = false
  let chunkStartsInPre = false
  const flush = () => {
    if (!lines.length) return
    let body = lines.join('\n')
    if (chunkStartsInPre) body = `<pre>${body}`
    if (insidePre) body = `${body}</pre>`
    chunks.push(body)
    chunkStartsInPre = insidePre
    lines = []
    len = 0
  }
  for (const line of text.split('\n')) {
    if (lines.length && len + line.length + 1 + TAG_RESERVE > limit) flush()
    lines.push(line)
    len += line.length + 1
    const opens = (line.match(/<pre>/g) ?? []).length
    const closes = (line.match(/<\/pre>/g) ?? []).length
    if (opens > closes) insidePre = true
    else if (closes > opens) insidePre = false
  }
  flush()
  return chunks
}
async function send(text) {
  const body = {
    chat_id: CHAT_ID,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }
  if (THREAD_ID) body.message_thread_id = THREAD_ID
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3e4),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram: ${data.description}`)
  return data.result.message_id
}
async function sendLongMessage(text) {
  if (!BOT_TOKEN) throw new Error('CONTENT_BOT_TOKEN \u043D\u0435 \u0437\u0430\u0434\u0430\u043D')
  if (!CHAT_ID) throw new Error('SEO_LAB_CHAT_ID \u043D\u0435 \u0437\u0430\u0434\u0430\u043D')
  const chunks = splitMessage(text)
  const ids = []
  for (const [i, chunk] of chunks.entries()) {
    const suffix =
      chunks.length > 1
        ? `

<i>(${i + 1}/${chunks.length})</i>`
        : ''
    ids.push(await send(chunk + suffix))
    if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, PAUSE_MS))
  }
  return ids
}
var BOT_TOKEN, CHAT_ID, THREAD_ID, CHUNK_LIMIT, PAUSE_MS, TAG_RESERVE, escapeHtml
var init_telegram = __esm({
  '../seo-audit/lib/telegram.mjs'() {
    'use strict'
    BOT_TOKEN = process.env.CONTENT_BOT_TOKEN || process.env.BOT_TOKEN
    CHAT_ID = process.env.SEO_LAB_CHAT_ID
    THREAD_ID = process.env.SEO_LAB_TOPIC_ID ? Number(process.env.SEO_LAB_TOPIC_ID) : void 0
    CHUNK_LIMIT = 3500
    PAUSE_MS = 400
    TAG_RESERVE = 40
    escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  },
})

// ../seo-audit/lib/todoist.mjs
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
function loadToken() {
  const fromEnv = process.env.TODOIST_API_TOKEN
  if (fromEnv) return fromEnv
  const settings = JSON.parse(readFileSync(join(homedir(), '.claude', 'settings.json'), 'utf8'))
  const token = settings?.mcpServers?.todoist?.env?.TODOIST_API_TOKEN
  if (!token)
    throw new Error(
      'TODOIST_API_TOKEN \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u043D\u0438 \u0432 \u043E\u043A\u0440\u0443\u0436\u0435\u043D\u0438\u0438, \u043D\u0438 \u0432 settings.json'
    )
  return token
}
async function call(token, path2, { method = 'GET', body } = {}) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(API + path2, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : void 0,
    })
    if (res.ok) {
      const text = await res.text()
      return text.trim() ? JSON.parse(text) : {}
    }
    if (![429, 500, 502, 503].includes(res.status) || attempt === 4) {
      throw new Error(`Todoist HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
    }
    await new Promise((r) => setTimeout(r, 4e3 * attempt))
  }
}
async function listOpenTasks(token) {
  const out = []
  let cursor = null
  do {
    const q = `?project_id=${PROJECT_ID}&limit=200${cursor ? `&cursor=${cursor}` : ''}`
    const page = await call(token, `/tasks${q}`)
    out.push(...page.results)
    cursor = page.next_cursor
  } while (cursor)
  return out
}
async function createTask(token, { content, description, priority = 2 }) {
  return call(token, '/tasks', {
    method: 'POST',
    body: { content, description, project_id: PROJECT_ID, section_id: SECTION_BACKLOG, priority },
  })
}
var PROJECT_ID, SECTION_BACKLOG, API
var init_todoist = __esm({
  '../seo-audit/lib/todoist.mjs'() {
    'use strict'
    PROJECT_ID = '6grWxWfJVfg6rcwh'
    SECTION_BACKLOG = '6grWxXRp2mx5hHH9'
    API = 'https://api.todoist.com/api/v1'
  },
})

// ../seo-audit/task-format.compiled.mjs
function parseSelection(args, total) {
  const joined = args.join(' ').trim().toLowerCase()
  if (!joined || joined === 'all' || joined === '\u0432\u0441\u0435') {
    return Array.from({ length: total }, (_, i) => i)
  }
  const picked = /* @__PURE__ */ new Set()
  for (const part of joined.split(/[\s,]+/)) {
    const n = Number(part)
    if (Number.isInteger(n) && n >= 1 && n <= total) picked.add(n - 1)
  }
  return [...picked].sort((a, b) => a - b)
}
function describeFinding(f) {
  return [
    `\u0411\u0410\u041B\u041B: ${f.score.total}/100  (\u0441\u043F\u0440\u043E\u0441 ${f.score.s}/30 \xB7 \u0433\u043E\u0442\u043E\u0432\u043D\u043E\u0441\u0442\u044C ${f.score.g}/25 \xB7 \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0430 ${f.score.r}/25 \xB7 \u0430\u0432\u0442\u043E\u043D\u043E\u043C\u043D\u043E\u0441\u0442\u044C ${f.score.a}/20)`,
    `\u041F\u043E\u0447\u0435\u043C\u0443: \u0437\u0430\u0432\u0435\u0434\u0435\u043D\u043E SEO-\u043A\u0440\u043E\u043D\u043E\u043C \u043F\u043E \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044E \u0441\u043D\u0430\u043F\u0448\u043E\u0442\u043E\u0432, \u0434\u043E\u0436\u0438\u043C \u0443\u0436\u0435 \u0441\u0434\u0435\u043B\u0430\u043D\u043D\u043E\u0433\u043E`,
    '\u2500'.repeat(40),
    '',
    f.detail,
    '',
    `\u041A\u043B\u044E\u0447 \u0438\u043B\u0438 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430: ${f.key}`,
    `\u0422\u0438\u043F \u043D\u0430\u0445\u043E\u0434\u043A\u0438: ${f.type}`,
    '',
    `${DEDUP_PREFIX} ${f.dedupKey}`,
    '(\u043C\u0435\u0442\u043A\u0430 \u043D\u0443\u0436\u043D\u0430 \u043A\u0440\u043E\u043D\u0443, \u0447\u0442\u043E\u0431\u044B \u043D\u0435 \u0437\u0430\u0432\u043E\u0434\u0438\u0442\u044C \u044D\u0442\u0443 \u0436\u0435 \u0437\u0430\u0434\u0430\u0447\u0443 \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E \u2014 \u043D\u0435 \u0443\u0434\u0430\u043B\u044F\u0442\u044C)',
  ].join('\n')
}
function extractDedupKeys(tasks) {
  const keys = /* @__PURE__ */ new Set()
  const re = new RegExp(`${DEDUP_PREFIX}\\s*(.+)`)
  for (const t of tasks) {
    const m = (t.description || '').match(re)
    if (m) keys.add(m[1].trim())
  }
  return keys
}
var DEDUP_PREFIX
var init_task_format_compiled = __esm({
  '../seo-audit/task-format.compiled.mjs'() {
    'use strict'
    DEDUP_PREFIX = 'SEO-\u041A\u0420\u041E\u041D-\u041C\u0415\u0422\u041A\u0410:'
  },
})

// ../seo-audit/propose.mjs
import { readdirSync, readFileSync as readFileSync2, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join as join2 } from 'node:path'
import { fileURLToPath } from 'node:url'
function lastTwoSnapshots(dir = SNAPSHOT_DIR) {
  const files = readdirSync(dir)
    .filter((f) => f.startsWith('seo_') && f.endsWith('.json'))
    .sort()
  return files.slice(-2).map((f) => join2(dir, f))
}
function readJson(path2) {
  return JSON.parse(readFileSync2(path2, 'utf8'))
}
function renderProposal(findings) {
  const lines = [
    `\u{1F50E} <b>SEO-\u043A\u0440\u043E\u043D: \u043D\u0430\u0448\u0451\u043B ${findings.length} \u043F\u043E\u0432\u043E\u0434(\u043E\u0432) \u0434\u043B\u044F \u0437\u0430\u0434\u0430\u0447</b>`,
    '',
    '\u042D\u0442\u043E \u0434\u043E\u0436\u0438\u043C \u0443\u0436\u0435 \u0441\u0434\u0435\u043B\u0430\u043D\u043D\u043E\u0433\u043E \u2014 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0438 \u043E\u0442\u0441\u043B\u0435\u0436\u0438\u0432\u0430\u0435\u043C\u044B\u0435 \u043A\u043B\u044E\u0447\u0438.',
    '',
  ]
  findings.forEach((f, i) => {
    lines.push(`<b>${i + 1}. ${escapeHtml(f.title)}</b>`)
    lines.push(`   ${escapeHtml(f.detail)}`)
    lines.push(`   \u0411\u0430\u043B\u043B: ${f.score.total}/100`)
    lines.push('')
  })
  lines.push(
    '\u0417\u0430\u0432\u0435\u0441\u0442\u0438 \u0442\u0438\u043A\u0435\u0442\u044B: <code>/seo_tasks 1 3</code> \u0438\u043B\u0438 <code>/seo_tasks all</code>'
  )
  lines.push(
    '\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0434\u0435\u043B\u0430\u0442\u044C \u2014 \u043F\u0440\u043E\u0441\u0442\u043E \u043D\u0435 \u043E\u0442\u0432\u0435\u0447\u0430\u0439, \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0440\u043E\u0442\u0443\u0445\u043D\u0435\u0442 \u043A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443 \u043F\u0440\u043E\u0433\u043E\u043D\u0443.'
  )
  return lines.join('\n')
}
async function propose() {
  const snaps = lastTwoSnapshots()
  if (snaps.length < 2) {
    console.log(
      '[propose] \u041D\u0443\u0436\u043D\u044B \u0434\u0432\u0430 \u0441\u043D\u0430\u043F\u0448\u043E\u0442\u0430 \u0434\u043B\u044F \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F, \u0435\u0441\u0442\u044C',
      snaps.length
    )
    return {
      findings: [],
      reason: '\u043C\u0430\u043B\u043E \u0441\u043D\u0430\u043F\u0448\u043E\u0442\u043E\u0432',
    }
  }
  const [prevPath, currPath] = snaps
  const findings = buildFindings(readJson(prevPath), readJson(currPath))
  const token = loadToken()
  const known2 = extractDedupKeys(await listOpenTasks(token))
  const fresh = filterKnown(findings, known2)
  console.log(
    `[propose] \u0421\u0440\u0430\u0432\u043D\u0438\u043B ${prevPath.split('/').pop()} \u2192 ${currPath.split('/').pop()}: \u043D\u0430\u0445\u043E\u0434\u043E\u043A ${findings.length}, \u0438\u0437 \u043D\u0438\u0445 \u043D\u043E\u0432\u044B\u0445 ${fresh.length}`
  )
  mkdirSync(dirname(PENDING_PATH), { recursive: true })
  writeFileSync(
    PENDING_PATH,
    JSON.stringify(
      { createdAt: /* @__PURE__ */ new Date().toISOString(), findings: fresh },
      null,
      2
    )
  )
  if (fresh.length) await sendLongMessage(renderProposal(fresh))
  else
    console.log(
      '[propose] \u041D\u043E\u0432\u044B\u0445 \u043F\u043E\u0432\u043E\u0434\u043E\u0432 \u043D\u0435\u0442, \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E'
    )
  return { findings: fresh }
}
var DIR, SNAPSHOT_DIR, PENDING_PATH
var init_propose = __esm({
  async '../seo-audit/propose.mjs'() {
    'use strict'
    init_findings_compiled()
    init_telegram()
    init_todoist()
    init_task_format_compiled()
    DIR = dirname(fileURLToPath(import.meta.url))
    SNAPSHOT_DIR = join2(DIR, 'data', 'snapshots')
    PENDING_PATH = join2(DIR, 'data', 'pending-tasks.json')
    if (import.meta.url === `file://${process.argv[1]}`) {
      await propose()
    }
  },
})

// ../seo-audit/create-tasks.mjs
var create_tasks_exports = {}
__export(create_tasks_exports, {
  createSelected: () => createSelected,
  readPending: () => readPending,
})
import { readFileSync as readFileSync3, writeFileSync as writeFileSync2 } from 'node:fs'
function readPending(path2 = PENDING_PATH) {
  try {
    return JSON.parse(readFileSync3(path2, 'utf8'))
  } catch {
    return { findings: [] }
  }
}
async function createSelected(args) {
  const pending = readPending()
  const findings = pending.findings ?? []
  if (!findings.length)
    return {
      created: [],
      skipped: [],
      reason:
        '\u043D\u0435\u0442 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0439',
    }
  const idx = parseSelection(args, findings.length)
  const token = loadToken()
  const known2 = extractDedupKeys(await listOpenTasks(token))
  const created = []
  const skipped = []
  for (const i of idx) {
    const f = findings[i]
    if (known2.has(f.dedupKey)) {
      skipped.push(f.title)
      continue
    }
    await createTask(token, { content: f.title, description: describeFinding(f) })
    created.push(f.title)
  }
  const rest = findings.filter((f) => !created.includes(f.title))
  writeFileSync2(PENDING_PATH, JSON.stringify({ ...pending, findings: rest }, null, 2))
  return { created, skipped }
}
var init_create_tasks = __esm({
  async '../seo-audit/create-tasks.mjs'() {
    'use strict'
    await init_propose()
    init_todoist()
    init_task_format_compiled()
    if (import.meta.url === `file://${process.argv[1]}`) {
      const res = await createSelected(process.argv.slice(2))
      console.log(JSON.stringify(res, null, 2))
    }
  },
})

// content-bot.ts
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
var BOT_TOKEN2 = process.env.CONTENT_BOT_TOKEN
var ALLOWED_USER_IDS = (process.env.ALLOWED_USER_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(Number)
if (!BOT_TOKEN2) throw new Error('CONTENT_BOT_TOKEN \u043D\u0435 \u0437\u0430\u0434\u0430\u043D')
var API2 = `https://api.telegram.org/bot${BOT_TOKEN2}`
var SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname)
var DATA_DIR = path.join(SCRIPTS_DIR, 'data')
async function tgPost(method, body) {
  const res = await fetch(`${API2}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}
async function reply(chatId, threadId, text) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }
  if (threadId) body.message_thread_id = threadId
  await tgPost('sendMessage', body)
}
function getLatestTopicsFile() {
  if (!fs.existsSync(DATA_DIR)) return null
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('topics_') && f.endsWith('.json'))
    .sort()
    .reverse()
  return files.length ? path.join(DATA_DIR, files[0]) : null
}
function approveTopics(topicsFile, ids) {
  const raw = JSON.parse(fs.readFileSync(topicsFile, 'utf-8'))
  const approved = []
  const notFound = []
  for (const id of ids) {
    const topic = raw.topics.find((t) => t.id === id)
    if (topic) {
      topic.approved = true
      approved.push(id)
    } else {
      notFound.push(id)
    }
  }
  fs.writeFileSync(topicsFile, JSON.stringify(raw, null, 2))
  return { approved, notFound }
}
function getQueueSummary(topicsFile) {
  const { topics } = JSON.parse(fs.readFileSync(topicsFile, 'utf-8'))
  const approvedNotPublished = topics.filter((t) => t.approved && !t.published)
  const published = topics.filter((t) => t.published)
  const pending = topics.filter((t) => !t.approved && !t.published)
  if (!approvedNotPublished.length) {
    return `\u{1F4ED} \u041E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u044B\u0445 \u0442\u0435\u043C \u043D\u0435\u0442. \u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043E: ${published.length}. \u041E\u0436\u0438\u0434\u0430\u044E\u0442 \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u0438\u044F: ${pending.length}.`
  }
  const lines = approvedNotPublished.map(
    (t, i) => `${i + 1}. #${t.id} <b>${t.title}</b>
   \u{1F511} ${t.keyword}`
  )
  return (
    `\u{1F4CB} <b>\u041E\u0447\u0435\u0440\u0435\u0434\u044C \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0439 (${approvedNotPublished.length} \u0442\u0435\u043C):</b>

` +
    lines.join('\n\n') +
    `

\u23F0 \u041F\u0443\u0431\u043B\u0438\u043A\u0443\u0435\u0442\u0441\u044F \u043F\u043D/\u0441\u0440/\u043F\u0442 \u0432 09:00 \u041C\u0421\u041A`
  )
}
function runScript(script, args) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRIPTS_DIR, `${script}.compiled.js`)
    const child = spawn('node', [scriptPath, ...args], {
      cwd: SCRIPTS_DIR,
      env: process.env,
      stdio: 'inherit',
    })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else
        reject(
          new Error(
            `${script} \u0432\u044B\u0448\u0435\u043B \u0441 \u043A\u043E\u0434\u043E\u043C ${code}`
          )
        )
    })
    child.on('error', reject)
  })
}
async function handleMessage(msg) {
  const userId = msg.from?.id
  const chatId = msg.chat.id
  const threadId = msg.message_thread_id
  const text = (msg.text || '').trim()
  if (!text.startsWith('/')) return
  if (ALLOWED_USER_IDS.length > 0 && userId && !ALLOWED_USER_IDS.includes(userId)) {
    await reply(
      chatId,
      threadId,
      '\u274C \u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430.'
    )
    return
  }
  const [cmd, ...args] = text.split(/\s+/)
  const command = cmd.split('@')[0]
  if (command === '/content_help') {
    await reply(
      chatId,
      threadId,
      `\u{1F916} <b>Content Factory Bot</b>

<b>\u041A\u043E\u043C\u0430\u043D\u0434\u044B:</b>
/content_plan \u2014 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0431\u0430\u0442\u0447 \u0442\u0435\u043C \u043D\u0430 \u043C\u0435\u0441\u044F\u0446 (\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A)
/content_approve 1 3 7 \u2014 \u043E\u0434\u043E\u0431\u0440\u0438\u0442\u044C \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0442\u0435\u043C\u044B
/content_approve_all \u2014 \u043E\u0434\u043E\u0431\u0440\u0438\u0442\u044C \u0432\u0441\u0435 \u0442\u0435\u043C\u044B \u0441\u0440\u0430\u0437\u0443
/content_write 5 \u2014 \u043D\u0435\u043C\u0435\u0434\u043B\u0435\u043D\u043D\u043E \u043D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u0442\u0430\u0442\u044C\u044E #5
/content_next \u2014 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043E\u0447\u0435\u0440\u0435\u0434\u044C \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u044B\u0445 \u0442\u0435\u043C
/content_regen &lt;slug&gt; [\u0441\u0446\u0435\u043D\u0430] \u2014 \u043F\u0435\u0440\u0435\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443 \u0441\u0442\u0430\u0442\u044C\u0438
/seo_tasks 1 3 \u2014 \u0437\u0430\u0432\u0435\u0441\u0442\u0438 \u0442\u0438\u043A\u0435\u0442\u044B \u043F\u043E \u043D\u0430\u0445\u043E\u0434\u043A\u0430\u043C SEO-\u043A\u0440\u043E\u043D\u0430 (all \u2014 \u0432\u0441\u0435)
/content_help \u2014 \u044D\u0442\u0430 \u0441\u043F\u0440\u0430\u0432\u043A\u0430

<b>\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u043A\u0430:</b>
\u041A\u0430\u0436\u0434\u044B\u0439 \u043F\u043D/\u0441\u0440/\u043F\u0442 \u0432 09:00 \u041C\u0421\u041A \u0431\u0435\u0440\u0451\u0442\u0441\u044F \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0430\u044F \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u0430\u044F \u0442\u0435\u043C\u0430 \u0438 \u043F\u0443\u0431\u043B\u0438\u043A\u0443\u0435\u0442\u0441\u044F.`
    )
    return
  }
  if (command === '/content_plan') {
    await reply(
      chatId,
      threadId,
      '\u{1F4CA} \u0417\u0430\u043F\u0443\u0441\u043A\u0430\u044E \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430...\n\n\u042D\u0442\u043E \u0437\u0430\u0439\u043C\u0451\u0442 ~30 \u0441\u0435\u043A\u0443\u043D\u0434.'
    )
    runScript('analyst', []).catch(async (e) => {
      await reply(
        chatId,
        threadId,
        `\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430:
${e.message}`
      )
    })
    return
  }
  if (command === '/content_approve') {
    const nums = args.filter((a) => /^\d+$/.test(a)).map(Number)
    if (!nums.length) {
      await reply(
        chatId,
        threadId,
        '\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: <code>/content_approve 1 3 7</code>'
      )
      return
    }
    const topicsFile = getLatestTopicsFile()
    if (!topicsFile) {
      await reply(
        chatId,
        threadId,
        '\u274C \u041D\u0435\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u0441 \u0442\u0435\u043C\u0430\u043C\u0438. \u0417\u0430\u043F\u0443\u0441\u0442\u0438 <code>/content_plan</code>'
      )
      return
    }
    const { approved, notFound } = approveTopics(topicsFile, nums)
    let msg2 = `\u2705 \u041E\u0434\u043E\u0431\u0440\u0435\u043D\u043E \u0442\u0435\u043C: <b>${approved.length}</b> (${approved.join(', ')})`
    if (notFound.length)
      msg2 += `
\u26A0\uFE0F \u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E: ${notFound.join(', ')}`
    msg2 += `

\u23F0 \u0411\u0443\u0434\u0443\u0442 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u044B \u043F\u043E \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044E (\u043F\u043D/\u0441\u0440/\u043F\u0442 09:00 \u041C\u0421\u041A)`
    msg2 += `

\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043E\u0447\u0435\u0440\u0435\u0434\u044C: <code>/content_next</code>`
    await reply(chatId, threadId, msg2)
    return
  }
  if (command === '/content_approve_all') {
    const topicsFile = getLatestTopicsFile()
    if (!topicsFile) {
      await reply(
        chatId,
        threadId,
        '\u274C \u041D\u0435\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u0441 \u0442\u0435\u043C\u0430\u043C\u0438. \u0417\u0430\u043F\u0443\u0441\u0442\u0438 <code>/content_plan</code>'
      )
      return
    }
    const raw = JSON.parse(fs.readFileSync(topicsFile, 'utf-8'))
    const pending = raw.topics.filter((t) => !t.published)
    pending.forEach((t) => (t.approved = true))
    fs.writeFileSync(topicsFile, JSON.stringify(raw, null, 2))
    await reply(
      chatId,
      threadId,
      `\u2705 \u0412\u0441\u0435 <b>${pending.length}</b> \u043D\u0435\u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0442\u0435\u043C \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u044B!

\u23F0 \u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044F \u043F\u043D/\u0441\u0440/\u043F\u0442 \u0432 09:00 \u041C\u0421\u041A

\u041E\u0447\u0435\u0440\u0435\u0434\u044C: <code>/content_next</code>`
    )
    return
  }
  if (command === '/content_write') {
    const num = args[0]
    if (!num || !/^\d+$/.test(num)) {
      await reply(
        chatId,
        threadId,
        '\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: <code>/content_write 5</code>'
      )
      return
    }
    await reply(
      chatId,
      threadId,
      `\u26A1 \u0417\u0430\u043F\u0443\u0441\u043A\u0430\u044E \u043D\u0435\u043C\u0435\u0434\u043B\u0435\u043D\u043D\u0443\u044E \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044E \u0442\u0435\u043C\u044B #${num}...`
    )
    runScript('writer', [num]).catch(async (e) => {
      await reply(
        chatId,
        threadId,
        `\u274C \u041E\u0448\u0438\u0431\u043A\u0430 writer \u0434\u043B\u044F \u0442\u0435\u043C\u044B #${num}:
${e.message}`
      )
    })
    return
  }
  if (command === '/content_regen') {
    const slug = args[0]
    if (!slug) {
      await reply(
        chatId,
        threadId,
        '\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435:\n<code>/content_regen &lt;slug&gt;</code> \u2014 \u0430\u0432\u0442\u043E-\u0441\u0446\u0435\u043D\u0430 \u043F\u043E \u0442\u0435\u043C\u0435\n<code>/content_regen &lt;slug&gt; \u043A\u043E\u0444\u0435\u0439\u043D\u044F, \u043D\u043E\u0443\u0442\u0431\u0443\u043A, \u0437\u0430\u043A\u0430\u0442</code> \u2014 \u0441\u0432\u043E\u044F \u0441\u0446\u0435\u043D\u0430\n\n\u0421\u043B\u0430\u0433 \u2014 \u0445\u0432\u043E\u0441\u0442 URL \u0441\u0442\u0430\u0442\u044C\u0438 \u043D\u0430 d-pub.ru'
      )
      return
    }
    const customScene = args.slice(1).join(' ').trim()
    const hint = customScene
      ? `
\u0421\u0446\u0435\u043D\u0430: <i>${customScene}</i>`
      : ''
    await reply(
      chatId,
      threadId,
      `\u{1F3A8} \u041F\u0435\u0440\u0435\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u044E \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443 \u0434\u043B\u044F <code>${slug}</code>...${hint}

\u042D\u0442\u043E \u0437\u0430\u0439\u043C\u0451\u0442 ~3 \u043C\u0438\u043D\u0443\u0442\u044B.`
    )
    runScript('regen', customScene ? [slug, customScene] : [slug])
      .then(async () => {
        await reply(
          chatId,
          threadId,
          `\u2705 \u041A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0430!

https://d-pub.ru/articles/${slug}`
        )
      })
      .catch(async (e) => {
        await reply(
          chatId,
          threadId,
          `\u274C \u041E\u0448\u0438\u0431\u043A\u0430:
${e.message}`
        )
      })
    return
  }
  if (command === '/content_next') {
    const topicsFile = getLatestTopicsFile()
    if (!topicsFile) {
      await reply(
        chatId,
        threadId,
        '\u274C \u041D\u0435\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u0441 \u0442\u0435\u043C\u0430\u043C\u0438. \u0417\u0430\u043F\u0443\u0441\u0442\u0438 <code>/content_plan</code>'
      )
      return
    }
    await reply(chatId, threadId, getQueueSummary(topicsFile))
    return
  }
  if (command === '/seo_tasks') {
    try {
      const { createSelected: createSelected2 } = await init_create_tasks().then(
        () => create_tasks_exports
      )
      const { created, skipped, reason } = await createSelected2(args)
      if (reason) {
        await reply(
          chatId,
          threadId,
          `\u{1F4ED} ${reason}. \u0421\u043F\u0438\u0441\u043E\u043A \u043F\u043E\u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043F\u0440\u043E\u0433\u043E\u043D\u0430 \u0430\u0443\u0434\u0438\u0442\u0430.`
        )
        return
      }
      const parts = []
      if (created.length) {
        parts.push(
          `\u2705 <b>\u0417\u0430\u0432\u0435\u0434\u0435\u043D\u043E \u0442\u0438\u043A\u0435\u0442\u043E\u0432: ${created.length}</b>
` + created.map((t) => `\u2022 ${t}`).join('\n')
        )
      }
      if (skipped.length) {
        parts.push(
          `\u23ED <b>\u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E \u043A\u0430\u043A \u0443\u0436\u0435 \u0437\u0430\u0432\u0435\u0434\u0451\u043D\u043D\u043E\u0435: ${skipped.length}</b>
` + skipped.map((t) => `\u2022 ${t}`).join('\n')
        )
      }
      await reply(
        chatId,
        threadId,
        parts.join('\n\n') ||
          '\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043E. \u041F\u0440\u0438\u043C\u0435\u0440: <code>/seo_tasks 1 3</code>'
      )
    } catch (e) {
      await reply(
        chatId,
        threadId,
        `\u274C \u041D\u0435 \u0441\u043C\u043E\u0433 \u0437\u0430\u0432\u0435\u0441\u0442\u0438 \u0442\u0438\u043A\u0435\u0442\u044B:
${e.message}`
      )
    }
    return
  }
}
async function poll() {
  let offset = 0
  console.log(
    '[content-bot] \u0417\u0430\u043F\u0443\u0449\u0435\u043D, \u0436\u0434\u0443 \u043A\u043E\u043C\u0430\u043D\u0434\u044B...'
  )
  while (true) {
    try {
      const data = await tgPost('getUpdates', {
        offset,
        timeout: 30,
        allowed_updates: ['message'],
      })
      if (data.ok && data.result.length) {
        for (const update of data.result) {
          offset = update.update_id + 1
          if (update.message) {
            handleMessage(update.message).catch((e) =>
              console.error(
                '[content-bot] \u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438:',
                e
              )
            )
          }
        }
      }
    } catch (e) {
      console.error('[content-bot] \u041E\u0448\u0438\u0431\u043A\u0430 polling:', e)
      await new Promise((r) => setTimeout(r, 5e3))
    }
  }
}
poll()
