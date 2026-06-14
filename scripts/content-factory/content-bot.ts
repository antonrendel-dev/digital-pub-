/**
 * Content Factory Bot
 * Telegram-бот для управления контент-заводом через топики группы.
 * Запуск: node content-bot.compiled.js
 * PM2: pm2 start content-bot.compiled.js --name content-factory-bot
 *
 * Команды (работают в любом топике):
 *   /content_plan          — запустить аналитика (генерация 25 тем)
 *   /content_approve 1 3 7 — одобрить темы и запустить writer для каждой
 *   /content_publish <id>  — опубликовать черновик из Payload CMS
 *   /content_help          — справка
 */

import { spawn } from 'child_process'
import path from 'path'

const BOT_TOKEN = process.env.CONTENT_BOT_TOKEN
const ALLOWED_USER_IDS = (process.env.ALLOWED_USER_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(Number)

if (!BOT_TOKEN) throw new Error('CONTENT_BOT_TOKEN не задан')

const API = `https://api.telegram.org/bot${BOT_TOKEN}`
const SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname)

// ─── Telegram API helpers ───────────────────────────────────────────────────

async function tgPost(method: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function reply(chatId: number, threadId: number | undefined, text: string): Promise<void> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }
  if (threadId) body.message_thread_id = threadId
  await tgPost('sendMessage', body)
}

// ─── Script runner ──────────────────────────────────────────────────────────

function runScript(script: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRIPTS_DIR, `${script}.compiled.js`)
    const child = spawn('node', [scriptPath, ...args], {
      cwd: SCRIPTS_DIR,
      env: process.env,
      stdio: 'inherit',
    })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${script} вышел с кодом ${code}`))
    })
    child.on('error', reject)
  })
}

// ─── Command handlers ───────────────────────────────────────────────────────

async function handleMessage(msg: {
  message_id: number
  from?: { id: number; first_name?: string }
  chat: { id: number }
  message_thread_id?: number
  text?: string
}): Promise<void> {
  const userId = msg.from?.id
  const chatId = msg.chat.id
  const threadId = msg.message_thread_id
  const text = (msg.text || '').trim()

  if (!text.startsWith('/')) return

  // Auth check
  if (ALLOWED_USER_IDS.length > 0 && userId && !ALLOWED_USER_IDS.includes(userId)) {
    await reply(chatId, threadId, '❌ Нет доступа.')
    return
  }

  const [cmd, ...args] = text.split(/\s+/)
  const command = cmd.split('@')[0] // strip @botusername

  if (command === '/content_help') {
    await reply(
      chatId,
      threadId,
      `🤖 <b>Content Factory Bot</b>\n\n` +
        `<b>Команды:</b>\n` +
        `/content_plan — сгенерировать 25 тем (аналитик)\n` +
        `/content_approve 1 3 7 — запустить writer для тем\n` +
        `/content_publish 42 — опубликовать черновик #42\n` +
        `/content_help — эта справка`
    )
    return
  }

  if (command === '/content_plan') {
    await reply(chatId, threadId, '📊 Запускаю аналитика...\n\nЭто займёт ~30 секунд.')
    runScript('analyst', []).catch(async (e) => {
      await reply(chatId, threadId, `❌ Ошибка аналитика:\n${e.message}`)
    })
    return
  }

  if (command === '/content_approve') {
    const nums = args.filter((a) => /^\d+$/.test(a))
    if (!nums.length) {
      await reply(chatId, threadId, 'Использование: <code>/content_approve 1 3 7</code>')
      return
    }
    await reply(
      chatId,
      threadId,
      `✅ Одобрено тем: <b>${nums.length}</b> (${nums.join(', ')})\n⏳ Запускаю генерацию...`
    )
    for (const num of nums) {
      runScript('writer', [num]).catch(async (e) => {
        await reply(chatId, threadId, `❌ Ошибка writer для темы #${num}:\n${e.message}`)
      })
    }
    return
  }

  if (command === '/content_publish') {
    const id = args[0]
    if (!id || !/^\d+$/.test(id)) {
      await reply(chatId, threadId, 'Использование: <code>/content_publish 42</code>')
      return
    }
    await reply(chatId, threadId, `📤 Публикую статью #${id}...`)
    runScript('publisher', [id]).catch(async (e) => {
      await reply(chatId, threadId, `❌ Ошибка publisher:\n${e.message}`)
    })
    return
  }
}

// ─── Long-polling loop ──────────────────────────────────────────────────────

async function poll(): Promise<void> {
  let offset = 0
  console.log('[content-bot] Запущен, жду команды...')

  while (true) {
    try {
      const data = (await tgPost('getUpdates', {
        offset,
        timeout: 30,
        allowed_updates: ['message'],
      })) as {
        ok: boolean
        result: Array<{ update_id: number; message?: Parameters<typeof handleMessage>[0] }>
      }

      if (data.ok && data.result.length) {
        for (const update of data.result) {
          offset = update.update_id + 1
          if (update.message) {
            handleMessage(update.message).catch((e) =>
              console.error('[content-bot] Ошибка обработки:', e)
            )
          }
        }
      }
    } catch (e) {
      console.error('[content-bot] Ошибка polling:', e)
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}

poll()
