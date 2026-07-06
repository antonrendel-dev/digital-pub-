// content-bot.ts
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
var BOT_TOKEN = process.env.CONTENT_BOT_TOKEN
var ALLOWED_USER_IDS = (process.env.ALLOWED_USER_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(Number)
if (!BOT_TOKEN) throw new Error('CONTENT_BOT_TOKEN \u043D\u0435 \u0437\u0430\u0434\u0430\u043D')
var API = `https://api.telegram.org/bot${BOT_TOKEN}`
var SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname)
var DATA_DIR = path.join(SCRIPTS_DIR, 'data')
async function tgPost(method, body) {
  const res = await fetch(`${API}/${method}`, {
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
/content_plan \u2014 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C 25 \u0442\u0435\u043C (\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A)
/content_approve 1 3 7 \u2014 \u043E\u0434\u043E\u0431\u0440\u0438\u0442\u044C \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0442\u0435\u043C\u044B
/content_approve_all \u2014 \u043E\u0434\u043E\u0431\u0440\u0438\u0442\u044C \u0432\u0441\u0435 \u0442\u0435\u043C\u044B \u0441\u0440\u0430\u0437\u0443
/content_write 5 \u2014 \u043D\u0435\u043C\u0435\u0434\u043B\u0435\u043D\u043D\u043E \u043D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u0442\u0430\u0442\u044C\u044E #5
/content_next \u2014 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043E\u0447\u0435\u0440\u0435\u0434\u044C \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u044B\u0445 \u0442\u0435\u043C
/content_regen &lt;slug&gt; \u2014 \u043F\u0435\u0440\u0435\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443 \u0441\u0442\u0430\u0442\u044C\u0438
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
        '\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: <code>/content_regen rezyume-targetologa-shablon-2026</code>\n\n\u0421\u043B\u0430\u0433 \u2014 \u0445\u0432\u043E\u0441\u0442 URL \u0441\u0442\u0430\u0442\u044C\u0438 \u043D\u0430 d-pub.ru'
      )
      return
    }
    await reply(
      chatId,
      threadId,
      `\u{1F3A8} \u041F\u0435\u0440\u0435\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u044E \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443 \u0434\u043B\u044F <code>${slug}</code>...

\u042D\u0442\u043E \u0437\u0430\u0439\u043C\u0451\u0442 ~3 \u043C\u0438\u043D\u0443\u0442\u044B.`
    )
    runScript('regen', [slug])
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
