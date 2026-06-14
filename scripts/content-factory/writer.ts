/**
 * Content Factory — Writer
 * Берёт тему по номеру, пишет SEO-статью, сохраняет черновик в Payload CMS.
 * Запуск: node writer.compiled.js <topicNum>
 * Вызывается из Python-бота при /content_approve
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { sendMessage } from './lib/telegram.js'

const DATA_DIR = path.join(import.meta.dirname, 'data')
const PAYLOAD_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://d-pub.ru'

const TRANSLIT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .split('')
    .map((c) => TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
const ADMIN_EMAIL = process.env.PAYLOAD_ADMIN_EMAIL || process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.PAYLOAD_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD

interface Topic {
  id: number
  title: string
  keyword: string
  audience: string
  type: string
  trafficEst: string
}

function getLatestTopicsFile(): string {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('topics_') && f.endsWith('.json'))
    .sort()
    .reverse()
  if (!files.length) throw new Error('Нет файлов с темами. Сначала запусти analyst.js')
  return path.join(DATA_DIR, files[0])
}

function askClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', prompt], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d: Buffer) => (out += d.toString()))
    child.stderr.on('data', (d: Buffer) => (err += d.toString()))
    child.on('close', (code) => {
      if (code === 0) resolve(out.trim())
      else reject(new Error(err || `claude завершился с кодом ${code}`))
    })
    child.on('error', reject)
  })
}

async function generateSeoHtml(
  topic: Topic
): Promise<{ html: string; metaTitle: string; metaDesc: string; slug: string }> {
  const raw = await askClaude(`Ты опытный SEO-копирайтер для российского рынка digital-вакансий.

Напиши статью для сайта d-pub.ru — job board для digital-специалистов (маркетологи, SMM, дизайнеры, аналитики).

ТЕМА: ${topic.title}
КЛЮЧЕВОЕ СЛОВО: ${topic.keyword}
АУДИТОРИЯ: ${topic.audience}
ТИП: ${topic.type}

Требования:
- Объём: 900-1300 слов
- Структура: H2 подзаголовки, нумерованные/маркированные списки где уместно
- Практичность: конкретные советы, примеры, цифры
- Стиль: профессиональный но живой, без канцелярита
- Упоминай d-pub.ru как источник вакансий 1-2 раза органично
- Без вступлений типа "В этой статье мы расскажем..."
- Начинай сразу с сути

Ответь строго в формате JSON (без лишнего текста):
{
  "slug": "transliterated-url-slug",
  "metaTitle": "SEO заголовок до 60 символов",
  "metaDesc": "SEO описание 120-155 символов",
  "html": "<h2>Заголовок</h2><p>Текст...</p>..."
}`)

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude не вернул JSON')
  const result = JSON.parse(jsonMatch[0])
  result.slug = toSlug(result.slug || topic.title)
  return result
}

async function getPayloadToken(): Promise<string> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD)
    throw new Error('PAYLOAD_ADMIN_EMAIL / PAYLOAD_ADMIN_PASSWORD не заданы')
  const res = await fetch(`${PAYLOAD_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  const data = (await res.json()) as { token?: string; message?: string }
  if (!data.token) throw new Error(`Payload login failed: ${data.message}`)
  return data.token
}

async function createDraft(
  topic: Topic,
  seo: { html: string; metaTitle: string; metaDesc: string; slug: string },
  token: string
): Promise<string> {
  const res = await fetch(`${PAYLOAD_URL}/api/articles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: topic.title,
      slug: seo.slug,
      description: seo.metaDesc,
      metaTitle: seo.metaTitle,
      metaDescription: seo.metaDesc,
      content: seo.html,
      status: 'draft',
      publishedAt: new Date().toISOString(),
    }),
  })
  const data = (await res.json()) as {
    id?: string | number
    doc?: { id: string | number }
    errors?: unknown[]
  }
  const id = data.id ?? data.doc?.id
  if (!id) throw new Error(`Payload create failed: ${JSON.stringify(data)}`)
  return String(id)
}

async function main() {
  const topicNum = parseInt(process.argv[2])
  if (isNaN(topicNum)) {
    console.error('Использование: node writer.compiled.js <topicNum>')
    process.exit(1)
  }

  const topicsFile = getLatestTopicsFile()
  const { topics } = JSON.parse(fs.readFileSync(topicsFile, 'utf8')) as { topics: Topic[] }
  const topic = topics.find((t) => t.id === topicNum)
  if (!topic) throw new Error(`Тема #${topicNum} не найдена в ${topicsFile}`)

  console.log(`[writer] Пишу статью: "${topic.title}"`)
  await sendMessage(
    `✍️ Генерирую статью #${topicNum}:\n<b>${topic.title}</b>\n\nЭто займёт ~30 секунд...`
  )

  const seo = await generateSeoHtml(topic)
  console.log('[writer] Статья написана, сохраняю черновик...')

  const token = await getPayloadToken()
  const draftId = await createDraft(topic, seo, token)

  const adminLink = `${PAYLOAD_URL}/admin/collections/articles/${draftId}`
  await sendMessage(
    `✅ <b>Черновик #${topicNum} готов!</b>\n\n` +
      `📌 ${topic.title}\n` +
      `🔑 ${topic.keyword} · ${topic.trafficEst} трафик\n\n` +
      `👀 Просмотр и редактирование:\n${adminLink}\n\n` +
      `Чтобы опубликовать:\n<code>/content_publish ${draftId}</code>`
  )

  console.log(`[writer] Черновик создан: ID=${draftId}, ссылка: ${adminLink}`)
}

main().catch((e) => {
  console.error('[writer] Ошибка:', e)
  sendMessage(`❌ Ошибка при генерации статьи:\n${e.message}`).catch(() => {})
  process.exit(1)
})
