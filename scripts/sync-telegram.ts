/**
 * Telegram channel sync script
 * Fetches posts via Bot API (full quality photos) and t.me/s/ (text).
 * Writes to Payload CMS REST API — no direct DB access.
 * Run: npm run sync
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'

import { matchTags, TAG_KEYWORDS } from '../lib/tag-matcher'

// Local type — replaces Prisma's generated PostType enum
type PostType = 'vacancy' | 'resume'

// Read bot config from env vars (set in .env file)
const BOT_TOKEN =
  process.env.BOT_TOKEN ??
  (() => {
    // Fallback: read from legacy bot .env file if present
    const legacyPath = '/opt/bots/telegram-bot-vac/.env'
    if (fs.existsSync(legacyPath)) {
      const content = fs.readFileSync(legacyPath, 'utf-8')
      const match = content.match(/^BOT_TOKEN=(.+)$/m)
      if (match) return match[1].trim()
    }
    throw new Error('BOT_TOKEN not set in environment and legacy .env not found')
  })()

const ADMIN_CHAT_ID =
  process.env.ADMIN_ID ??
  (() => {
    const legacyPath = '/opt/bots/telegram-bot-vac/.env'
    if (fs.existsSync(legacyPath)) {
      const content = fs.readFileSync(legacyPath, 'utf-8')
      const match = content.match(/^ADMIN_ID=(.+)$/m)
      if (match) return match[1].trim()
    }
    throw new Error('ADMIN_ID not set in environment and legacy .env not found')
  })()

const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`
const TG_FILE = `https://api.telegram.org/file/bot${BOT_TOKEN}`

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'posts')

// Payload REST API config — required for sync
// Note: PAYLOAD_API_KEY is not resolved at module load time to allow test imports.
// savePost() and main() will throw at runtime if the key is absent.
const PAYLOAD_BASE_URL = process.env.PAYLOAD_BASE_URL ?? 'https://d-pub.ru'

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

// ─── Bot API: download full-quality photo via forwardMessage trick ───

interface TgPhoto {
  file_id: string
  file_unique_id: string
  file_size: number
  width: number
  height: number
}

/**
 * Download full-quality photo from a channel message using Bot API.
 *
 * Strategy: forward the message to ADMIN_CHAT_ID (silently), extract the
 * largest photo size from the response, download it via getFile, then
 * delete the forwarded message to keep the chat clean.
 *
 * Returns local path like `/images/posts/{channel}_{msgId}.jpg` or null.
 */
async function downloadPhotoViaBotAPI(
  channelUsername: string,
  messageId: string
): Promise<string | null> {
  let forwardedMsgId: number | null = null

  try {
    // 1. Forward message to admin chat (silently) to get photo metadata
    const fwdRes = await fetch(`${TG_API}/forwardMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        from_chat_id: `@${channelUsername}`,
        message_id: Number(messageId),
        disable_notification: true,
      }),
    })
    const fwdData = (await fwdRes.json()) as {
      ok: boolean
      result?: { message_id: number; photo?: TgPhoto[] }
    }

    if (!fwdData.ok || !fwdData.result?.photo?.length) {
      // Message has no photo or forward failed
      return null
    }

    forwardedMsgId = fwdData.result.message_id
    const photos = fwdData.result.photo

    // 2. Pick the largest photo (last in array = largest, but sort to be safe)
    const largest = photos.reduce((a, b) => (a.file_size > b.file_size ? a : b))

    // 3. Get the file path on Telegram servers
    const fileRes = await fetch(`${TG_API}/getFile?file_id=${largest.file_id}`)
    const fileData = (await fileRes.json()) as {
      ok: boolean
      result?: { file_path: string }
    }

    if (!fileData.ok || !fileData.result?.file_path) {
      return null
    }

    // 4. Download the actual file
    const downloadUrl = `${TG_FILE}/${fileData.result.file_path}`
    const localFilename = `${channelUsername}_${messageId}.jpg`
    const localPath = await downloadImageLocally(downloadUrl, localFilename)

    if (localPath) {
      console.log(
        `    ✓ Bot API photo: ${largest.width}x${largest.height} (${Math.round(largest.file_size / 1024)} KB)`
      )
    }

    return localPath
  } catch (e) {
    console.error(`    Bot API photo download failed: ${sanitizeError(e)}`)
    return null
  } finally {
    // 5. Always clean up: delete the forwarded message
    if (forwardedMsgId) {
      try {
        await fetch(`${TG_API}/deleteMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            message_id: forwardedMsgId,
          }),
        })
      } catch {
        // Ignore cleanup errors
      }
    }
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
    console.error(`  Failed to download image: ${sanitizeError(e)}`)
    return null
  }
}

async function fetchPagePosts(
  channelUsername: string,
  type: PostType,
  beforeId: string | null,
  seenIds: Set<string>
): Promise<{ posts: TelegramPost[]; minId: string | null }> {
  const url = beforeId
    ? `https://t.me/s/${channelUsername}?before=${beforeId}`
    : `https://t.me/s/${channelUsername}`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' },
  })

  if (!res.ok) {
    console.error(`Failed to fetch ${url}: ${res.status}`)
    return { posts: [], minId: null }
  }

  const html = await res.text()
  const posts: TelegramPost[] = []
  let minId: string | null = null

  const messageBlocks = html.split(/data-post="[^/]+\//).slice(1)

  for (const block of messageBlocks) {
    const idMatch = block.match(/^(\d+)"/)
    if (!idMatch) continue
    const messageId = idMatch[1]

    if (seenIds.has(messageId)) continue
    seenIds.add(messageId)

    if (!minId || Number(messageId) < Number(minId)) minId = messageId

    const hasPhoto =
      /tgme_widget_message_photo_wrap[^>]*style="[^"]*background-image:\s*url\('https?:\/\/cdn/.test(
        block
      )

    let imageUrl: string | null = null

    if (hasPhoto) {
      const botApiPath = await downloadPhotoViaBotAPI(channelUsername, messageId)
      if (botApiPath) {
        imageUrl = botApiPath
      } else {
        const bgImageMatch = block.match(
          /tgme_widget_message_photo_wrap[^>]*style="[^"]*background-image:\s*url\('([^']+)'\)/
        )
        if (bgImageMatch) {
          console.log(`    ⚠ Bot API failed, falling back to t.me/s/ thumbnail`)
          const fallbackUrl = bgImageMatch[1]
          const localFilename = `${channelUsername}_${messageId}.jpg`
          const localPath = await downloadImageLocally(fallbackUrl, localFilename)
          if (localPath) imageUrl = localPath
        }
      }
      await new Promise((r) => setTimeout(r, 300))
    }

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

  return { posts, minId }
}

/** Fetch posts from a public Telegram channel via t.me/s/ with pagination */
async function fetchChannelPosts(channelUsername: string, type: PostType): Promise<TelegramPost[]> {
  const allPosts: TelegramPost[] = []
  const seenIds = new Set<string>()
  let beforeId: string | null = null
  const maxPages = 8 // ~160 posts per channel

  for (let page = 0; page < maxPages; page++) {
    const { posts, minId } = await fetchPagePosts(channelUsername, type, beforeId, seenIds)
    allPosts.push(...posts)

    if (posts.length === 0 || !minId) break

    beforeId = minId
    console.log(`  Page ${page + 1}: ${posts.length} posts (oldest id: ${minId})`)

    await new Promise((r) => setTimeout(r, 500))
  }

  return allPosts
}

function parseTitle(text: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return (lines[0]?.replace(/^#+\s*/, '') ?? 'Без названия').slice(0, 200)
}

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
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  і: 'i',
  ї: 'yi',
  є: 'ye',
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

function parseCompany(text: string): string | null {
  const match = text.match(/(?:компания|работодатель|company|employer)[:\s—–-]+([^\n,]{2,80})/i)
  return match ? match[1].trim() : null
}

function parseSalary(text: string): string | null {
  // Explicit label — any number after зарплата/salary/💰
  const labeled = text.match(
    /(?:зарплата|salary|💰)\s*:?\s*(\d[\d\s]*(?:[-–—]\s*\d[\d\s]*)?\s*(?:₽|руб\.?|rub|k|тыс\.?)?)/i
  )
  if (labeled) return labeled[1].trim()

  // Number with currency unit — requires ₽/руб/тыс/k to avoid false positives
  const withUnit = text.match(/(\d[\d\s]{2,}(?:\s*[-–—]\s*\d[\d\s]*)?\s*(?:₽|руб\.?|тыс\.?|k\b))/i)
  if (withUnit) return withUnit[1].trim()

  return null
}

// Keyword -> tag slug mapping and matching logic live in lib/tag-matcher.ts
// for testability (pure module, no side effects). Re-exported below for
// backwards compatibility.

/**
 * Load tag slug→id map from Payload REST API.
 * Public endpoint — no auth required for read.
 * Returns empty map on any error (posts will be saved without tags).
 */
export async function loadTagMap(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${PAYLOAD_BASE_URL}/api/tags?limit=200`)
    if (!res.ok) return {}
    const data = (await res.json()) as { docs?: Array<{ id: string; slug: string }> }
    const map: Record<string, string> = {}
    for (const tag of data.docs ?? []) {
      map[tag.slug] = tag.id
    }
    return map
  } catch {
    return {}
  }
}

/**
 * Resolve matched tag slugs to Payload tag IDs.
 * Slugs not found in tagMap are silently dropped.
 */
export function resolveTagIds(matchedSlugs: string[], tagMap: Record<string, string>): string[] {
  return matchedSlugs.map((slug) => tagMap[slug]).filter(Boolean)
}

/**
 * Save a post to Payload via REST API.
 * Returns true if created (2xx), false if duplicate (409) or error.
 * Never logs PAYLOAD_API_KEY or Authorization header.
 */
export async function savePost(
  post: TelegramPost,
  tagMap: Record<string, string>
): Promise<boolean> {
  // Resolve API key at call time — throws if not set (not at module load, to allow test imports)
  const PAYLOAD_API_KEY =
    process.env.PAYLOAD_API_KEY ??
    (() => {
      throw new Error('PAYLOAD_API_KEY not set in environment')
    })()

  const title = parseTitle(post.text)
  const tagIds = resolveTagIds(matchTags(`${title} ${post.text}`), tagMap)

  const body = {
    type: post.type,
    title,
    slug: generateSlug(title, post.messageId),
    description: post.text,
    company: parseCompany(post.text),
    salary: parseSalary(post.text),
    imageUrl: post.imageUrl,
    status: 'published',
    source: 'telegram',
    telegramMessageId: post.messageId,
    channelUsername: post.channelUsername,
    tags: tagIds,
  }

  const res = await fetch(`${PAYLOAD_BASE_URL}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `users API-Key ${PAYLOAD_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (res.status === 409) return false // duplicate — normal dedup, no log
  if (!res.ok) {
    // Log only status and URL — never log PAYLOAD_API_KEY or Authorization header
    console.error(`[sync] Failed to save post: ${res.status} ${PAYLOAD_BASE_URL}/api/posts`)
    return false
  }

  return true
}

async function main() {
  console.log('Starting Telegram sync...')
  console.log(`Images will be saved to: ${IMAGES_DIR}`)

  const tagMap = await loadTagMap()
  console.log(`Loaded ${Object.keys(tagMap).length} tags from Payload`)

  let totalNew = 0
  for (const channel of CHANNELS) {
    console.log(`\nFetching @${channel.username}...`)
    const posts = await fetchChannelPosts(channel.username, channel.type)
    console.log(`  Found ${posts.length} posts`)

    let newCount = 0
    for (const post of posts) {
      const isNew = await savePost(post, tagMap)
      if (isNew) newCount++
    }
    console.log(`  Saved ${newCount} new posts`)
    totalNew += newCount
  }

  console.log(`\nSync complete. Total new posts: ${totalNew}`)
}

// Export for testing and backwards compatibility
export { matchTags, TAG_KEYWORDS }

/** Sanitize error messages to prevent bot token leakage */
function sanitizeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.replace(/bot[0-9]+:[A-Za-z0-9_-]+/g, 'bot***:***')
}

// Run only when executed directly (not when imported by tests)
if (require.main === module) {
  main().catch((e) => {
    const msg = sanitizeError(e)
    const cause = e instanceof Error && e.cause ? String((e.cause as Error).message ?? e.cause) : ''
    const stack =
      e instanceof Error ? (e.stack ?? '').replace(/bot[0-9]+:[A-Za-z0-9_-]+/g, 'bot***:***') : ''
    console.error('Sync failed:', msg)
    if (cause) console.error('Cause:', cause)
    if (stack) console.error('Stack:', stack)
    process.exit(1)
  })
}
