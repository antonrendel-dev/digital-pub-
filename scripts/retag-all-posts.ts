/**
 * Full retag of all published posts.
 *
 * Unlike retag-posts.ts (additive-only), this script does a clean replace:
 * removes all auto-matched tags from a post, then adds the ones that
 * matchTags() returns based on the current TAG_KEYWORDS dictionary.
 *
 * Only tags whose slugs exist in TAG_KEYWORDS are touched — any tags
 * manually added outside the matcher are left intact.
 *
 * Run: npx tsx scripts/retag-all-posts.ts
 * Dry-run: npx tsx scripts/retag-all-posts.ts --dry-run
 */

import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma'
import { matchTags, TAG_KEYWORDS } from '../lib/tag-matcher'

const dbUrl = process.env.DB_CONNECTION_STRING ?? process.env.DATABASE_URL
if (!dbUrl) {
  console.error('DB_CONNECTION_STRING or DATABASE_URL env var is required')
  process.exit(1)
}
const pool = new Pool({ connectionString: dbUrl })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  const knownSlugs = Object.keys(TAG_KEYWORDS)

  // Load all auto-matched tag records from DB
  const allTags = await prisma.tag.findMany({
    where: { slug: { in: knownSlugs } },
  })

  if (allTags.length === 0) {
    console.error('No matching tags found in DB. Check TAG_KEYWORDS slugs.')
    process.exit(1)
  }

  const tagIdBySlug = Object.fromEntries(allTags.map((t) => [t.slug, t.id]))
  const knownTagIds = new Set(allTags.map((t) => t.id))

  console.log(`Known matcher tags in DB: ${allTags.length}/${knownSlugs.length}`)
  if (DRY_RUN) console.log('DRY-RUN mode — no DB writes')

  const posts = await prisma.post.findMany({
    where: { status: 'published' },
    select: {
      id: true,
      title: true,
      description: true,
      tags: { select: { tagId: true } },
    },
  })

  console.log(`\nScanning ${posts.length} published posts...\n`)

  let postsChanged = 0
  let tagsRemoved = 0
  let tagsAdded = 0

  for (const post of posts) {
    const shouldHave = new Set(
      matchTags(post.title ?? '', post.description ?? undefined)
        .map((slug) => tagIdBySlug[slug])
        .filter(Boolean) as number[]
    )

    const currentAutoTagIds = new Set(
      post.tags.map((t) => t.tagId).filter((id) => knownTagIds.has(id))
    )

    const toRemove = [...currentAutoTagIds].filter((id) => !shouldHave.has(id))
    const toAdd = [...shouldHave].filter((id) => !currentAutoTagIds.has(id))

    if (toRemove.length === 0 && toAdd.length === 0) continue

    postsChanged++
    const removeSlugs = toRemove.map((id) => allTags.find((t) => t.id === id)?.slug ?? id)
    const addSlugs = toAdd.map((id) => allTags.find((t) => t.id === id)?.slug ?? id)

    console.log(`Post #${post.id}: -[${removeSlugs.join(', ')}] +[${addSlugs.join(', ')}]`)
    console.log(`  "${(post.title ?? '').slice(0, 80)}"`)

    if (!DRY_RUN) {
      if (toRemove.length > 0) {
        await prisma.postTag.deleteMany({
          where: { postId: post.id, tagId: { in: toRemove } },
        })
      }
      if (toAdd.length > 0) {
        await prisma.postTag.createMany({
          data: toAdd.map((tagId) => ({ postId: post.id, tagId })),
          skipDuplicates: true,
        })
      }
    }

    tagsRemoved += toRemove.length
    tagsAdded += toAdd.length
  }

  console.log(`\n--- Summary ---`)
  console.log(`Posts changed:  ${postsChanged} / ${posts.length}`)
  console.log(`Tags removed:   ${tagsRemoved}`)
  console.log(`Tags added:     ${tagsAdded}`)
  if (DRY_RUN) console.log('(dry-run — nothing written)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
