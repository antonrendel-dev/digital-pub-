// writer.ts
import { execSync, spawn } from 'child_process'
import fs from 'fs'
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

// writer.ts
var DATA_DIR = path.join(import.meta.dirname, 'data')
var PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..')
var ARTICLES_DIR = path.join(PROJECT_ROOT, 'content', 'articles')
var IMAGES_DIR = path.join(PROJECT_ROOT, 'public', 'images', 'posts')
var SITE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://d-pub.ru'
var TRANSLIT = {
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
function toSlug(s) {
  return s
    .toLowerCase()
    .split('')
    .map((c) => TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
function getLatestTopicsFile() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('topics_') && f.endsWith('.json'))
    .sort()
    .reverse()
  if (!files.length)
    throw new Error(
      '\u041D\u0435\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u0441 \u0442\u0435\u043C\u0430\u043C\u0438. \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u043F\u0443\u0441\u0442\u0438 analyst.js'
    )
  return path.join(DATA_DIR, files[0])
}
function markTopicPublished(topicsFile, topicId) {
  const raw = JSON.parse(fs.readFileSync(topicsFile, 'utf-8'))
  const topic = raw.topics.find((t) => t.id === topicId)
  if (topic) topic.published = true
  fs.writeFileSync(topicsFile, JSON.stringify(raw, null, 2))
}
function askClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', prompt], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d.toString()))
    child.stderr.on('data', (d) => (err += d.toString()))
    child.on('close', (code) => {
      if (code === 0) resolve(out.trim())
      else
        reject(
          new Error(
            err ||
              `claude \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u0441 \u043A\u043E\u0434\u043E\u043C ${code}`
          )
        )
    })
    child.on('error', reject)
  })
}
async function generateMdxArticle(topic) {
  const research =
    await askClaude(`\u0422\u044B SEO-\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A \u0434\u043B\u044F \u0440\u0443\u0441\u0441\u043A\u043E\u044F\u0437\u044B\u0447\u043D\u043E\u0433\u043E \u0440\u044B\u043D\u043A\u0430 digital-\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439.

\u041F\u0440\u043E\u0432\u0435\u0434\u0438 \u0440\u0438\u0441\u0435\u0440\u0447 \u0434\u043B\u044F \u0441\u0442\u0430\u0442\u044C\u0438 \u043F\u043E \u0442\u0435\u043C\u0435: "${topic.title}"
\u041A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E: "${topic.keyword}"
\u0410\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u044F: ${topic.audience}

\u0412\u044B\u0434\u0430\u0439 JSON \u0441\u0442\u0440\u043E\u0433\u043E \u0432 \u0442\u0430\u043A\u043E\u043C \u0444\u043E\u0440\u043C\u0430\u0442\u0435 (\u0431\u0435\u0437 \u043B\u0438\u0448\u043D\u0435\u0433\u043E \u0442\u0435\u043A\u0441\u0442\u0430):
{
  "intent": "\u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0439|\u043A\u043E\u043C\u043C\u0435\u0440\u0447\u0435\u0441\u043A\u0438\u0439|\u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0439",
  "lsi": ["\u0441\u043B\u043E\u0432\u043E1", "\u0441\u043B\u043E\u0432\u043E2", "\u0441\u043B\u043E\u0432\u043E3", "\u0441\u043B\u043E\u0432\u043E4", "\u0441\u043B\u043E\u0432\u043E5", "\u0441\u043B\u043E\u0432\u043E6", "\u0441\u043B\u043E\u0432\u043E7", "\u0441\u043B\u043E\u0432\u043E8"],
  "painPoints": ["\u0431\u043E\u043B\u044C \u0447\u0438\u0442\u0430\u0442\u0435\u043B\u044F 1", "\u0431\u043E\u043B\u044C \u0447\u0438\u0442\u0430\u0442\u0435\u043B\u044F 2", "\u0431\u043E\u043B\u044C \u0447\u0438\u0442\u0430\u0442\u0435\u043B\u044F 3"],
  "competitorH2s": ["\u0442\u0438\u043F\u0438\u0447\u043D\u044B\u0439 H2 \u043A\u043E\u043D\u043A\u0443\u0440\u0435\u043D\u0442\u0430 1", "\u0442\u0438\u043F\u0438\u0447\u043D\u044B\u0439 H2 \u043A\u043E\u043D\u043A\u0443\u0440\u0435\u043D\u0442\u0430 2", "\u0442\u0438\u043F\u0438\u0447\u043D\u044B\u0439 H2 \u043A\u043E\u043D\u043A\u0443\u0440\u0435\u043D\u0442\u0430 3"],
  "uniqueAngle": "\u0447\u0435\u043C \u043D\u0430\u0448\u0430 \u0441\u0442\u0430\u0442\u044C\u044F \u0431\u0443\u0434\u0435\u0442 \u043E\u0442\u043B\u0438\u0447\u0430\u0442\u044C\u0441\u044F \u0438 \u043B\u0443\u0447\u0448\u0435",
  "tags": ["\u0442\u0435\u04331", "\u0442\u0435\u04332"],
  "imagePrompt": "English prompt for pixel-art hero image 900x450 for this article (describe scene, not text)"
}`)
  const researchMatch = research.match(/\{[\s\S]*\}/)
  if (!researchMatch)
    throw new Error(
      'SEO-\u0440\u0438\u0441\u0435\u0440\u0447 \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B JSON'
    )
  const seoData = JSON.parse(researchMatch[0])
  const outline =
    await askClaude(`\u0422\u044B \u043A\u043E\u043D\u0442\u0435\u043D\u0442-\u0441\u0442\u0440\u0430\u0442\u0435\u0433. \u0421\u043E\u0441\u0442\u0430\u0432\u044C \u0434\u0435\u0442\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043B\u0430\u043D \u0441\u0442\u0430\u0442\u044C\u0438.

\u0422\u0415\u041C\u0410: ${topic.title}
\u041A\u041B\u042E\u0427: ${topic.keyword}
\u0422\u0418\u041F: ${topic.type}
\u0418\u041D\u0422\u0415\u041D\u0422: ${seoData.intent}
LSI-\u0441\u043B\u043E\u0432\u0430 \u0434\u043B\u044F \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F: ${seoData.lsi.join(', ')}
\u0411\u043E\u043B\u0438 \u0430\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u0438: ${seoData.painPoints.join('; ')}
\u0423\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0443\u0433\u043E\u043B: ${seoData.uniqueAngle}

\u0422\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F \u043A \u043F\u043B\u0430\u043D\u0443:
- 5-7 \u0431\u043B\u043E\u043A\u043E\u0432 H2
- \u041A\u0430\u0436\u0434\u044B\u0439 H2 \u0440\u0430\u0441\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u0443\u044E \u0431\u043E\u043B\u044C \u0438\u043B\u0438 \u0432\u043E\u043F\u0440\u043E\u0441 \u0430\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u0438
- \u041D\u0435 \u0434\u0443\u0431\u043B\u0438\u0440\u0443\u0439 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0443 \u043A\u043E\u043D\u043A\u0443\u0440\u0435\u043D\u0442\u043E\u0432: ${seoData.competitorH2s.join('; ')}
- \u0424\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u0431\u043B\u043E\u043A \u2014 \u043F\u0440\u0438\u0437\u044B\u0432 \u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u043D\u0430 d-pub.ru

\u0412\u044B\u0434\u0430\u0439 JSON (\u0431\u0435\u0437 \u043B\u0438\u0448\u043D\u0435\u0433\u043E \u0442\u0435\u043A\u0441\u0442\u0430):
{
  "h2s": [
    { "title": "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A H2", "keyPoints": ["\u0442\u0435\u0437\u0438\u0441 1", "\u0442\u0435\u0437\u0438\u0441 2"] }
  ],
  "metaTitle": "SEO \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0434\u043E 60 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u0441 \u043A\u043B\u044E\u0447\u043E\u043C",
  "metaDesc": "SEO \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 130-155 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432, \u0440\u0430\u0441\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u043F\u043E\u043B\u044C\u0437\u0443 \u0441\u0442\u0430\u0442\u044C\u0438",
  "slug": "url-slug-latinicej"
}`)
  const outlineMatch = outline.match(/\{[\s\S]*\}/)
  if (!outlineMatch)
    throw new Error(
      '\u041F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B JSON'
    )
  const plan = JSON.parse(outlineMatch[0])
  const planText = plan.h2s
    .map(
      (h, i) => `${i + 1}. ${h.title}
   \u0422\u0435\u0437\u0438\u0441\u044B: ${h.keyPoints.join('; ')}`
    )
    .join('\n')
  const article =
    await askClaude(`\u0422\u044B \u043E\u043F\u044B\u0442\u043D\u044B\u0439 SEO-\u043A\u043E\u043F\u0438\u0440\u0430\u0439\u0442\u0435\u0440 \u0434\u043B\u044F \u0440\u043E\u0441\u0441\u0438\u0439\u0441\u043A\u043E\u0433\u043E \u0440\u044B\u043D\u043A\u0430 digital-\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439.

\u041D\u0430\u043F\u0438\u0448\u0438 \u0441\u0442\u0430\u0442\u044C\u044E \u0434\u043B\u044F d-pub.ru \u2014 job board \u0434\u043B\u044F digital-\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u043E\u0432.

\u0422\u0415\u041C\u0410: ${topic.title}
\u041A\u041B\u042E\u0427\u0415\u0412\u041E\u0415 \u0421\u041B\u041E\u0412\u041E: ${topic.keyword} (\u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0432 \u043F\u0435\u0440\u0432\u043E\u043C \u0430\u0431\u0437\u0430\u0446\u0435 \u0438 2-3 \u0440\u0430\u0437\u0430 \u043F\u043E \u0442\u0435\u043A\u0441\u0442\u0443)
LSI-\u0441\u043B\u043E\u0432\u0430 (\u0432\u043F\u043B\u0435\u0442\u0438 \u043E\u0440\u0433\u0430\u043D\u0438\u0447\u043D\u043E): ${seoData.lsi.join(', ')}
\u0410\u0423\u0414\u0418\u0422\u041E\u0420\u0418\u042F: ${topic.audience}

\u041F\u041B\u0410\u041D (\u0441\u0442\u0440\u043E\u0433\u043E \u0441\u043B\u0435\u0434\u0443\u0439 \u044D\u0442\u043E\u0439 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0435):
${planText}

\u0422\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F:
- \u041E\u0431\u044A\u0451\u043C: 1200-1600 \u0441\u043B\u043E\u0432
- \u041D\u0430\u0447\u0438\u043D\u0430\u0439 \u0441\u0440\u0430\u0437\u0443 \u0441 \u0441\u0443\u0442\u0438 \u2014 \u0431\u0435\u0437 \u0432\u0432\u043E\u0434\u043D\u044B\u0445 "\u0432 \u044D\u0442\u043E\u0439 \u0441\u0442\u0430\u0442\u044C\u0435 \u043C\u044B..."
- \u041A\u0430\u0436\u0434\u044B\u0439 H2 \u0440\u0430\u0441\u043A\u0440\u044B\u0432\u0430\u0439 \u043F\u0440\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438: \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0435 \u0441\u043E\u0432\u0435\u0442\u044B, \u0446\u0438\u0444\u0440\u044B, \u043F\u0440\u0438\u043C\u0435\u0440\u044B
- \u0421\u0442\u0438\u043B\u044C: \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0439, \u0436\u0438\u0432\u043E\u0439, \u0431\u0435\u0437 \u043A\u0430\u043D\u0446\u0435\u043B\u044F\u0440\u0438\u0442\u0430
- \u0423\u043F\u043E\u043C\u044F\u043D\u0438 d-pub.ru \u043A\u0430\u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439 1-2 \u0440\u0430\u0437\u0430 \u043E\u0440\u0433\u0430\u043D\u0438\u0447\u043D\u043E \u0441\u043E \u0441\u0441\u044B\u043B\u043A\u043E\u0439 \u043D\u0430 [/vacancies](/vacancies)
- \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 Markdown: ## \u0434\u043B\u044F H2, ### \u0434\u043B\u044F H3, **\u0436\u0438\u0440\u043D\u044B\u0439**, *\u043A\u0443\u0440\u0441\u0438\u0432*, \u0442\u0430\u0431\u043B\u0438\u0446\u044B, \u0441\u043F\u0438\u0441\u043A\u0438

\u041E\u0442\u0432\u0435\u0442\u044C \u0441\u0442\u0440\u043E\u0433\u043E \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 JSON (\u0431\u0435\u0437 \u043B\u0438\u0448\u043D\u0435\u0433\u043E \u0442\u0435\u043A\u0441\u0442\u0430):
{
  "markdown": "## \u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A\\n\\n\u0422\u0435\u043A\u0441\u0442 \u0441\u0442\u0430\u0442\u044C\u0438 \u0432 Markdown..."
}`)
  let markdown = ''
  const articleMatch = article.match(/\{[\s\S]*\}/)
  if (!articleMatch)
    throw new Error('Writer \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B JSON')
  try {
    const parsed = JSON.parse(articleMatch[0])
    markdown = parsed.markdown
  } catch {
    const mdStart = article.indexOf('## ')
    if (mdStart !== -1) {
      markdown = article.slice(mdStart)
    } else {
      throw new Error(
        'Writer \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u044B\u0439 JSON \u0438 \u043D\u0435 \u043D\u0430\u0448\u043B\u043E\u0441\u044C Markdown'
      )
    }
  }
  return {
    markdown: markdown.trim(),
    metaTitle: plan.metaTitle,
    metaDesc: plan.metaDesc,
    slug: toSlug(plan.slug || topic.title),
    tags: Array.isArray(seoData.tags) ? seoData.tags : [],
    imagePrompt: seoData.imagePrompt || '',
  }
}
function buildMdxFrontmatter(topic, result, publishedAt) {
  const tags = result.tags.length ? JSON.stringify(result.tags) : '[]'
  return `---
title: "${topic.title.replace(/"/g, '\\"')}"
slug: "${result.slug}"
description: "${result.metaDesc.replace(/"/g, '\\"')}"
metaTitle: "${result.metaTitle.replace(/"/g, '\\"')}"
metaDescription: "${result.metaDesc.replace(/"/g, '\\"')}"
publishedAt: "${publishedAt}"
tags: ${tags}
---
`
}
function gitCommitAndPush(slug, title) {
  const mdxPath = path.join('content', 'articles', `${slug}.mdx`)
  execSync(`git add "${mdxPath}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' })
  const message = `feat: add article "${title}"`
  execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: PROJECT_ROOT, stdio: 'inherit' })
  execSync('git push', { cwd: PROJECT_ROOT, stdio: 'inherit' })
}
async function main() {
  const topicNum = parseInt(process.argv[2])
  if (isNaN(topicNum)) {
    console.error(
      '\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: node writer.compiled.js <topicNum>'
    )
    process.exit(1)
  }
  const topicsFile = getLatestTopicsFile()
  const { topics } = JSON.parse(fs.readFileSync(topicsFile, 'utf8'))
  const topic = topics.find((t) => t.id === topicNum)
  if (!topic)
    throw new Error(
      `\u0422\u0435\u043C\u0430 #${topicNum} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0432 ${topicsFile}`
    )
  console.log(
    `[writer] \u041F\u0438\u0448\u0443 \u0441\u0442\u0430\u0442\u044C\u044E: "${topic.title}"`
  )
  await sendMessage(
    `\u270D\uFE0F \u0413\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u044E \u0441\u0442\u0430\u0442\u044C\u044E #${topicNum}:
<b>${topic.title}</b>

\u{1F50D} SEO-\u0440\u0438\u0441\u0435\u0440\u0447 \u2192 \u{1F4CB} \u043F\u043B\u0430\u043D \u2192 \u270F\uFE0F \u0442\u0435\u043A\u0441\u0442

\u042D\u0442\u043E \u0437\u0430\u0439\u043C\u0451\u0442 ~2 \u043C\u0438\u043D\u0443\u0442\u044B...`
  )
  const result = await generateMdxArticle(topic)
  console.log(
    `[writer] \u0421\u0442\u0430\u0442\u044C\u044F \u043D\u0430\u043F\u0438\u0441\u0430\u043D\u0430, slug: ${result.slug}`
  )
  const mdxPath = path.join(ARTICLES_DIR, `${result.slug}.mdx`)
  if (fs.existsSync(mdxPath)) {
    const newSlug = `${result.slug}-${Date.now().toString(36)}`
    console.log(
      `[writer] Slug ${result.slug} \u0443\u0436\u0435 \u0437\u0430\u043D\u044F\u0442, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E ${newSlug}`
    )
    result.slug = newSlug
  }
  const publishedAt = /* @__PURE__ */ new Date().toISOString().split('T')[0]
  const frontmatter = buildMdxFrontmatter(topic, result, publishedAt)
  const mdxContent = frontmatter + '\n' + result.markdown
  fs.mkdirSync(ARTICLES_DIR, { recursive: true })
  fs.writeFileSync(path.join(ARTICLES_DIR, `${result.slug}.mdx`), mdxContent)
  console.log(
    `[writer] \u0424\u0430\u0439\u043B \u0441\u043E\u0437\u0434\u0430\u043D: content/articles/${result.slug}.mdx`
  )
  try {
    gitCommitAndPush(result.slug, topic.title)
    console.log('[writer] Git push \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D \u2713')
  } catch (e) {
    console.error('[writer] Git push \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F:', e)
    await sendMessage(`\u26A0\uFE0F \u0421\u0442\u0430\u0442\u044C\u044F \u043D\u0430\u043F\u0438\u0441\u0430\u043D\u0430, \u043D\u043E git push \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F:
${e.message}`)
    process.exit(1)
  }
  markTopicPublished(topicsFile, topicNum)
  const articleUrl = `${SITE_URL}/articles/${result.slug}`
  const imagePromptText = result.imagePrompt
    ? `

\u{1F3A8} <b>\u041F\u0440\u043E\u043C\u043F\u0442 \u0434\u043B\u044F \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0438 (Codex Pic):</b>
<code>${result.imagePrompt}</code>`
    : ''
  await sendMessage(
    `\u2705 <b>\u0421\u0442\u0430\u0442\u044C\u044F \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u0430!</b>

\u{1F4CC} ${topic.title}
\u{1F511} ${topic.keyword}

\u{1F517} <a href="${articleUrl}">${articleUrl}</a>` +
      imagePromptText +
      `

\u23F3 \u0414\u0435\u043F\u043B\u043E\u0439 \u0437\u0430\u0439\u043C\u0451\u0442 ~3 \u043C\u0438\u043D\u0443\u0442\u044B`
  )
  console.log(`[writer] \u0413\u043E\u0442\u043E\u0432\u043E: ${articleUrl}`)
}
main().catch((e) => {
  console.error('[writer] \u041E\u0448\u0438\u0431\u043A\u0430:', e)
  sendMessage(`\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438 \u0441\u0442\u0430\u0442\u044C\u0438:
${e.message}`).catch(() => {})
  process.exit(1)
})
