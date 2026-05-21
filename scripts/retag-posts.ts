/**
 * Retag existing posts with new tag categories.
 * Additive only — does not remove existing tags.
 * Run: npx tsx scripts/retag-posts.ts
 */

import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { matchTags } from '../lib/tag-matcher'

const TARGET_SLUGS = ['copywriting', 'content']

async function main() {
  const targetTags = await prisma.tag.findMany({
    where: { slug: { in: TARGET_SLUGS } },
  })

  if (targetTags.length === 0) {
    console.error('Target tags not found in DB. Run migrations first.')
    process.exit(1)
  }

  const tagIdBySlug = Object.fromEntries(targetTags.map((t) => [t.slug, t.id]))
  console.log('Target tags:', targetTags.map((t) => `${t.slug} (id=${t.id})`).join(', '))

  const posts = await prisma.post.findMany({
    where: { status: 'published' },
    select: {
      id: true,
      title: true,
      description: true,
      tags: { select: { tagId: true } },
    },
  })

  console.log(`Scanning ${posts.length} published posts...`)

  let added = 0
  let skipped = 0

  for (const post of posts) {
    const text = [post.title, post.description].filter(Boolean).join(' ')
    const matched = matchTags(text)
    const existingTagIds = new Set(post.tags.map((t) => t.tagId))

    for (const slug of TARGET_SLUGS) {
      if (!matched.includes(slug)) continue
      const tagId = tagIdBySlug[slug]
      if (!tagId || existingTagIds.has(tagId)) continue

      await prisma.postTag.create({ data: { postId: post.id, tagId } })
      console.log(`  + post #${post.id} → ${slug}`)
      added++
    }
  }

  skipped = posts.length - added
  console.log(`\nDone. Added ${added} tags across posts (${skipped} posts unchanged).`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
