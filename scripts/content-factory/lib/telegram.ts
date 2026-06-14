// Shared Telegram Bot API helper (no polling — HTTP only)
const BOT_TOKEN = process.env.BOT_TOKEN
const CHAT_ID = process.env.SEO_LAB_CHAT_ID
const THREAD_ID = process.env.SEO_LAB_TOPIC_ID ? Number(process.env.SEO_LAB_TOPIC_ID) : undefined

if (!BOT_TOKEN) throw new Error('BOT_TOKEN not set')
if (!CHAT_ID) throw new Error('SEO_LAB_CHAT_ID not set')

const API = `https://api.telegram.org/bot${BOT_TOKEN}`

export async function sendMessage(
  text: string,
  extra: Record<string, unknown> = {}
): Promise<number> {
  const body: Record<string, unknown> = {
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
  const data = (await res.json()) as {
    ok: boolean
    result?: { message_id: number }
    description?: string
  }
  if (!data.ok) throw new Error(`Telegram error: ${data.description}`)
  return data.result!.message_id
}

export async function editMessage(messageId: number, text: string): Promise<void> {
  await fetch(`${API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })
}
