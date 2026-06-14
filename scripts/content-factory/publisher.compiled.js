// publisher.ts
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

// publisher.ts
var DATA_DIR = path.join(import.meta.dirname, 'data')
var PAYLOAD_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://d-pub.ru'
var ADMIN_EMAIL = process.env.PAYLOAD_ADMIN_EMAIL || process.env.ADMIN_EMAIL
var ADMIN_PASSWORD = process.env.PAYLOAD_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
var SITE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://d-pub.ru'
async function getPayloadToken() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD)
    throw new Error(
      'PAYLOAD_ADMIN_EMAIL / PAYLOAD_ADMIN_PASSWORD \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u044B'
    )
  const res = await fetch(`${PAYLOAD_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  const data = await res.json()
  if (!data.token) throw new Error(`Payload login failed: ${data.message}`)
  return data.token
}
async function getArticle(id, token) {
  const res = await fetch(`${PAYLOAD_URL}/api/articles/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!data.title)
    throw new Error(
      `\u0421\u0442\u0430\u0442\u044C\u044F ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430: ${JSON.stringify(data)}`
    )
  return { title: data.title, slug: data.slug || '', status: data.status || '' }
}
async function publishArticle(id, token) {
  const res = await fetch(`${PAYLOAD_URL}/api/articles/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: 'published' }),
  })
  const data = await res.json()
  if (!data.doc) throw new Error(`Payload publish failed: ${JSON.stringify(data)}`)
}
async function main() {
  const articleId = process.argv[2]
  if (!articleId || isNaN(Number(articleId))) {
    console.error(
      '\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: node publisher.compiled.js <payloadArticleId>'
    )
    process.exit(1)
  }
  console.log(
    `[publisher] \u041F\u0443\u0431\u043B\u0438\u043A\u0443\u044E \u0441\u0442\u0430\u0442\u044C\u044E ID=${articleId}...`
  )
  const token = await getPayloadToken()
  const article = await getArticle(articleId, token)
  if (article.status === 'published') {
    await sendMessage(
      `\u2139\uFE0F \u0421\u0442\u0430\u0442\u044C\u044F \u0443\u0436\u0435 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u0430:
<b>${article.title}</b>

\u{1F517} ${SITE_URL}/articles/${article.slug}`
    )
    console.log(
      `[publisher] \u0421\u0442\u0430\u0442\u044C\u044F ${articleId} \u0443\u0436\u0435 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u0430`
    )
    return
  }
  await publishArticle(articleId, token)
  const publicUrl = `${SITE_URL}/articles/${article.slug}`
  await sendMessage(
    `\u{1F680} <b>\u0421\u0442\u0430\u0442\u044C\u044F \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u0430!</b>

\u{1F4CC} ${article.title}

\u{1F517} ${publicUrl}`
  )
  console.log(
    `[publisher] \u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043E: ${publicUrl}`
  )
}
main().catch((e) => {
  console.error('[publisher] \u041E\u0448\u0438\u0431\u043A\u0430:', e)
  sendMessage(`\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438:
${e.message}`).catch(() => {})
  process.exit(1)
})
