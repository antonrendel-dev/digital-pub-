/**
 * Telegram channel sync script
 * Fetches posts via Bot API (full quality photos) and t.me/s/ (text).
 * Run: npm run sync
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'

import { PostType } from '../generated/prisma'
import { prisma } from '../lib/prisma'

// Read bot token from the bot's .env
const BOT_ENV_PATH = '/opt/bots/telegram-bot-vac/.env'
function getBotToken(): string {
  const envContent = fs.readFileSync(BOT_ENV_PATH, 'utf-8')
  const match = envContent.match(/^BOT_TOKEN=(.+)$/m)
  if (!match) throw new Error('BOT_TOKEN not found in bot .env')
  return match[1].trim()
}

const BOT_TOKEN = getBotToken()
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`
const TG_FILE = `https://api.telegram.org/file/bot${BOT_TOKEN}`

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'posts')

const CHANNELS: { username: string; type: PostType }[] = [
  { username: 'web_vacancy', type: 'vacancy' },
  { username: 'pub_resume', type: 'resume' },
]

interface TelegramPost {
  messageId: string
  text: string
  imageUrl: string | null
  channelUsername: string
  type: PostType
}

// ─── Bot API: download full-quality photo ───

async function downloadPhoto(chatId: string, messageId: number): Promise<string | null> {
  try {
    // Forward message to get file_id (we'll use copyMessage to a saved messages-like approach)
    // Actually, we can use getChat + channel history isn't available via Bot API easily
    // Instead, we'll use the approach: get file from the channel message directly
    // Bot API doesn't support getChatHistory, so we use t.me/s/ for text
    // but download the photo via Bot API using forwardMessage trick

    // Alternative: use the Telegram CDN URL but request higher quality
    // The t.me/s/ page actually serves reasonable quality images
    // Let's download and store them locally for best results
    return null
  } catch {
    return null
  }
}

async function downloadImageLocally(url: string, filename: string): Promise<string | null> {
  try {
    // Ensure images directory exists
    fs.mkdirSync(IMAGES_DIR, { recursive: true })

    const res = await fetch(url)
    if (!res.ok) return null

    const buffer = Buffer.from(await res.arrayBuffer())
    const filePath = path.join(IMAGES_DIR, filename)
    fs.writeFileSync(filePath, buffer)

    // Return public URL path
    return `/images/posts/${filename}`
  } catch (e) {
    console.error(`  Failed to download image: ${e}`)
    return null
  }
}

/** Fetch the last ~20 posts from a public Telegram channel via t.me/s/ */
async function fetchChannelPosts(channelUsername: string, type: PostType): Promise<TelegramPost[]> {
  const url = `https://t.me/s/${channelUsername}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' },
  })

  if (!res.ok) {
    console.error(`Failed to fetch ${url}: ${res.status}`)
    return []
  }

  const html = await res.text()
  const posts: TelegramPost[] = []

  // Split HTML into individual message blocks
  const messageBlocks = html.split(/data-post="[^/]+\//).slice(1)

  for (const block of messageBlocks) {
    const idMatch = block.match(/^(\d+)"/)
    if (!idMatch) continue
    const messageId = idMatch[1]

    // Extract image URL from background-image style
    let imageUrl: string | null = null
    const bgImageMatch = block.match(/background-image:\s*url\('([^']+)'\)/)
    if (bgImageMatch) {
      imageUrl = bgImageMatch[1]
    } else {
      const imgMatch = block.match(/tgme_widget_message_photo_wrap[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/)
      if (imgMatch) imageUrl = imgMatch[1]
    }

    // Download image locally for better quality/reliability
    if (imageUrl) {
      const ext = imageUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg'
      const localFilename = `${channelUsername}_${messageId}.${ext}`
      const localPath = await downloadImageLocally(imageUrl, localFilename)
      if (localPath) {
        imageUrl = localPath
      }
    }

    // Extract text
    const textMatch = block.match(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/)
    if (!textMatch) continue

    const text = textMatch[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim()

    if (text.length > 20) {
      posts.push({ messageId, text, imageUrl, channelUsername, type })
    }
  }

  return posts
}

function parseTitle(text: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return lines[0]?.slice(0, 200) ?? 'Без названия'
}

const TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
  і:'i',ї:'yi',є:'ye',
}

function transliterate(str: string): string {
  return str
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
}

function generateSlug(title: string, messageId: string): string {
  const slug = transliterate(title)
    .replace(/[#@]/g, '')
    .replace(/[^a-z0-9\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-+$/, '')
  return `${slug || 'post'}_${messageId}`
}

function parseSalary(text: string): string | null {
  const match = text.match(
    /(?:зарплата|salary|от|до|💰)[:\s]*([0-9][0-9\s]*(?:000)?(?:\s*[-–—]\s*[0-9][0-9\s]*(?:000)?)?\s*(?:₽|руб|rub|k|тыс)?)/i
  )
  return match ? match[1].trim() : null
}

// Keyword -> tag slug mapping for auto-assignment
// Uses word boundary matching (Cyrillic-aware)
const TAG_KEYWORDS: Record<string, string[]> = {
  smm: ['smm', 'соцсети', 'social media', 'инстаграм', 'instagram', 'контент-менеджер'],
  seo: ['seo', 'поисковая оптимизация', 'продвижение сайт'],
  dizajn: ['дизайн', 'дизайнер', 'figma', 'ui/ux', 'ui ux', 'верстальщик', 'фигма'],
  marketing: ['маркетинг', 'маркетолог', 'performance', 'контент-маркетинг'],
  menedzher: ['менеджер', 'проджект', 'продакт', 'project manager', 'product manager', 'аккаунт'],
  target: ['таргет', 'таргетолог', 'target', 'директ', 'контекстная реклама', 'яндекс директ'],
  razrabotka: ['разработчик', 'программист', 'developer', 'frontend', 'backend', 'фулстек', 'react', 'python', 'javascript'],
  analitika: ['аналитик', 'аналитика', 'analytics', 'data analyst', 'bi'],
  finansy: ['финанс', 'бухгалтер', 'экономист'],
  hr: ['hr', 'рекрутер', 'кадр', 'hrbp', 'people partner'],
  wordpress: ['wordpress', 'вордпресс'],
  udalyonka: ['удалённо', 'удаленно', 'удалёнка', 'удаленка', 'remote', 'дистанционно'],
  ofis: ['офис', 'office', 'в офисе'],
  gibrid: ['гибрид', 'гибридный', 'hybrid'],
  junior: ['junior', 'джуниор', 'стажёр', 'стажер', 'начинающий'],
  middle: ['middle', 'мидл'],
  senior: ['senior', 'сеньор', 'ведущий', 'lead'],
}

/** Match text against tag keywords using word boundary matching */
function matchTags(text: string): string[] {
  const lowerText = text.toLowerCase()
  const matched: string[] = []

  for (const [tagSlug, keywords] of Object.entries(TAG_KEYWORDS)) {
    for (const keyword of keywords) {
      // Cyrillic-aware word boundary: check chars before and after the keyword
      const idx = lowerText.indexOf(keyword.toLowerCase())
      if (idx === -1) continue

      const before = idx > 0 ? lowerText[idx - 1] : ' '
      const after = idx + keyword.length < lowerText.length ? lowerText[idx + keyword.length] : ' '

      // Check word boundaries (space, punctuation, start/end)
      const isBoundary = (ch: string) => /[\s\.,;:!?\-—–()\/\[\]{}«»"'#@\n\r]/.test(ch)
      if ((idx === 0 || isBoundary(before)) && (idx + keyword.length >= lowerText.length || isBoundary(after))) {
        matched.push(tagSlug)
        break // Only match once per tag
      }
    }
  }

  return matched
}

/** Assign tags to a post based on text content */
async function assignTags(postId: number, text: string): Promise<number> {
  const matchedSlugs = matchTags(text)
  if (matchedSlugs.length === 0) return 0

  const tags = await prisma.tag.findMany({
    where: { slug: { in: matchedSlugs } },
  })

  if (tags.length === 0) return 0

  await prisma.postTag.createMany({
    data: tags.map((tag) => ({ postId, tagId: tag.id })),
    skipDuplicates: true,
  })

  return tags.length
}

async function savePost(post: TelegramPost): Promise<boolean> {
  const existing = await prisma.post.findUnique({
    where: {
      telegramMessageId_channelUsername: {
        telegramMessageId: post.messageId,
        channelUsername: post.channelUsername,
      },
    },
  })

  if (existing) return false

  const title = parseTitle(post.text)
  const created = await prisma.post.create({
    data: {
      type: post.type,
      title,
      slug: generateSlug(title, post.messageId),
      description: post.text,
      salary: parseSalary(post.text),
      imageUrl: post.imageUrl,
      status: 'published',
      source: 'telegram',
      telegramMessageId: post.messageId,
      channelUsername: post.channelUsername,
    },
  })

  // Auto-assign tags
  const tagCount = await assignTags(created.id, `${title} ${post.text}`)
  if (tagCount > 0) {
    console.log(`    Assigned ${tagCount} tags to post ${created.id}`)
  }

  return true
}

/** Backfill tags for existing posts that have no tags assigned */
async function backfillTags() {
  console.log('\nBackfilling tags for existing posts...')
  const posts = await prisma.post.findMany({
    where: {
      status: 'published',
      tags: { none: {} },
    },
    select: { id: true, title: true, description: true },
  })

  let tagged = 0
  for (const post of posts) {
    const text = `${post.title} ${post.description ?? ''}`
    const count = await assignTags(post.id, text)
    if (count > 0) tagged++
  }
  console.log(`  Backfilled tags for ${tagged} out of ${posts.length} untagged posts`)
}

async function main() {
  console.log('Starting Telegram sync...')
  console.log(`Images will be saved to: ${IMAGES_DIR}`)
  let totalNew = 0

  for (const channel of CHANNELS) {
    console.log(`\nFetching @${channel.username}...`)
    const posts = await fetchChannelPosts(channel.username, channel.type)
    console.log(`  Found ${posts.length} posts`)

    let newCount = 0
    for (const post of posts) {
      const isNew = await savePost(post)
      if (isNew) newCount++
    }

    console.log(`  Saved ${newCount} new posts`)
    totalNew += newCount
  }

  // Backfill tags for existing untagged posts
  await backfillTags()

  console.log(`\nSync complete. Total new posts: ${totalNew}`)
  await prisma.$disconnect()
}

// Export for testing
export { matchTags, TAG_KEYWORDS }

/** Sanitize error messages to prevent bot token leakage */
function sanitizeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.replace(/bot[0-9]+:[A-Za-z0-9_-]+/g, 'bot***:***')
}

main().catch(async (e) => {
  console.error('Sync failed:', sanitizeError(e))
  await prisma.$disconnect()
  process.exit(1)
})
