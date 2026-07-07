/**
 * Full retag of all published posts.
 *
 * Operates on the Payload CMS `posts_rels` table (path='tags') — the actual
 * table the site reads from. The Prisma `PostTag` model is a separate legacy
 * table not used by Payload.
 *
 * Only tags whose slugs exist in TAG_KEYWORDS are touched — any tags
 * manually added outside the matcher are left intact.
 *
 * Run: npx tsx scripts/retag-all-posts.ts
 * Dry-run: npx tsx scripts/retag-all-posts.ts --dry-run
 */

import 'dotenv/config'
import { Pool } from 'pg'
import { matchTags, TAG_KEYWORDS, TOOL_TAG_SLUGS } from '../lib/tag-matcher'

const dbUrl = process.env.DB_CONNECTION_STRING ?? process.env.DATABASE_URL
if (!dbUrl) {
  console.error('DB_CONNECTION_STRING or DATABASE_URL env var is required')
  process.exit(1)
}

const pool = new Pool({ connectionString: dbUrl })
const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  const client = await pool.connect()

  try {
    // All known tag slugs: keyword-based + tool regex-based
    const allKnownSlugs = [...Object.keys(TAG_KEYWORDS), ...Object.keys(TOOL_TAG_SLUGS)]

    // Load all known tags from DB
    const { rows: allTags } = await client.query<{ id: number; slug: string }>(
      `SELECT id, slug FROM tags WHERE slug = ANY($1)`,
      [allKnownSlugs]
    )

    if (allTags.length === 0) {
      console.error('No matching tags found in DB.')
      process.exit(1)
    }

    const tagIdBySlug = Object.fromEntries(allTags.map((t) => [t.slug, t.id]))
    const knownTagIds = new Set(allTags.map((t) => t.id))

    console.log(`Known matcher tags in DB: ${allTags.length}/${allKnownSlugs.length}`)
    if (DRY_RUN) console.log('DRY-RUN mode — no DB writes')

    // Load all published posts
    const { rows: posts } = await client.query<{
      id: number
      title: string
      description: string | null
    }>(`SELECT id, title, description FROM posts WHERE status = 'published'`)

    console.log(`\nScanning ${posts.length} published posts...\n`)

    // Load current tags from posts_rels (path='tags')
    const { rows: currentRels } = await client.query<{ parent_id: number; tags_id: number }>(
      `SELECT parent_id, tags_id FROM posts_rels WHERE path = 'tags' AND tags_id = ANY($1)`,
      [Array.from(knownTagIds)]
    )

    // Build map: postId → Set of current auto-tag IDs
    const currentTagsByPost = new Map<number, Set<number>>()
    for (const rel of currentRels) {
      if (!currentTagsByPost.has(rel.parent_id)) currentTagsByPost.set(rel.parent_id, new Set())
      currentTagsByPost.get(rel.parent_id)!.add(rel.tags_id)
    }

    let postsChanged = 0
    let tagsRemoved = 0
    let tagsAdded = 0

    for (const post of posts) {
      const shouldHave = new Set(
        matchTags(post.title ?? '', post.description ?? undefined)
          .map((slug) => tagIdBySlug[slug])
          .filter(Boolean) as number[]
      )

      const currentAutoTagIds = currentTagsByPost.get(post.id) ?? new Set<number>()
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
          await client.query(
            `DELETE FROM posts_rels WHERE path = 'tags' AND parent_id = $1 AND tags_id = ANY($2)`,
            [post.id, toRemove]
          )
        }
        if (toAdd.length > 0) {
          for (const tagId of toAdd) {
            await client.query(
              `INSERT INTO posts_rels (parent_id, path, tags_id) VALUES ($1, 'tags', $2) ON CONFLICT DO NOTHING`,
              [post.id, tagId]
            )
          }
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
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(console.error)
