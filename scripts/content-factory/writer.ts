/**
 * Content Factory — Writer (MDX Edition)
 * Берёт тему по номеру, пишет SEO-статью как MDX файл,
 * генерирует картинку через Codex CLI, делает git push.
 * Запуск: node writer.compiled.js <topicNum>
 */

import { execSync, spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { sendMessage } from './lib/telegram.js'

const DATA_DIR = path.join(import.meta.dirname, 'data')
const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..')
const ARTICLES_DIR = path.join(PROJECT_ROOT, 'content', 'articles')
const IMAGES_DIR = path.join(PROJECT_ROOT, 'public', 'images', 'posts')
const SITE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://d-pub.ru'

const CODEX_BIN = path.join(os.homedir(), '.npm-global', 'bin', 'codex')
const CODEX_HOME = path.join(os.homedir(), '.codex')

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

function getLatestTopicsFile(): string {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('topics_') && f.endsWith('.json'))
    .sort()
    .reverse()
  if (!files.length) throw new Error('Нет файлов с темами. Сначала запусти analyst.js')
  return path.join(DATA_DIR, files[0])
}

function markTopicPublished(topicsFile: string, topicId: number): void {
  const raw = JSON.parse(fs.readFileSync(topicsFile, 'utf-8')) as {
    date: string
    topics: Topic[]
  }
  const topic = raw.topics.find((t) => t.id === topicId)
  if (topic) topic.published = true
  fs.writeFileSync(topicsFile, JSON.stringify(raw, null, 2))
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

// ─── Codex image generation ─────────────────────────────────────────────────

function snapshotGeneratedImages(): Set<string> {
  const generatedDir = path.join(CODEX_HOME, 'generated_images')
  const images = new Set<string>()
  if (!fs.existsSync(generatedDir)) return images
  for (const session of fs.readdirSync(generatedDir)) {
    const sessionDir = path.join(generatedDir, session)
    try {
      for (const file of fs.readdirSync(sessionDir)) {
        if (file.endsWith('.png') || file.endsWith('.webp') || file.endsWith('.jpg')) {
          images.add(path.join(sessionDir, file))
        }
      }
    } catch {}
  }
  return images
}

function findNewImage(before: Set<string>): string | null {
  const after = snapshotGeneratedImages()
  for (const img of after) {
    if (!before.has(img)) return img
  }
  return null
}

function convertToWebP(srcPng: string, destWebp: string): void {
  // Use sharp from project node_modules via inline script
  const script = `
    import('${path.join(PROJECT_ROOT, 'node_modules', 'sharp', 'lib', 'index.js')}')
      .then(m => m.default('${srcPng}').resize(900, 450, {fit:'cover'}).webp({quality:85}).toFile('${destWebp}'))
      .then(() => process.exit(0))
      .catch(e => { console.error(e.message); process.exit(1); })
  `
  execSync(`node --input-type=module`, {
    input: script,
    cwd: PROJECT_ROOT,
    timeout: 30000,
    stdio: ['pipe', 'inherit', 'inherit'],
  })
}

async function generateImageWithCodex(imagePrompt: string, slug: string): Promise<string | null> {
  if (!fs.existsSync(CODEX_BIN)) {
    console.log('[writer] Codex CLI не найден, пропускаю генерацию картинки')
    return null
  }

  const before = snapshotGeneratedImages()
  const fullPrompt =
    `Generate a hero image for a blog article using this exact style: ` +
    `Retro 16-bit pixel art illustration, cozy evening home interior, warm desk-lamp lighting, ` +
    `soft amber glow, crisp pixel edges, low-resolution game-art aesthetic, detailed but clean pixel clusters, ` +
    `calm domestic mood, muted warm color palette with dusk blue shadows, ` +
    `charming isometric or side-view composition, nostalgic indie game atmosphere, ` +
    `no photorealism, no watermark. ` +
    `Scene subject: ${imagePrompt}. ` +
    `Use your image generation tool to create this image now.`

  console.log('[writer] Запускаю Codex для генерации картинки...')

  await new Promise<void>((resolve) => {
    const child = spawn(
      CODEX_BIN,
      ['exec', '--dangerously-bypass-approvals-and-sandbox', '--model', 'gpt-5.5', fullPrompt],
      {
        env: { ...process.env, CODEX_HOME },
        stdio: 'pipe',
        timeout: 240000, // 4 min — codex image gen took ~125s in testing
      }
    )
    // Resolve regardless of exit code — check for image file instead
    child.on('close', () => resolve())
    child.on('error', () => resolve())
  })

  const newImage = findNewImage(before)
  if (!newImage) {
    console.log('[writer] Codex не создал новое изображение')
    return null
  }

  console.log(`[writer] Новое изображение: ${newImage}`)
  fs.mkdirSync(IMAGES_DIR, { recursive: true })
  const destWebp = path.join(IMAGES_DIR, `${slug}.webp`)

  try {
    convertToWebP(newImage, destWebp)
    console.log(`[writer] WebP сохранён: ${destWebp}`)
    return `/images/posts/${slug}.webp`
  } catch (e) {
    console.warn('[writer] Конвертация в WebP не удалась, копирую PNG:', (e as Error).message)
    const destPng = path.join(IMAGES_DIR, `${slug}.png`)
    fs.copyFileSync(newImage, destPng)
    return `/images/posts/${slug}.png`
  }
}

// ─── Article generation ──────────────────────────────────────────────────────

interface ArticleResult {
  markdown: string
  metaTitle: string
  metaDesc: string
  slug: string
  tags: string[]
  imagePrompt: string
}

async function generateMdxArticle(topic: Topic): Promise<ArticleResult> {
  // ШАГ 1: SEO-рисерч
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
  "uniqueAngle": "чем наша статья будет отличаться и лучше",
  "tags": ["тег1", "тег2"],
  "imagePrompt": "English prompt for pixel-art hero image 900x450 for this article (describe scene, objects, no text)"
}`)

  const researchMatch = research.match(/\{[\s\S]*\}/)
  if (!researchMatch) throw new Error('SEO-рисерч не вернул JSON')
  const seoData = JSON.parse(researchMatch[0]) as {
    intent: string
    lsi: string[]
    painPoints: string[]
    competitorH2s: string[]
    uniqueAngle: string
    tags: string[]
    imagePrompt: string
  }

  // ШАГ 2: Планирование
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

  // ШАГ 3: Написание статьи в Markdown
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
- Упомяни d-pub.ru как источник вакансий 1-2 раза органично со ссылкой на [/vacancies](/vacancies)
- Используй Markdown: ## для H2, ### для H3, **жирный**, *курсив*, таблицы, списки

Ответь строго в формате JSON (без лишнего текста):
{
  "markdown": "## Заголовок\\n\\nТекст статьи в Markdown..."
}`)

  let markdown = ''
  const articleMatch = article.match(/\{[\s\S]*\}/)
  if (!articleMatch) throw new Error('Writer не вернул JSON')
  try {
    const parsed = JSON.parse(articleMatch[0]) as { markdown: string }
    markdown = parsed.markdown
  } catch {
    const mdStart = article.indexOf('## ')
    if (mdStart !== -1) {
      markdown = article.slice(mdStart)
    } else {
      throw new Error('Writer не вернул правильный JSON и не нашлось Markdown')
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

function buildMdxFrontmatter(
  topic: Topic,
  result: ArticleResult,
  publishedAt: string,
  imageUrl: string | null
): string {
  const tags = result.tags.length ? JSON.stringify(result.tags) : '[]'
  const imageLine = imageUrl ? `\nimageUrl: "${imageUrl}"` : ''
  return `---
title: "${topic.title.replace(/"/g, '\\"')}"
slug: "${result.slug}"
description: "${result.metaDesc.replace(/"/g, '\\"')}"
metaTitle: "${result.metaTitle.replace(/"/g, '\\"')}"
metaDescription: "${result.metaDesc.replace(/"/g, '\\"')}"
publishedAt: "${publishedAt}"
tags: ${tags}${imageLine}
---
`
}

function gitCommitAndPush(slug: string, title: string, hasImage: boolean): void {
  const mdxPath = path.join('content', 'articles', `${slug}.mdx`)
  execSync(`git add "${mdxPath}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' })
  if (hasImage) {
    // Stage any new image files
    execSync(`git add "public/images/posts/${slug}.*" 2>/dev/null || true`, {
      cwd: PROJECT_ROOT,
      shell: '/bin/bash',
    })
  }
  const message = `feat: add article "${title}"`
  execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: PROJECT_ROOT, stdio: 'inherit' })
  execSync('git push', { cwd: PROJECT_ROOT, stdio: 'inherit' })
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
      `🔍 SEO-рисерч → 📋 план → ✏️ текст → 🎨 картинка\n\nЭто займёт ~3 минуты...`
  )

  // ШАГ 1-3: Генерируем статью
  const result = await generateMdxArticle(topic)
  console.log(`[writer] Статья написана, slug: ${result.slug}`)

  // Проверяем что slug не занят
  const mdxPath = path.join(ARTICLES_DIR, `${result.slug}.mdx`)
  if (fs.existsSync(mdxPath)) {
    result.slug = `${result.slug}-${Date.now().toString(36)}`
    console.log(`[writer] Slug скорректирован: ${result.slug}`)
  }

  // ШАГ 4: Генерируем картинку через Codex
  console.log('[writer] Генерирую картинку...')
  const imageUrl = result.imagePrompt
    ? await generateImageWithCodex(result.imagePrompt, result.slug)
    : null

  if (imageUrl) {
    console.log(`[writer] Картинка готова: ${imageUrl}`)
  } else {
    console.log('[writer] Картинка не сгенерирована, публикуем без неё')
  }

  // Пишем MDX файл
  const publishedAt = new Date().toISOString().split('T')[0]
  const frontmatter = buildMdxFrontmatter(topic, result, publishedAt, imageUrl)
  const mdxContent = frontmatter + '\n' + result.markdown

  fs.mkdirSync(ARTICLES_DIR, { recursive: true })
  fs.writeFileSync(path.join(ARTICLES_DIR, `${result.slug}.mdx`), mdxContent)
  console.log(`[writer] Файл создан: content/articles/${result.slug}.mdx`)

  // Git commit и push
  try {
    gitCommitAndPush(result.slug, topic.title, imageUrl !== null)
    console.log('[writer] Git push выполнен ✓')
  } catch (e) {
    console.error('[writer] Git push не удался:', e)
    await sendMessage(`⚠️ Статья написана, но git push не удался:\n${(e as Error).message}`)
    process.exit(1)
  }

  markTopicPublished(topicsFile, topicNum)

  const articleUrl = `${SITE_URL}/articles/${result.slug}`
  const imageStatus = imageUrl
    ? `🎨 Картинка: ✅ автоматически`
    : `🎨 Картинка: ❌ не сгенерирована (добавь вручную через Codex Pic)`

  await sendMessage(
    `✅ <b>Статья опубликована!</b>\n\n` +
      `📌 ${topic.title}\n` +
      `🔑 ${topic.keyword}\n` +
      `${imageStatus}\n\n` +
      `🔗 <a href="${articleUrl}">${articleUrl}</a>\n\n` +
      `⏳ Деплой займёт ~3 минуты`
  )

  console.log(`[writer] Готово: ${articleUrl}`)
}

main().catch((e) => {
  console.error('[writer] Ошибка:', e)
  sendMessage(`❌ Ошибка при генерации статьи:\n${e.message}`).catch(() => {})
  process.exit(1)
})
