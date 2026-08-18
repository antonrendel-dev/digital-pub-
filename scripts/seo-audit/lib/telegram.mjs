// Отправка в топик «SEO лаба». Свой модуль, а не общий с content-factory:
// заводу разбивка длинных сообщений не нужна, а трогать его сборку ради аудита рискованно.
const BOT_TOKEN = process.env.CONTENT_BOT_TOKEN || process.env.BOT_TOKEN
const CHAT_ID = process.env.SEO_LAB_CHAT_ID
const THREAD_ID = process.env.SEO_LAB_TOPIC_ID ? Number(process.env.SEO_LAB_TOPIC_ID) : undefined

// Лимит Telegram — 4096 символов UTF-16 вместе с HTML-тегами. Режем с запасом.
const CHUNK_LIMIT = 3500
const PAUSE_MS = 400
// Запас на дописываемые при разрыве <pre>…</pre> и суффикс «(1/3)»
const TAG_RESERVE = 40

export const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Режем по строкам. Таблицы могут быть длиннее лимита, поэтому разрыв внутри <pre>
// закрываем и переоткрываем — иначе Telegram отвергнет сообщение с незакрытым тегом.
export function splitMessage(text, limit = CHUNK_LIMIT) {
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
    signal: AbortSignal.timeout(30_000),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram: ${data.description}`)
  return data.result.message_id
}

export async function sendDocument(filePath, caption = '') {
  if (!BOT_TOKEN) throw new Error('CONTENT_BOT_TOKEN не задан')
  const { readFileSync } = await import('node:fs')
  const { basename } = await import('node:path')

  const form = new FormData()
  form.append('chat_id', CHAT_ID)
  if (THREAD_ID) form.append('message_thread_id', String(THREAD_ID))
  if (caption) {
    form.append('caption', caption)
    form.append('parse_mode', 'HTML')
  }
  form.append('document', new Blob([readFileSync(filePath)]), basename(filePath))

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60_000),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram sendDocument: ${data.description}`)
  return data.result.message_id
}

export async function sendLongMessage(text) {
  if (!BOT_TOKEN) throw new Error('CONTENT_BOT_TOKEN не задан')
  if (!CHAT_ID) throw new Error('SEO_LAB_CHAT_ID не задан')

  const chunks = splitMessage(text)
  const ids = []
  for (const [i, chunk] of chunks.entries()) {
    const suffix = chunks.length > 1 ? `\n\n<i>(${i + 1}/${chunks.length})</i>` : ''
    ids.push(await send(chunk + suffix))
    if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, PAUSE_MS))
  }
  return ids
}
