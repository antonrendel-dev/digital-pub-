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
  // ШАГ 1: SEO-рисерч — интент, LSI-слова, структура конкурентов
  const research = await askClaude(`Ты SEO-аналитик для русскоязычного рынка digital-вакансий.

Проведи рисерч для статьи по теме: "${topic.title}"
Ключевое слово: "${topic.keyword}"
Аудитория: ${topic.audience}

Выдай JSON строго в таком формате (без лишнего текста):
{
  "intent": "информационный|коммерческий|навигационный",
  "lsi": ["слово1", "слово2", "слово3", "слово4", "слово5", "слово6", "слово7", "слово8"],
  "painPoints": ["боль читателя 1", "боль читателя 2", "боль читателя 3"],
  "competitorH2s": ["типичный H2 конкурента 1", "типичный H2 конкурента 2", "типичный H2 конкурента 3"],
  "uniqueAngle": "чем наша статья будет отличаться и лучше"
}`)

  const researchMatch = research.match(/\{[\s\S]*\}/)
  if (!researchMatch) throw new Error('SEO-рисерч не вернул JSON')
  const seoData = JSON.parse(researchMatch[0]) as {
    intent: string
    lsi: string[]
    painPoints: string[]
    competitorH2s: string[]
    uniqueAngle: string
  }

  // ШАГ 2: Планирование — детальный план с H2/H3
  const outline = await askClaude(`Ты контент-стратег. Составь детальный план статьи.

ТЕМА: ${topic.title}
КЛЮЧ: ${topic.keyword}
ТИП: ${topic.type}
ИНТЕНТ: ${seoData.intent}
LSI-слова для включения: ${seoData.lsi.join(', ')}
Боли аудитории: ${seoData.painPoints.join('; ')}
Уникальный угол: ${seoData.uniqueAngle}

Требования к плану:
- 5-7 блоков H2
- Каждый H2 раскрывает конкретную боль или вопрос аудитории
- Не дублируй структуру конкурентов: ${seoData.competitorH2s.join('; ')}
- Финальный блок — призыв смотреть вакансии на d-pub.ru

Выдай JSON (без лишнего текста):
{
  "h2s": [
    { "title": "Заголовок H2", "keyPoints": ["тезис 1", "тезис 2"] }
  ],
  "metaTitle": "SEO заголовок до 60 символов с ключом",
  "metaDesc": "SEO описание 130-155 символов, раскрывает пользу статьи",
  "slug": "url-slug-latinicej"
}`)

  const outlineMatch = outline.match(/\{[\s\S]*\}/)
  if (!outlineMatch) throw new Error('Планировщик не вернул JSON')
  const plan = JSON.parse(outlineMatch[0]) as {
    h2s: { title: string; keyPoints: string[] }[]
    metaTitle: string
    metaDesc: string
    slug: string
  }

  // ШАГ 3: Написание статьи по плану
  const planText = plan.h2s
    .map((h, i) => `${i + 1}. ${h.title}\n   Тезисы: ${h.keyPoints.join('; ')}`)
    .join('\n')

  const article = await askClaude(`Ты опытный SEO-копирайтер для российского рынка digital-вакансий.

Напиши статью для d-pub.ru — job board для digital-специалистов.

ТЕМА: ${topic.title}
КЛЮЧЕВОЕ СЛОВО: ${topic.keyword} (использовать в первом абзаце и 2-3 раза по тексту)
LSI-слова (вплети органично): ${seoData.lsi.join(', ')}
АУДИТОРИЯ: ${topic.audience}

ПЛАН (строго следуй этой структуре):
${planText}

Требования:
- Объём: 1200-1600 слов
- Начинай сразу с сути — без вводных "в этой статье мы..."
- Каждый H2 раскрывай практически: конкретные советы, цифры, примеры
- Стиль: профессиональный, живой, без канцелярита
- Упомяни d-pub.ru как источник вакансий 1-2 раза органично
- HTML только с тегами: h2, h3, p, ul, ol, li, strong, a

Ответь строго в формате JSON (без лишнего текста):
{
  "html": "<h2>...</h2><p>...</p>..."
}`)

  const articleMatch = article.match(/\{[\s\S]*\}/)
  if (!articleMatch) throw new Error('Writer не вернул JSON')
  const { html } = JSON.parse(articleMatch[0]) as { html: string }

  return {
    html,
    metaTitle: plan.metaTitle,
    metaDesc: plan.metaDesc,
    slug: toSlug(plan.slug || topic.title),
  }
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
    `✍️ Генерирую статью #${topicNum}:\n<b>${topic.title}</b>\n\n` +
      `🔍 SEO-рисерч → 📋 план → ✏️ текст\n\nЭто займёт ~2 минуты...`
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
