/**
 * One-time migration script: Prisma post + post_tag tables → Payload posts collection.
 *
 * Usage (run migrate-tags.ts FIRST — posts depend on Payload tag IDs):
 *   npx tsx scripts/migrate-posts.ts
 *
 * Requirements:
 *   - DB_CONNECTION_STRING env var must point to the target database
 *   - PAYLOAD_SECRET env var must be set (32+ chars)
 *   - Tags must already be migrated (migrate-tags.ts must have run successfully)
 *   - Payload posts collection must be registered in payload.config.ts
 *   - custom-posts-unique-idx.sql must be applied after payload migrate
 */

import type { Payload } from 'payload'
import type { PrismaClient } from '../generated/prisma'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type PrismaPost = {
  id: number
  type: 'vacancy' | 'resume'
  title: string
  slug: string | null
  description: string | null
  company: string | null
  salary: string | null
  status: 'pending' | 'published' | 'rejected'
  source: 'telegram' | 'user'
  imageUrl: string | null
  telegramMessageId: string | null
  channelUsername: string | null
  categoryId: number | null
  createdAt: Date
  updatedAt: Date
}

type PrismaPostTag = {
  tagId: number
  tag: { slug: string }
}

// MigratePostsFn type exported for tests
export type MigratePostsFn = typeof migratePosts

// ────────────────────────────────────────────────────────────────────────────
// Exported helpers (used by tests)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the Payload create data object from a Prisma post row.
 * Maps Prisma camelCase fields → Payload field names (stored as snake_case by Drizzle in DB).
 * categoryId is intentionally omitted — posts use tags relationship instead.
 */
export function buildPostData(
  post: PrismaPost,
  postTags: PrismaPostTag[],
  tagIdMap: Map<string, string>
) {
  // Resolve Payload tag IDs from slug map — skip unknown slugs
  const resolvedTagIds: string[] = []
  for (const pt of postTags) {
    const payloadId = tagIdMap.get(pt.tag.slug)
    if (payloadId) {
      resolvedTagIds.push(payloadId)
    }
  }

  return {
    type: post.type,
    title: post.title,
    slug: post.slug,
    description: post.description,
    company: post.company,
    salary: post.salary,
    status: post.status,
    source: post.source,
    imageUrl: post.imageUrl,
    telegramMessageId: post.telegramMessageId,
    channelUsername: post.channelUsername,
    tags: resolvedTagIds,
    // Preserve original timestamps for chronological ordering
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    // categoryId intentionally omitted
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Core migration function (injectable for tests)
// ────────────────────────────────────────────────────────────────────────────

export async function migratePosts(
  prisma: Pick<PrismaClient, 'post'>,
  payload: Pick<Payload, 'create' | 'find'>
): Promise<void> {
  // Step 1: Build slug → Payload ID map for tags
  console.log('[migrate-posts] Loading Payload tags…')
  const tagsResult = await payload.find({ collection: 'tags', limit: 1000 })
  const tagIdMap = new Map<string, string>()
  for (const tag of tagsResult.docs as Array<{ id: string; slug: string }>) {
    tagIdMap.set(tag.slug, tag.id)
  }
  console.log(`[migrate-posts] Loaded ${tagIdMap.size} tags from Payload`)

  // Step 2: Load all Prisma posts with their PostTag relations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts = await (prisma.post as any).findMany({
    include: {
      tags: {
        include: { tag: true },
      },
    },
    orderBy: { id: 'asc' },
  })
  const prismaCount: number = posts.length

  console.log(`[migrate-posts] Found ${prismaCount} posts in Prisma. Starting migration…`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const post of posts) {
    const { tags: postTags, ...postData } = post
    const data = buildPostData(postData as PrismaPost, postTags as PrismaPostTag[], tagIdMap)

    try {
      await payload.create({
        collection: 'posts',
        data,
        overrideAccess: true, // required: no authenticated user in migration context
      })
      created++
      if (created % 100 === 0) {
        console.log(`[migrate-posts] Progress: ${created}/${prismaCount}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (
        message.toLowerCase().includes('unique') ||
        message.toLowerCase().includes('duplicate') ||
        message.toLowerCase().includes('already exists') ||
        message.toLowerCase().includes('conflict')
      ) {
        skipped++
        console.log(`[migrate-posts] skip (already exists): post ID ${post.id}`)
      } else {
        errors++
        console.error(`[migrate-posts] ERROR for post ID ${post.id}:`, message)
      }
    }
  }

  // Count assertion
  const payloadResult = await payload.find({ collection: 'posts', limit: 0 })
  const payloadCount: number = payloadResult.totalDocs

  console.log(`\n[migrate-posts] Summary:`)
  console.log(`  Prisma count : ${prismaCount}`)
  console.log(`  Payload count: ${payloadCount}`)
  console.log(`  Created      : ${created}`)
  console.log(`  Skipped      : ${skipped}`)
  console.log(`  Errors       : ${errors}`)

  if (prismaCount !== payloadCount && skipped === 0) {
    console.warn(
      `[migrate-posts] WARNING: Prisma count (${prismaCount}) !== Payload count (${payloadCount}). Verify data integrity.`
    )
  }

  if (errors > 0) {
    throw new Error(
      `[migrate-posts] Migration completed with ${errors} error(s). Check logs above.`
    )
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Entry point (run directly via tsx)
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  // Dynamic imports — not loaded during unit tests
  const { default: config } = await import('../payload.config')
  const { getPayload } = await import('payload')
  const { prisma } = await import('../lib/prisma')

  const payload = await getPayload({ config })

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migratePosts(prisma as any, payload)
    console.log('\n[migrate-posts] Done.')
    process.exit(0)
  } catch (err) {
    console.error('\n[migrate-posts] Fatal:', err)
    process.exit(1)
  }
}

// Run only when executed directly (not when imported by tests)
if (require.main === module) {
  main()
}
