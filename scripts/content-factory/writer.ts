/**
 * Content Factory — Writer v2 (MDX Edition)
 * Pipeline: Wordstat Research → SEO Analysis → Plan → Draft → Review → Image → Deploy
 */

import { execSync, spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { sendMessage } from './lib/telegram.js'
import { fetchWordstatKeywords } from './lib/yandex.js'

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

interface ArticleResult {
  markdown: string
  metaTitle: string
  metaDesc: string
  slug: string
  tags: string[]
  imagePrompt: string
  wordstatKeywords: string[]
}

// ─── H2-шаблоны по типу контента (programmatic-seo) ─────────────────────────

const OUTLINE_HINTS: Record<string, string> = {
  Гайд: 'Пошаговая структура: definition block → зачем нужно → как сделать (шаги 1-3) → типичные ошибки → итог + CTA',
  Сравнение:
    'Структура: definition block → критерии оценки → таблица сравнения вариантов → кому что подходит → вывод + CTA',
  Чеклист:
    'Структура: definition block → зачем этот чеклист → блок 1 → блок 2 → блок 3 → как применить → CTA',
  Кейс: 'Структура: definition block → контекст задачи → решение → реализация → результаты с цифрами → выводы + CTA',
  Конспект:
    'Структура: definition block → источник и контекст → ключевые идеи (3-4) → практика → адаптация для рунета + CTA',
}

// ─── Claude helper ───────────────────────────────────────────────────────────

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

// ─── Codex image generation ──────────────────────────────────────────────────

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
    `High-fidelity pixel art illustration in the style of modern indie games (Stardew Valley, Octopath Traveler), ` +
    `cozy evening home interior, warm desk-lamp lighting, soft amber glow, ` +
    `fine pixel detail with small pixel grid, rich color depth, smooth gradients via dithering, ` +
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
        stdio: 'ignore',
        timeout: 240000,
      }
    )
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

// ─── Article generation pipeline ─────────────────────────────────────────────

async function generateMdxArticle(topic: Topic): Promise<ArticleResult> {
  // ШАГ 1: Wordstat keyword research
  console.log('[writer] Шаг 1: Wordstat keyword research...')
  const wordstatRaw = await fetchWordstatKeywords(topic.keyword)
  const wordstatTop = wordstatRaw.filter((k) => k.count > 0).slice(0, 15)
  const wordstatKeywords = wordstatTop.map((k) => k.phrase)

  const wordstatBlock =
    wordstatTop.length > 0
      ? `\nРЕАЛЬНЫЕ ДАННЫЕ ИЗ WORDSTAT (используй эти ключи органично в тексте):\n` +
        wordstatTop
          .map((k) => `  - "${k.phrase}" — ${k.count.toLocaleString()} запросов/мес`)
          .join('\n')
      : ''

  if (wordstatTop.length > 0) {
    console.log(
      `[writer] Wordstat: ${wordstatTop.length} ключей, топ: "${wordstatTop[0].phrase}" (${wordstatTop[0].count}/мес)`
    )
  }

  // ШАГ 1б: SEO-рисерч
  console.log('[writer] Шаг 1б: SEO-рисерч...')
  const research = await askClaude(`Ты SEO-аналитик для русскоязычного рынка digital-вакансий.

Проведи рисерч для статьи по теме: "${topic.title}"
Ключевое слово: "${topic.keyword}"
Аудитория: ${topic.audience}
${wordstatBlock}

Выдай JSON строго в таком формате (без лишнего текста):
{
  "intent": "информационный|коммерческий|навигационный",
  "lsi": ["слово1", "слово2", "слово3", "слово4", "слово5", "слово6", "слово7", "слово8"],
  "painPoints": ["боль читателя 1", "боль читателя 2", "боль читателя 3"],
  "competitorH2s": ["типичный H2 конкурента 1", "типичный H2 конкурента 2", "типичный H2 конкурента 3"],
  "uniqueAngle": "чем наша статья будет отличаться и лучше конкурентов",
  "tags": ["тег1", "тег2"],
  "imagePrompt": "English prompt for pixel-art hero image 900x450 (describe scene and objects, no text in image)"
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
  console.log('[writer] Шаг 2: Планирование структуры...')
  const outlineHint = OUTLINE_HINTS[topic.type] ?? ''

  const outline = await askClaude(`Ты контент-стратег. Составь детальный план статьи.

ТЕМА: ${topic.title}
КЛЮЧ: ${topic.keyword}
ТИП: ${topic.type}
${outlineHint ? `ОБЯЗАТЕЛЬНЫЙ ШАБЛОН ДЛЯ ЭТОГО ТИПА: ${outlineHint}` : ''}
ИНТЕНТ: ${seoData.intent}
LSI-слова: ${seoData.lsi.join(', ')}
Боли аудитории: ${seoData.painPoints.join('; ')}
Уникальный угол: ${seoData.uniqueAngle}

Требования к плану:
- 5-7 блоков H2
- ПЕРВЫЙ H2 — definition block: чёткое определение темы, что это такое (для AI-SEO и featured snippets)
- Каждый H2 раскрывает конкретную боль или вопрос аудитории
- ПРЕДПОСЛЕДНИЙ H2 — призыв смотреть вакансии на d-pub.ru
- ПОСЛЕДНИЙ H2 — FAQ: 4-6 частых вопросов по теме (для featured snippets и AI-цитирования)
- Не дублируй структуру конкурентов: ${seoData.competitorH2s.join('; ')}

Выдай JSON (без лишнего текста):
{
  "h2s": [
    { "title": "Заголовок H2", "keyPoints": ["тезис 1", "тезис 2"] }
  ],
  "metaTitle": "SEO заголовок строго до 60 символов с ключевым словом",
  "metaDesc": "SEO описание строго 130-155 символов, раскрывает пользу статьи",
  "slug": "url-slug-latinicej-bez-russkikh-bukv"
}`)

  const outlineMatch = outline.match(/\{[\s\S]*\}/)
  if (!outlineMatch) throw new Error('Планировщик не вернул JSON')
  const plan = JSON.parse(outlineMatch[0]) as {
    h2s: { title: string; keyPoints: string[] }[]
    metaTitle: string
    metaDesc: string
    slug: string
  }

  // ШАГ 3: Черновик
  console.log('[writer] Шаг 3: Пишу черновик...')
  const planText = plan.h2s
    .map((h, i) => `${i + 1}. ${h.title}\n   Тезисы: ${h.keyPoints.join('; ')}`)
    .join('\n')

  const article = await askClaude(`Ты опытный SEO-копирайтер для российского рынка digital-вакансий.

Напиши статью для d-pub.ru — job board для digital-специалистов.

ТЕМА: ${topic.title}
КЛЮЧЕВОЕ СЛОВО: "${topic.keyword}" — используй в первом абзаце и 2-3 раза по тексту
LSI-слова из поиска (вплети органично): ${seoData.lsi.join(', ')}
АУДИТОРИЯ: ${topic.audience}

ПЛАН (строго следуй этой структуре):
${planText}

Требования к структуре (AI-SEO + featured snippets):
- DEFINITION BLOCK: первый абзац статьи — 2-3 предложения, чётко отвечают на "что такое ${topic.keyword}". Этот блок должен быть самодостаточным — AI может процитировать его отдельно.
- Каждый ключевой тезис — отдельный абзац 40-60 слов (оптимально для AI-цитирования)
- Включай конкретные цифры и данные (hh.ru, SuperJob, Яндекс.Работа) хотя бы в 3 местах
- FAQ секция в конце: формат "### Вопрос?" → ответ 2-3 предложения, самодостаточный
- Упомяни d-pub.ru как источник вакансий 1-2 раза органично со ссылкой [/vacancies](/vacancies)

Объём: 1200-1600 слов. Стиль: профессиональный, живой, без канцелярита.
Markdown: ## для H2, ### для H3, **жирный**, таблицы, маркированные списки.
НЕ начинай с "В этой статье мы рассмотрим" и подобных вводных фраз.

Ответь строго в формате JSON (без лишнего текста):
{"markdown": "## Заголовок\\n\\nТекст статьи..."}`)

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
  markdown = markdown.trim()

  // ШАГ 4: Ревью
  console.log('[writer] Шаг 4: Ревью и улучшение...')
  const titleLen = plan.metaTitle.length
  const descLen = plan.metaDesc.length

  const reviewed =
    await askClaude(`Ты строгий редактор SEO-контента. Проверь статью и верни улучшенную версию.

КЛЮЧЕВОЕ СЛОВО: "${topic.keyword}"
META TITLE (${titleLen} симв${titleLen > 60 ? ', СЛИШКОМ ДЛИННЫЙ — укороти до 60' : ', ок'}): "${plan.metaTitle}"
META DESC (${descLen} симв${descLen < 130 ? ', СЛИШКОМ КОРОТКИЙ — расширь до 130-155' : descLen > 155 ? ', СЛИШКОМ ДЛИННЫЙ — сократи до 155' : ', ок'}): "${plan.metaDesc}"

СТАТЬЯ:
${markdown}

ЗАДАЧИ РЕВЬЮ:

1. ПРОВЕРЬ И ИСПРАВЬ:
   - Definition block в первом абзаце — есть ли чёткий ответ "что такое ${topic.keyword}"? Если нет — добавь
   - FAQ секция в конце — есть ли 4-6 вопросов в формате ### Вопрос? + ответ? Если нет — добавь
   - Плотность ключевого слова "${topic.keyword}": должна быть 1-2% (не более 4 вхождений на 1000 слов). Удали лишние.
   - Слабые вводные фразы ("В данной статье...", "Сегодня мы рассмотрим...") — замени конкретикой

2. УЛУЧШИ:
   - Перепиши 1-2 самых слабых абзаца (где нет конкретики или цифр)
   - Убедись что есть минимум 3 конкретные цифры/данные в тексте

Верни ТОЛЬКО финальный Markdown текст статьи — без пояснений, без JSON, без комментариев.`)

  const finalMarkdown = reviewed.trim().startsWith('##')
    ? reviewed.trim()
    : reviewed.indexOf('## ') !== -1
      ? reviewed.slice(reviewed.indexOf('## ')).trim()
      : markdown

  return {
    markdown: finalMarkdown,
    metaTitle: plan.metaTitle,
    metaDesc: plan.metaDesc,
    slug: toSlug(plan.slug || topic.title),
    tags: Array.isArray(seoData.tags) ? seoData.tags : [],
    imagePrompt: seoData.imagePrompt || '',
    wordstatKeywords,
  }
}

// ─── Schema JSON-LD (schema-markup skill) ────────────────────────────────────

function buildArticleSchema(
  topic: Topic,
  result: ArticleResult,
  publishedAt: string,
  articleUrl: string
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: result.metaTitle,
    description: result.metaDesc,
    datePublished: publishedAt,
    dateModified: publishedAt,
    author: {
      '@type': 'Organization',
      name: 'Диджитал Паб',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Диджитал Паб',
      url: SITE_URL,
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    keywords: [topic.keyword, ...result.tags, ...result.wordstatKeywords.slice(0, 5)].join(', '),
  }
  return JSON.stringify(schema)
}

// ─── MDX frontmatter builder ─────────────────────────────────────────────────

function buildMdxFrontmatter(
  topic: Topic,
  result: ArticleResult,
  publishedAt: string,
  imageUrl: string | null
): string {
  const tags = result.tags.length ? JSON.stringify(result.tags) : '[]'
  const imageLine = imageUrl ? `\nimageUrl: "${imageUrl}"` : ''
  const articleUrl = `${SITE_URL}/articles/${result.slug}`
  const schemaLine = `\nschemaJsonLd: '${buildArticleSchema(topic, result, publishedAt, articleUrl)}'`

  return `---
title: "${topic.title.replace(/"/g, '\\"')}"
slug: "${result.slug}"
description: "${result.metaDesc.replace(/"/g, '\\"')}"
metaTitle: "${result.metaTitle.replace(/"/g, '\\"')}"
metaDescription: "${result.metaDesc.replace(/"/g, '\\"')}"
publishedAt: "${publishedAt}"
tags: ${tags}${imageLine}${schemaLine}
---
`
}

// ─── Git ─────────────────────────────────────────────────────────────────────

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

function gitCommitAndPush(slug: string, title: string, hasImage: boolean): void {
  const mdxPath = path.join('content', 'articles', `${slug}.mdx`)
  execSync(`git add "${mdxPath}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' })
  if (hasImage) {
    execSync(`git add "public/images/posts/${slug}.*" 2>/dev/null || true`, {
      cwd: PROJECT_ROOT,
      shell: '/bin/bash',
    })
  }
  const message = `feat: add article "${title}"`
  execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: PROJECT_ROOT, stdio: 'inherit' })
  execSync('git push', { cwd: PROJECT_ROOT, stdio: 'inherit' })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

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
      `🔍 Wordstat → SEO-рисерч → 📋 план → ✏️ черновик → 🔎 ревью → 🎨 картинка\n\n` +
      `Это займёт ~5 минут...`
  )

  // Шаги 1-4: генерация статьи
  const result = await generateMdxArticle(topic)
  console.log(`[writer] Статья готова, slug: ${result.slug}`)

  // Проверяем что slug не занят
  const mdxPath = path.join(ARTICLES_DIR, `${result.slug}.mdx`)
  if (fs.existsSync(mdxPath)) {
    result.slug = `${result.slug}-${Date.now().toString(36)}`
    console.log(`[writer] Slug скорректирован: ${result.slug}`)
  }

  // Шаг 5а: картинка через Codex
  console.log('[writer] Шаг 5: Генерирую картинку...')
  const imageUrl = result.imagePrompt
    ? await generateImageWithCodex(result.imagePrompt, result.slug)
    : null

  if (imageUrl) {
    console.log(`[writer] Картинка готова: ${imageUrl}`)
  } else {
    console.log('[writer] Картинка не сгенерирована, публикуем без неё')
  }

  // Шаг 5б: записываем MDX и деплоим
  const publishedAt = new Date().toISOString().split('T')[0]
  const frontmatter = buildMdxFrontmatter(topic, result, publishedAt, imageUrl)
  const mdxContent = frontmatter + '\n' + result.markdown

  fs.mkdirSync(ARTICLES_DIR, { recursive: true })
  fs.writeFileSync(path.join(ARTICLES_DIR, `${result.slug}.mdx`), mdxContent)
  console.log(`[writer] Файл создан: content/articles/${result.slug}.mdx`)

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
  const wordstatInfo =
    result.wordstatKeywords.length > 0
      ? `\n🔑 Wordstat ключей использовано: ${result.wordstatKeywords.length}`
      : '\n🔑 Wordstat: fallback на Claude LSI'
  const imageStatus = imageUrl
    ? `🎨 Картинка: ✅ автоматически`
    : `🎨 Картинка: ❌ не сгенерирована`

  await sendMessage(
    `✅ <b>Статья опубликована!</b>\n\n` +
      `📌 ${topic.title}\n` +
      `${wordstatInfo}\n` +
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
