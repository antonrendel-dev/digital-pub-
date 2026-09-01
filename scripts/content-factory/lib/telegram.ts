// Shared Telegram Bot API helper (no polling — HTTP only)
const BOT_TOKEN = process.env.CONTENT_BOT_TOKEN || process.env.BOT_TOKEN
const CHAT_ID = process.env.SEO_LAB_CHAT_ID
const THREAD_ID = process.env.SEO_LAB_TOPIC_ID ? Number(process.env.SEO_LAB_TOPIC_ID) : undefined

if (!BOT_TOKEN) throw new Error('BOT_TOKEN not set')
if (!CHAT_ID) throw new Error('SEO_LAB_CHAT_ID not set')

const API = `https://api.telegram.org/bot${BOT_TOKEN}`

import { ANNOUNCE_CHANNEL, announceText } from './announce.js'

/** Канал можно переопределить окружением — удобно для проверки на своём. */
const CHANNEL = process.env.CONTENT_CHANNEL || ANNOUNCE_CHANNEL

/**
 * Анонс статьи в канал.
 *
 * Превью ссылки намеренно включено: в нём подтягивается обложка и заголовок,
 * ради них анонс и существует. В рабочем чате наоборот — там превью мешает.
 *
 * Ошибка отправки возвращается наружу, а не глотается: решает вызывающий.
 * Для писателя это некритично — статья к тому моменту уже опубликована.
 */
export async function announceToChannel(url: string): Promise<number> {
  const text = announceText(url)
  const res = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHANNEL,
      text,
      disable_web_page_preview: false,
    }),
  })
  const data = (await res.json()) as {
    ok: boolean
    result?: { message_id: number }
    description?: string
  }
  if (!data.ok) throw new Error(`Telegram (канал): ${data.description}`)
  return data.result!.message_id
}

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

/**
 * Предполётная проверка доступа в канал.
 *
 * 01.09.2026 анонс упал на последнем шаге прогона: бот не был администратором
 * @web_vacancy. Статья вышла, а анонс пришлось слать руками. Проверка стоит
 * копейки и делается до того, как потрачен весь прогон.
 *
 * Возвращает null, если всё в порядке, иначе — что именно не так.
 */
export async function checkChannelAccess(): Promise<string | null> {
  try {
    const me = (await (await fetch(`${API}/getMe`)).json()) as {
      ok: boolean
      result?: { id: number; username?: string }
    }
    if (!me.ok || !me.result) return 'не удалось определить бота (getMe)'
    const url = `${API}/getChatMember?chat_id=${encodeURIComponent(CHANNEL)}&user_id=${me.result.id}`
    const d = (await (await fetch(url)).json()) as {
      ok: boolean
      description?: string
      result?: { status: string; can_post_messages?: boolean }
    }
    if (!d.ok) return `нет доступа к ${CHANNEL}: ${d.description}`
    const r = d.result!
    if (r.status !== 'administrator')
      return `бот в ${CHANNEL} со статусом «${r.status}», нужен администратор`
    if (r.can_post_messages === false) return `бот в ${CHANNEL} без права публикации`
    return null
  } catch (e) {
    return `проверка канала не прошла: ${(e as Error).message}`
  }
}
