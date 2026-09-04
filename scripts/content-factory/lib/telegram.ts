// Shared Telegram Bot API helper (no polling — HTTP only)
const BOT_TOKEN = process.env.CONTENT_BOT_TOKEN || process.env.BOT_TOKEN
const CHAT_ID = process.env.SEO_LAB_CHAT_ID
const THREAD_ID = process.env.SEO_LAB_TOPIC_ID ? Number(process.env.SEO_LAB_TOPIC_ID) : undefined

if (!BOT_TOKEN) throw new Error('BOT_TOKEN not set')
if (!CHAT_ID) throw new Error('SEO_LAB_CHAT_ID not set')

const API = `https://api.telegram.org/bot${BOT_TOKEN}`

import fs from 'fs'
import path from 'path'

import { ANNOUNCE_CHANNEL, announceText } from './announce.js'

/** Канал можно переопределить окружением — удобно для проверки на своём. */
const CHANNEL = process.env.CONTENT_CHANNEL || ANNOUNCE_CHANNEL

/**
 * Анонс статьи в канал.
 *
 * Обложку отправляем файлом, а не полагаемся на превью ссылки. С 03.09.2026
 * Telegram перестал забирать что-либо с d-pub.ru: превью не строится ни для
 * страниц, ни для прямых ссылок на картинку — окно «загружаю» появляется
 * и гаснет пустым. Проверено всё, что видно снаружи: разметка, форматы,
 * сертификат, robots, заголовки, Range-запросы — сервер отвечает 200 и Google
 * страницу забирает. Причина на стороне доставки к Telegram, и до её выяснения
 * анонс не должен зависеть от того, дотянется ли он до нас: байты картинки
 * уходят в запросе, ссылка живёт подписью.
 *
 * Нет файла или отказ на sendPhoto — откатываемся на обычное сообщение:
 * анонс без картинки лучше, чем молчание.
 *
 * Ошибка отправки возвращается наружу, а не глотается: решает вызывающий.
 * Для писателя это некритично — статья к тому моменту уже опубликована.
 */
export async function announceToChannel(url: string, imagePath?: string): Promise<number> {
  if (imagePath && fs.existsSync(imagePath)) {
    try {
      return await announceWithPhoto(url, imagePath)
    } catch (e) {
      console.warn(`    ⚠ анонс картинкой не ушёл (${(e as Error).message}), шлю ссылкой`)
    }
  }
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

/** Отправка обложки файлом: подпись с ссылкой, картинка из наших байтов. */
async function announceWithPhoto(url: string, imagePath: string): Promise<number> {
  const form = new FormData()
  form.append('chat_id', CHANNEL)
  form.append('caption', announceText(url))
  form.append('photo', new Blob([fs.readFileSync(imagePath)]), path.basename(imagePath))
  const res = await fetch(`${API}/sendPhoto`, { method: 'POST', body: form })
  const data = (await res.json()) as {
    ok: boolean
    result?: { message_id: number }
    description?: string
  }
  if (!data.ok) throw new Error(`Telegram (канал, фото): ${data.description}`)
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
