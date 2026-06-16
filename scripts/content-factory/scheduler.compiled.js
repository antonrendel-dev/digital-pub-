// scheduler.ts
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

// lib/telegram.ts
var BOT_TOKEN = process.env.CONTENT_BOT_TOKEN || process.env.BOT_TOKEN
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

// scheduler.ts
var DATA_DIR = path.join(import.meta.dirname, 'data')
var SCRIPTS_DIR = import.meta.dirname
function getLatestTopicsFile() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('topics_') && f.endsWith('.json'))
    .sort()
    .reverse()
  return files.length ? path.join(DATA_DIR, files[0]) : null
}
function getNextApprovedTopic(topicsFile) {
  const { topics } = JSON.parse(fs.readFileSync(topicsFile, 'utf-8'))
  return topics.find((t) => t.approved && !t.published) || null
}
function countApprovedUnpublished(topicsFile) {
  const { topics } = JSON.parse(fs.readFileSync(topicsFile, 'utf-8'))
  return topics.filter((t) => t.approved && !t.published).length
}
function runWriter(topicId) {
  return new Promise((resolve, reject) => {
    const writerPath = path.join(SCRIPTS_DIR, 'writer.compiled.js')
    const child = spawn('node', [writerPath, String(topicId)], {
      cwd: SCRIPTS_DIR,
      env: process.env,
      stdio: 'inherit',
    })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else
        reject(
          new Error(
            `writer \u0432\u044B\u0448\u0435\u043B \u0441 \u043A\u043E\u0434\u043E\u043C ${code}`
          )
        )
    })
    child.on('error', reject)
  })
}
async function main() {
  const topicsFile = getLatestTopicsFile()
  if (!topicsFile) {
    await sendMessage(
      `\u26A0\uFE0F <b>\u041A\u043E\u043D\u0442\u0435\u043D\u0442-\u0437\u0430\u0432\u043E\u0434: \u043D\u0435\u0442 \u0442\u0435\u043C</b>

\u0417\u0430\u043F\u0443\u0441\u0442\u0438 <code>/content_plan</code> \u0447\u0442\u043E\u0431\u044B \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043B \u043D\u043E\u0432\u044B\u0435 \u0442\u0435\u043C\u044B.`
    )
    console.log(
      '[scheduler] \u041D\u0435\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u0441 \u0442\u0435\u043C\u0430\u043C\u0438'
    )
    return
  }
  const nextTopic = getNextApprovedTopic(topicsFile)
  if (!nextTopic) {
    await sendMessage(
      `\u{1F4ED} <b>\u041A\u043E\u043D\u0442\u0435\u043D\u0442-\u0437\u0430\u0432\u043E\u0434: \u043D\u0435\u0442 \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u044B\u0445 \u0442\u0435\u043C</b>

\u0412\u0441\u0435 \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u044B\u0435 \u0442\u0435\u043C\u044B \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u044B \u0438\u043B\u0438 \u0442\u0435\u043C \u043D\u0435\u0442.

\u041E\u0434\u043E\u0431\u0440\u0438 \u043D\u043E\u0432\u044B\u0435 \u0442\u0435\u043C\u044B \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439:
<code>/content_approve 3 4 5 6 7</code>

\u0418\u043B\u0438 \u0437\u0430\u043F\u0443\u0441\u0442\u0438 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044E \u043D\u043E\u0432\u044B\u0445:
<code>/content_plan</code>`
    )
    console.log(
      '[scheduler] \u041D\u0435\u0442 \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u044B\u0445 \u043D\u0435\u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0442\u0435\u043C'
    )
    return
  }
  const remaining = countApprovedUnpublished(topicsFile)
  console.log(
    `[scheduler] \u0417\u0430\u043F\u0443\u0441\u043A\u0430\u044E \u0442\u0435\u043C\u0443 #${nextTopic.id}: "${nextTopic.title}"`
  )
  console.log(
    `[scheduler] \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u044B\u0445 \u0442\u0435\u043C: ${remaining}`
  )
  if (remaining <= 6) {
    await sendMessage(
      `\u26A0\uFE0F <b>\u041A\u043E\u043D\u0442\u0435\u043D\u0442-\u0437\u0430\u0432\u043E\u0434: \u0442\u0435\u043C \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u043C\u0430\u043B\u043E (${remaining})</b>

\u0417\u0430\u043F\u0443\u0441\u0442\u0438 \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430 \u0438 \u043E\u0434\u043E\u0431\u0440\u0438 \u043D\u043E\u0432\u044B\u0435 \u0442\u0435\u043C\u044B:
<code>/content_plan</code>`
    )
  }
  await runWriter(nextTopic.id)
}
main().catch(async (e) => {
  console.error('[scheduler] \u041E\u0448\u0438\u0431\u043A\u0430:', e)
  await sendMessage(`\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A\u0430:
${e.message}`).catch(() => {})
  process.exit(1)
})
