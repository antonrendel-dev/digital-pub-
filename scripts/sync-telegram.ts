/**
 * Telegram channel sync script
 * Fetches posts from t.me/s/<channel> and saves new ones to the DB.
 * Run: npm run sync
 */

// Must be first so DATABASE_URL is available for prisma.ts
import 'dotenv/config'

import { PostType } from '@prisma/client'
import { prisma } from '../lib/prisma'

const CHANNELS: { username: string; type: PostType }[] = [
  { username: 'web_vacancy', type: 'vacancy' },
  { username: 'pub_resume', type: 'resume' },
]

interface TelegramPost {
  messageId: string
  text: string
  channelUsername: string
  type: PostType
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

  // Extract message blocks by data-post attribute and message text div
  const messageRegex =
    /data-post="[^/]+\/(\d+)"[\s\S]*?class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g

  let match
  while ((match = messageRegex.exec(html)) !== null) {
    const messageId = match[1]
    const rawHtml = match[2]

    const text = rawHtml
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
      posts.push({ messageId, text, channelUsername, type })
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

function parseSalary(text: string): string | null {
  const match = text.match(
    /(?:зарплата|salary|от|до|💰)[:\s]*([0-9][0-9\s]*(?:000)?(?:\s*[-–—]\s*[0-9][0-9\s]*(?:000)?)?\s*(?:₽|руб|rub|k|тыс)?)/i
  )
  return match ? match[1].trim() : null
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

  await prisma.post.create({
    data: {
      type: post.type,
      title: parseTitle(post.text),
      description: post.text,
      salary: parseSalary(post.text),
      status: 'published',
      source: 'telegram',
      telegramMessageId: post.messageId,
      channelUsername: post.channelUsername,
    },
  })

  return true
}

async function main() {
  console.log('Starting Telegram sync...')
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

  console.log(`\nSync complete. Total new posts: ${totalNew}`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
