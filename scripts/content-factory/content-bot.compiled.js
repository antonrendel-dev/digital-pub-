// content-bot.ts
import { spawn } from 'child_process'
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
/content_approve 1 3 7 \u2014 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C writer \u0434\u043B\u044F \u0442\u0435\u043C
/content_publish 42 \u2014 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A #42
/content_help \u2014 \u044D\u0442\u0430 \u0441\u043F\u0440\u0430\u0432\u043A\u0430`
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
    const nums = args.filter((a) => /^\d+$/.test(a))
    if (!nums.length) {
      await reply(
        chatId,
        threadId,
        '\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: <code>/content_approve 1 3 7</code>'
      )
      return
    }
    await reply(
      chatId,
      threadId,
      `\u2705 \u041E\u0434\u043E\u0431\u0440\u0435\u043D\u043E \u0442\u0435\u043C: <b>${nums.length}</b> (${nums.join(', ')})
\u23F3 \u0417\u0430\u043F\u0443\u0441\u043A\u0430\u044E \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044E...`
    )
    for (const num of nums) {
      runScript('writer', [num]).catch(async (e) => {
        await reply(
          chatId,
          threadId,
          `\u274C \u041E\u0448\u0438\u0431\u043A\u0430 writer \u0434\u043B\u044F \u0442\u0435\u043C\u044B #${num}:
${e.message}`
        )
      })
    }
    return
  }
  if (command === '/content_publish') {
    const id = args[0]
    if (!id || !/^\d+$/.test(id)) {
      await reply(
        chatId,
        threadId,
        '\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: <code>/content_publish 42</code>'
      )
      return
    }
    await reply(
      chatId,
      threadId,
      `\u{1F4E4} \u041F\u0443\u0431\u043B\u0438\u043A\u0443\u044E \u0441\u0442\u0430\u0442\u044C\u044E #${id}...`
    )
    runScript('publisher', [id]).catch(async (e) => {
      await reply(
        chatId,
        threadId,
        `\u274C \u041E\u0448\u0438\u0431\u043A\u0430 publisher:
${e.message}`
      )
    })
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
