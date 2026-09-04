/**
 * Content Factory Bot
 * Telegram-бот для управления контент-заводом через топики группы.
 * Запуск: node content-bot.compiled.js
 * PM2: pm2 start content-bot.compiled.js --name content-factory-bot
 *
 * Команды (работают в любом топике):
 *   /content_plan          — запустить аналитика (батч тем на календарный месяц)
 *   /content_approve 1 3 7 — одобрить темы (записываются в JSON, writer запустится по cron)
 *   /content_write <num>   — немедленно написать статью по теме №<num>
 *   /content_next          — показать следующую очередь одобренных тем
 *   /content_help          — справка
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { type LockInfo, ScriptLock, escapeHtml, isValidSlug } from './lib/bot-guard.js'

const BOT_TOKEN = process.env.CONTENT_BOT_TOKEN
const ALLOWED_USER_IDS = (process.env.ALLOWED_USER_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(Number)

if (!BOT_TOKEN) throw new Error('CONTENT_BOT_TOKEN не задан')

const API = `https://api.telegram.org/bot${BOT_TOKEN}`
const SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname)
const DATA_DIR = path.join(SCRIPTS_DIR, 'data')
// Один активный процесс завода на бота: второй запрос получает «уже идёт задача».
const scriptLock = new ScriptLock(path.join(DATA_DIR, '.bot-script.lock'))
if (ALLOWED_USER_IDS.length === 0) {
  console.warn('[content-bot] ALLOWED_USER_IDS пуст — команды не принимаются ни от кого')
}

interface Topic {
  id: number
  title: string
  keyword: string
  audience: string
  type: string
  trafficEst: string
  approved?: boolean
  published?: boolean
}

// ─── Telegram API helpers ───────────────────────────────────────────────────

async function tgPost(method: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as { ok?: boolean; description?: string }
  // Отказ Bot API (чаще всего «can't parse entities») раньше терялся молча:
  // бот выглядел живым, а ответы не доходили.
  if (data.ok === false) console.error(`[content-bot] ${method}: ${data.description ?? 'ok=false'}`)
  return data
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

// ─── Topics helpers ─────────────────────────────────────────────────────────

function getLatestTopicsFile(): string | null {
  if (!fs.existsSync(DATA_DIR)) return null
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('topics_') && f.endsWith('.json'))
    .sort()
    .reverse()
  return files.length ? path.join(DATA_DIR, files[0]) : null
}

function approveTopics(
  topicsFile: string,
  ids: number[]
): { approved: number[]; notFound: number[] } {
  const raw = JSON.parse(fs.readFileSync(topicsFile, 'utf-8')) as {
    date: string
    topics: Topic[]
  }
  const approved: number[] = []
  const notFound: number[] = []
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

function getQueueSummary(topicsFile: string): string {
  const { topics } = JSON.parse(fs.readFileSync(topicsFile, 'utf-8')) as {
    date: string
    topics: Topic[]
  }
  const approvedNotPublished = topics.filter((t) => t.approved && !t.published)
  const published = topics.filter((t) => t.published)
  const pending = topics.filter((t) => !t.approved && !t.published)

  if (!approvedNotPublished.length) {
    return `📭 Одобренных тем нет. Опубликовано: ${published.length}. Ожидают одобрения: ${pending.length}.`
  }

  // Название и ключ пишет аналитик (модель): «&» или «<» в теме ломали разметку всего ответа.
  const lines = approvedNotPublished.map(
    (t, i) => `${i + 1}. #${t.id} <b>${escapeHtml(t.title)}</b>\n   🔑 ${escapeHtml(t.keyword)}`
  )
  return (
    `📋 <b>Очередь публикаций (${approvedNotPublished.length} тем):</b>\n\n` +
    lines.join('\n\n') +
    `\n\n⏰ Публикуется пн/ср/пт в 09:00 МСК`
  )
}

// ─── Script runner ──────────────────────────────────────────────────────────

function runScript(script: string, args: string[], onSpawn?: (pid: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRIPTS_DIR, `${script}.compiled.js`)
    const child = spawn('node', [scriptPath, ...args], {
      cwd: SCRIPTS_DIR,
      env: process.env,
      stdio: 'inherit',
    })
    if (child.pid && onSpawn) onSpawn(child.pid)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${script} вышел с кодом ${code}`))
    })
    child.on('error', reject)
  })
}

async function replyBusy(chatId: number, threadId: number | undefined, busy: LockInfo) {
  const started = Date.parse(busy.startedAt)
  const since = Number.isFinite(started)
    ? ` (с ${new Date(started).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' })} МСК)`
    : ''
  await reply(
    chatId,
    threadId,
    `⏳ Уже идёт задача <b>${escapeHtml(busy.label)}</b>${since}. Дождитесь её завершения.`
  )
}

/** Проверка до сообщения «Запускаю…»: занято — отвечаем и не запускаем. */
async function refuseIfBusy(chatId: number, threadId: number | undefined): Promise<boolean> {
  const busy = scriptLock.holder()
  if (!busy) return false
  await replyBusy(chatId, threadId, busy)
  return true
}

/**
 * Запуск под локом: пока один скрипт работает, второй не стартует, а бот
 * отвечает, что именно идёт. Ответ «занято» — через reply, чтобы форма
 * сообщений команд не менялась.
 */
async function runLocked(
  chatId: number,
  threadId: number | undefined,
  label: string,
  script: string,
  args: string[]
): Promise<boolean> {
  const busy = scriptLock.acquire(label)
  if (busy) {
    await replyBusy(chatId, threadId, busy)
    return false
  }
  try {
    // В файле лока — pid ребёнка: он и должен пережить рестарт бота, а не сам бот.
    await runScript(script, args, (pid) => scriptLock.attachPid(pid))
  } finally {
    scriptLock.release()
  }
  return true
}

// systemctl restart шлёт SIGTERM: finally не выполнится, файл лока остался бы
// с pid убитого ребёнка. Снимаем сами и выходим.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    scriptLock.release()
    process.exit(0)
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

  // Auth check: апдейт без отправителя или не из списка — молча мимо.
  // Пустой список означает «никому», а не «всем».
  if (!userId || !ALLOWED_USER_IDS.includes(userId)) {
    if (userId) await reply(chatId, threadId, '❌ Нет доступа.')
    return
  }

  const [cmd, ...args] = text.split(/\s+/)
  const command = cmd.split('@')[0]

  if (command === '/content_help') {
    await reply(
      chatId,
      threadId,
      `🤖 <b>Content Factory Bot</b>\n\n` +
        `<b>Команды:</b>\n` +
        `/content_plan — сгенерировать батч тем на месяц (аналитик)\n` +
        `/content_approve 1 3 7 — одобрить выбранные темы\n` +
        `/content_approve_all — одобрить все темы сразу\n` +
        `/content_write 5 — немедленно написать статью #5\n` +
        `/content_next — показать очередь одобренных тем\n` +
        `/content_regen &lt;slug&gt; [сцена] — перегенерировать картинку статьи\n` +
        `/content_help — эта справка\n\n` +
        `<b>Автоматика:</b>\n` +
        `Каждый пн/ср/пт в 09:00 МСК берётся следующая одобренная тема и публикуется.`
    )
    return
  }

  if (command === '/content_plan') {
    if (await refuseIfBusy(chatId, threadId)) return
    await reply(chatId, threadId, '📊 Запускаю аналитика...\n\nЭто займёт ~30 секунд.')
    runLocked(chatId, threadId, 'аналитик', 'analyst', []).catch(async (e) => {
      await reply(chatId, threadId, `❌ Ошибка аналитика:\n${escapeHtml(e.message)}`)
    })
    return
  }

  if (command === '/content_approve') {
    const nums = args.filter((a) => /^\d+$/.test(a)).map(Number)
    if (!nums.length) {
      await reply(chatId, threadId, 'Использование: <code>/content_approve 1 3 7</code>')
      return
    }

    const topicsFile = getLatestTopicsFile()
    if (!topicsFile) {
      await reply(chatId, threadId, '❌ Нет файлов с темами. Запусти <code>/content_plan</code>')
      return
    }

    const { approved, notFound } = approveTopics(topicsFile, nums)

    let msg = `✅ Одобрено тем: <b>${approved.length}</b> (${approved.join(', ')})`
    if (notFound.length) msg += `\n⚠️ Не найдено: ${notFound.join(', ')}`
    msg += `\n\n⏰ Будут опубликованы по расписанию (пн/ср/пт 09:00 МСК)`
    msg += `\n\nПоказать очередь: <code>/content_next</code>`

    await reply(chatId, threadId, msg)
    return
  }

  if (command === '/content_approve_all') {
    const topicsFile = getLatestTopicsFile()
    if (!topicsFile) {
      await reply(chatId, threadId, '❌ Нет файлов с темами. Запусти <code>/content_plan</code>')
      return
    }

    const raw = JSON.parse(fs.readFileSync(topicsFile, 'utf-8')) as {
      date: string
      topics: Topic[]
    }
    const pending = raw.topics.filter((t) => !t.published)
    pending.forEach((t) => (t.approved = true))
    fs.writeFileSync(topicsFile, JSON.stringify(raw, null, 2))

    await reply(
      chatId,
      threadId,
      `✅ Все <b>${pending.length}</b> неопубликованных тем одобрены!\n\n` +
        `⏰ Публикация пн/ср/пт в 09:00 МСК\n\n` +
        `Очередь: <code>/content_next</code>`
    )
    return
  }

  if (command === '/content_write') {
    const num = args[0]
    if (!num || !/^\d+$/.test(num)) {
      await reply(chatId, threadId, 'Использование: <code>/content_write 5</code>')
      return
    }
    if (await refuseIfBusy(chatId, threadId)) return
    await reply(chatId, threadId, `⚡ Запускаю немедленную генерацию темы #${num}...`)
    runLocked(chatId, threadId, `статья #${num}`, 'writer', [num]).catch(async (e) => {
      await reply(chatId, threadId, `❌ Ошибка writer для темы #${num}:\n${escapeHtml(e.message)}`)
    })
    return
  }

  if (command === '/content_regen') {
    const slug = args[0]
    if (!slug) {
      await reply(
        chatId,
        threadId,
        'Использование:\n' +
          '<code>/content_regen &lt;slug&gt;</code> — авто-сцена по теме\n' +
          '<code>/content_regen &lt;slug&gt; кофейня, ноутбук, закат</code> — своя сцена\n\n' +
          'Слаг — хвост URL статьи на d-pub.ru'
      )
      return
    }
    if (!isValidSlug(slug)) {
      await reply(
        chatId,
        threadId,
        `❌ Неверный slug: <code>${escapeHtml(slug)}</code>. Только строчные латинские буквы, цифры и дефис.`
      )
      return
    }
    const customScene = args.slice(1).join(' ').trim()
    const hint = customScene ? `\nСцена: <i>${escapeHtml(customScene)}</i>` : ''
    if (await refuseIfBusy(chatId, threadId)) return
    await reply(
      chatId,
      threadId,
      `🎨 Перегенерирую картинку для <code>${slug}</code>...${hint}\n\nЭто займёт ~3 минуты.`
    )
    runLocked(
      chatId,
      threadId,
      `картинка ${slug}`,
      'regen',
      customScene ? [slug, customScene] : [slug]
    )
      .then(async (started) => {
        if (started) {
          await reply(
            chatId,
            threadId,
            `✅ Картинка обновлена!\n\nhttps://d-pub.ru/articles/${slug}`
          )
        }
      })
      .catch(async (e) => {
        await reply(chatId, threadId, `❌ Ошибка:\n${escapeHtml(e.message)}`)
      })
    return
  }

  if (command === '/content_next') {
    const topicsFile = getLatestTopicsFile()
    if (!topicsFile) {
      await reply(chatId, threadId, '❌ Нет файлов с темами. Запусти <code>/content_plan</code>')
      return
    }
    await reply(chatId, threadId, getQueueSummary(topicsFile))
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
