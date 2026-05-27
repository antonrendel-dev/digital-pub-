/**
 * One-time migration script: Prisma tag table → Payload tags collection.
 *
 * Usage (on staging first, then prod cutover):
 *   npx tsx scripts/migrate-tags.ts
 *
 * Requirements:
 *   - DB_CONNECTION_STRING env var must point to the target database
 *   - PAYLOAD_SECRET env var must be set (32+ chars)
 *   - Payload collections must be registered in payload.config.ts
 */

import type { Payload } from 'payload'
import type { PrismaClient } from '../generated/prisma'

// ────────────────────────────────────────────────────────────────────────────
// Exported helpers (used by tests)
// ────────────────────────────────────────────────────────────────────────────

/** Wrap a plain-text string in minimal Lexical JSON structure. */
export function toRichText(plainText: string | null | undefined): object | null {
  if (!plainText) return null
  return {
    root: {
      type: 'root',
      version: 1,
      children: [
        {
          type: 'paragraph',
          version: 1,
          children: [
            {
              type: 'text',
              version: 1,
              text: plainText,
              format: 0,
            },
          ],
        },
      ],
    },
  }
}

type PrismaTag = {
  id: number
  name: string
  slug: string
  tagType: 'format' | 'level' | 'specialization'
  seoTitle: string | null
  seoDescription: string | null
  seoText: string | null
}

/** Build the Payload create data object from a Prisma tag row. */
export function buildTagData(tag: PrismaTag) {
  return {
    name: tag.name,
    slug: tag.slug,
    tagType: tag.tagType,
    h1: null, // field does not exist in Prisma; set null for all migrated tags
    seoTitle: tag.seoTitle,
    seoDescription: tag.seoDescription,
    seoText: toRichText(tag.seoText),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Core migration function (injectable for tests)
// ────────────────────────────────────────────────────────────────────────────

export type MigrateFn = typeof migrateTags

export async function migrateTags(
  prisma: Pick<PrismaClient, 'tag'>,
  payload: Pick<Payload, 'create' | 'find'>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags = await (prisma.tag as any).findMany()
  const prismaCount = tags.length

  console.log(`[migrate-tags] Found ${prismaCount} tags in Prisma. Starting migration…`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const tag of tags) {
    const data = buildTagData(tag as PrismaTag)
    try {
      await payload.create({
        collection: 'tags',
        data,
        overrideAccess: true,
      })
      created++
      console.log(`[migrate-tags] ✓ ${tag.slug}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (
        message.toLowerCase().includes('unique') ||
        message.toLowerCase().includes('duplicate') ||
        message.toLowerCase().includes('already exists')
      ) {
        skipped++
        console.log(`[migrate-tags] skip (already exists): ${tag.slug}`)
      } else {
        errors++
        console.error(`[migrate-tags] ERROR for ${tag.slug}:`, message)
      }
    }
  }

  // Count assertion
  const payloadResult = await payload.find({ collection: 'tags', limit: 0 })
  const payloadCount = payloadResult.totalDocs

  console.log(`\n[migrate-tags] Summary:`)
  console.log(`  Prisma count : ${prismaCount}`)
  console.log(`  Payload count: ${payloadCount}`)
  console.log(`  Created      : ${created}`)
  console.log(`  Skipped      : ${skipped}`)
  console.log(`  Errors       : ${errors}`)

  if (errors > 0) {
    throw new Error(`[migrate-tags] Migration completed with ${errors} error(s). Check logs above.`)
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
    await migrateTags(prisma as any, payload)
    console.log('\n[migrate-tags] Done.')
    process.exit(0)
  } catch (err) {
    console.error('\n[migrate-tags] Fatal:', err)
    process.exit(1)
  }
}

// Run only when executed directly (not when imported by tests)
if (require.main === module) {
  main()
}
