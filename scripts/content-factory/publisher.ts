/**
 * Content Factory — Publisher
 * Публикует черновик из Payload CMS (draft → published).
 * Запуск: node publisher.compiled.js <payloadArticleId>
 * Вызывается из Python-бота при /content_publish
 */

import fs from 'fs'
import path from 'path'
import { sendMessage } from './lib/telegram.js'

const DATA_DIR = path.join(import.meta.dirname, 'data')
const PAYLOAD_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://d-pub.ru'
// S21: публикация от пользователя завода с правом canPublish по API-ключу,
// а не паролем админа. Логин админом оставлен запасным путём до переезда
// секретов в .env завода (файл root:claude, правит Тони) и пишет в лог, что устарел.
const FACTORY_API_KEY = process.env.PAYLOAD_FACTORY_API_KEY
const ADMIN_EMAIL = process.env.PAYLOAD_ADMIN_EMAIL || process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.PAYLOAD_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
const SITE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://d-pub.ru'

/** Значение заголовка Authorization: API-ключ завода, иначе JWT админа. */
async function getAuthorization(): Promise<string> {
  if (FACTORY_API_KEY) return `users API-Key ${FACTORY_API_KEY}`
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD)
    throw new Error('PAYLOAD_FACTORY_API_KEY не задан (и нет запасных PAYLOAD_ADMIN_*)')
  const legacy =
    '⚠️ publisher публикует паролем админа — устарело (S21): заведите PAYLOAD_FACTORY_API_KEY и уберите PAYLOAD_ADMIN_* из .env завода'
  console.warn(`[publisher] ${legacy}`)
  // stdout бота никто не читает — предупреждение уходит и в рабочий топик.
  await sendMessage(legacy).catch(() => {})
  const res = await fetch(`${PAYLOAD_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  const data = (await res.json()) as { token?: string; message?: string }
  if (!data.token) throw new Error(`Payload login failed: ${data.message}`)
  return `Bearer ${data.token}`
}

async function getArticle(
  id: string,
  authorization: string
): Promise<{ title: string; slug: string; status: string }> {
  const res = await fetch(`${PAYLOAD_URL}/api/articles/${id}`, {
    headers: { Authorization: authorization },
  })
  const data = (await res.json()) as {
    title?: string
    slug?: string
    status?: string
    errors?: unknown[]
  }
  if (!data.title) throw new Error(`Статья ${id} не найдена: ${JSON.stringify(data)}`)
  return { title: data.title, slug: data.slug || '', status: data.status || '' }
}

async function publishArticle(id: string, authorization: string): Promise<void> {
  const res = await fetch(`${PAYLOAD_URL}/api/articles/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({ status: 'published' }),
  })
  const data = (await res.json()) as { id?: unknown; doc?: unknown; errors?: unknown[] }
  if (!data.id && !data.doc) throw new Error(`Payload publish failed: ${JSON.stringify(data)}`)
}

async function main() {
  const articleId = process.argv[2]
  if (!articleId || isNaN(Number(articleId))) {
    console.error('Использование: node publisher.compiled.js <payloadArticleId>')
    process.exit(1)
  }

  console.log(`[publisher] Публикую статью ID=${articleId}...`)

  const token = await getAuthorization()
  const article = await getArticle(articleId, token)

  if (article.status === 'published') {
    await sendMessage(
      `ℹ️ Статья уже опубликована:\n<b>${article.title}</b>\n\n🔗 ${SITE_URL}/articles/${article.slug}`
    )
    console.log(`[publisher] Статья ${articleId} уже опубликована`)
    return
  }

  await publishArticle(articleId, token)

  const publicUrl = `${SITE_URL}/articles/${article.slug}`
  await sendMessage(
    `🚀 <b>Статья опубликована!</b>\n\n` + `📌 ${article.title}\n\n` + `🔗 ${publicUrl}`
  )

  console.log(`[publisher] Опубликовано: ${publicUrl}`)
}

main().catch((e) => {
  console.error('[publisher] Ошибка:', e)
  sendMessage(`❌ Ошибка при публикации:\n${e.message}`).catch(() => {})
  process.exit(1)
})
