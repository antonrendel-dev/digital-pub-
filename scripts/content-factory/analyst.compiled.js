// analyst.ts
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

// lib/telegram.ts
var BOT_TOKEN = process.env.BOT_TOKEN
var CHAT_ID = process.env.SEO_LAB_CHAT_ID
var THREAD_ID = process.env.SEO_LAB_TOPIC_ID ? Number(process.env.SEO_LAB_TOPIC_ID) : void 0
if (!BOT_TOKEN) throw new Error('BOT_TOKEN not set')
if (!CHAT_ID) throw new Error('SEO_LAB_CHAT_ID not set')
var API = `https://api.telegram.org/bot${BOT_TOKEN}`
async function sendMessage(text, extra = {}) {
  const body = {
    chat_id: CHAT_ID,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra,
  }
  if (THREAD_ID) body.message_thread_id = THREAD_ID
  const res = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram error: ${data.description}`)
  return data.result.message_id
}

// analyst.ts
var DATA_DIR = path.join(import.meta.dirname, 'data')
function askClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', prompt], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d.toString()))
    child.stderr.on('data', (d) => (err += d.toString()))
    child.on('close', (code) => {
      if (code === 0) resolve(out.trim())
      else
        reject(
          new Error(
            err ||
              `claude \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u0441 \u043A\u043E\u0434\u043E\u043C ${code}`
          )
        )
    })
    child.on('error', reject)
  })
}
async function generateTopics() {
  const raw =
    await askClaude(`\u0422\u044B SEO-\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A \u0438 \u043A\u043E\u043D\u0442\u0435\u043D\u0442-\u0441\u0442\u0440\u0430\u0442\u0435\u0433 \u0434\u043B\u044F \u0440\u0443\u0441\u0441\u043A\u043E\u044F\u0437\u044B\u0447\u043D\u043E\u0433\u043E job board d-pub.ru \u2014 \u0430\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440\u0430 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439 \u0434\u043B\u044F digital-\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u043E\u0432 (\u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433\u0438, \u0434\u0438\u0437\u0430\u0439\u043D\u0435\u0440\u044B, SMM, \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0438, \u043A\u043E\u043F\u0438\u0440\u0430\u0439\u0442\u0435\u0440\u044B, \u0442\u0430\u0440\u0433\u0435\u0442\u043E\u043B\u043E\u0433\u0438) \u0438\u0437 Telegram-\u043A\u0430\u043D\u0430\u043B\u043E\u0432.

\u0410\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u044F \u0441\u0430\u0439\u0442\u0430: \u0441\u043E\u0438\u0441\u043A\u0430\u0442\u0435\u043B\u0438 (\u0438\u0449\u0443\u0442 \u0440\u0430\u0431\u043E\u0442\u0443 \u0432 digital) \u0438 HR/\u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u0438 (\u043D\u0430\u043D\u0438\u043C\u0430\u044E\u0442 digital-\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u043E\u0432).

\u0421\u043E\u0441\u0442\u0430\u0432\u044C \u0441\u043F\u0438\u0441\u043E\u043A 25 \u0442\u0435\u043C \u0434\u043B\u044F \u0441\u0442\u0430\u0442\u0435\u0439 \u043D\u0430 \u0431\u043B\u043E\u0433. \u0414\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0439 \u0442\u0435\u043C\u044B \u0443\u043A\u0430\u0436\u0438:
- \u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0441\u0442\u0430\u0442\u044C\u0438 (\u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0439, \u0441 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u043C \u0441\u043B\u043E\u0432\u043E\u043C)
- \u0413\u043B\u0430\u0432\u043D\u044B\u0439 \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u043A\u043B\u044E\u0447 (1-2 \u0441\u043B\u043E\u0432\u0430/\u0444\u0440\u0430\u0437\u044B, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0438\u0449\u0443\u0442)
- \u0410\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u044F: \u0421\u043E\u0438\u0441\u043A\u0430\u0442\u0435\u043B\u044C / HR / \u041E\u0431\u0430
- \u0422\u0438\u043F \u043A\u043E\u043D\u0442\u0435\u043D\u0442\u0430: \u0413\u0430\u0439\u0434 / \u041A\u043E\u043D\u0441\u043F\u0435\u043A\u0442 / \u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 / \u041A\u0435\u0439\u0441 / \u0427\u0435\u043A\u043B\u0438\u0441\u0442
- \u041F\u0440\u0438\u043C\u0435\u0440\u043D\u044B\u0439 \u0442\u0440\u0430\u0444\u0438\u043A-\u043F\u043E\u0442\u0435\u043D\u0446\u0438\u0430\u043B: \u043D\u0438\u0437\u043A\u0438\u0439 (<200/\u043C\u0435\u0441) / \u0441\u0440\u0435\u0434\u043D\u0438\u0439 (200-800/\u043C\u0435\u0441) / \u0432\u044B\u0441\u043E\u043A\u0438\u0439 (>800/\u043C\u0435\u0441)

\u0422\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F \u043A \u0442\u0435\u043C\u0430\u043C:
- \u0412\u0435\u0447\u043D\u043E\u0437\u0435\u043B\u0451\u043D\u044B\u0435 (\u043D\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D\u044B \u043A \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0439 \u0434\u0430\u0442\u0435)
- \u041F\u0440\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0435, \u0440\u0435\u0448\u0430\u044E\u0442 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u0443\u044E \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0443
- \u0420\u0430\u0437\u043D\u044B\u0435 \u0444\u043E\u0440\u043C\u0430\u0442\u044B \u0438 \u0430\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u0438 (mix HR \u0438 \u0441\u043E\u0438\u0441\u043A\u0430\u0442\u0435\u043B\u0435\u0439)
- \u0412\u043A\u043B\u044E\u0447\u0438 3-4 \u0442\u0435\u043C\u044B \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 "\u043A\u043E\u043D\u0441\u043F\u0435\u043A\u0442 \u0437\u0430\u0440\u0443\u0431\u0435\u0436\u043D\u043E\u0433\u043E \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430" (\u043F\u0435\u0440\u0435\u0441\u043A\u0430\u0437 \u0437\u0430\u0440\u0443\u0431\u0435\u0436\u043D\u044B\u0445 best practices)
- \u041D\u0435 \u0434\u0443\u0431\u043B\u0438\u0440\u0443\u0439 \u0442\u043E \u0447\u0442\u043E \u0443\u0436\u0435 \u0435\u0441\u0442\u044C \u043D\u0430 hh.ru \u0438\u043B\u0438 superjob

\u041E\u0442\u0432\u0435\u0442 \u0441\u0442\u0440\u043E\u0433\u043E \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 JSON \u043C\u0430\u0441\u0441\u0438\u0432\u0430, \u0431\u0435\u0437 \u043B\u0438\u0448\u043D\u0435\u0433\u043E \u0442\u0435\u043A\u0441\u0442\u0430:
[
  {
    "id": 1,
    "title": "...",
    "keyword": "...",
    "audience": "\u0421\u043E\u0438\u0441\u043A\u0430\u0442\u0435\u043B\u044C|HR|\u041E\u0431\u0430",
    "type": "\u0413\u0430\u0439\u0434|\u041A\u043E\u043D\u0441\u043F\u0435\u043A\u0442|\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435|\u041A\u0435\u0439\u0441|\u0427\u0435\u043A\u043B\u0438\u0441\u0442",
    "trafficEst": "\u043D\u0438\u0437\u043A\u0438\u0439|\u0441\u0440\u0435\u0434\u043D\u0438\u0439|\u0432\u044B\u0441\u043E\u043A\u0438\u0439"
  }
]`)
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Claude \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B JSON')
  return JSON.parse(jsonMatch[0])
}
function formatTopicsMessage(topics, date) {
  const audienceEmoji = { Соискатель: '\u{1F464}', HR: '\u{1F4BC}', Оба: '\u{1F465}' }
  const typeEmoji = {
    Гайд: '\u{1F4D8}',
    Конспект: '\u{1F4F9}',
    Сравнение: '\u2696\uFE0F',
    Кейс: '\u{1F4A1}',
    Чеклист: '\u2705',
  }
  const trafficEmoji = { низкий: '\u{1F4C9}', средний: '\u{1F4CA}', высокий: '\u{1F680}' }
  const lines = topics.map(
    (t) => `${t.id}. ${typeEmoji[t.type] ?? ''} <b>${t.title}</b>
   \u{1F511} <i>${t.keyword}</i> \xB7 ${audienceEmoji[t.audience] ?? ''} ${t.audience} \xB7 ${trafficEmoji[t.trafficEst] ?? ''} ${t.trafficEst}`
  )
  return (
    `\u{1F4CA} <b>\u041A\u043E\u043D\u0442\u0435\u043D\u0442-\u043F\u043B\u0430\u043D \u2014 ${date}</b>

` +
    lines.join('\n\n') +
    `

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u0427\u0442\u043E\u0431\u044B \u043E\u0434\u043E\u0431\u0440\u0438\u0442\u044C \u0442\u0435\u043C\u044B, \u043E\u0442\u0432\u0435\u0442\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439:
<code>/content_approve 1 3 7</code>`
  )
}
async function main() {
  console.log(
    '[analyst] \u0413\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u044E \u0442\u0435\u043C\u044B...'
  )
  const topics = await generateTopics()
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const date = /* @__PURE__ */ new Date().toISOString().split('T')[0]
  const filePath = path.join(DATA_DIR, `topics_${date}.json`)
  fs.writeFileSync(filePath, JSON.stringify({ date, topics }, null, 2))
  console.log(`[analyst] \u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E: ${filePath}`)
  const dateRu = /* @__PURE__ */ new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const msg = formatTopicsMessage(topics, dateRu)
  await sendMessage(msg)
  console.log(
    '[analyst] \u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u0432 Telegram \u2713'
  )
}
main().catch((e) => {
  console.error('[analyst] \u041E\u0448\u0438\u0431\u043A\u0430:', e)
  process.exit(1)
})
