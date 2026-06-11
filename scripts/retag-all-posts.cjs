/**
 * Full retag of all published posts.
 * Plain CommonJS — run with: node scripts/retag-all-posts.cjs [--dry-run]
 */

'use strict'

require('dotenv/config')
const { Pool } = require('pg')

const DRY_RUN = process.argv.includes('--dry-run')

// ─── Tag keywords (kept in sync with lib/tag-matcher.ts) ──────────────────────

const TAG_KEYWORDS = {
  smm: ['smm', 'смм', 'соцсети', 'social media', 'инстаграм', 'instagram', 'smm менеджер', 'смм менеджер', 'smm-менеджер', 'смм-менеджер', 'сммщик', 'риллс', 'риллсмейкер', 'рилсмейкер', 'рилсы', 'reels'],
  seo: ['seo', 'сео специалист', 'поисковая оптимизация', 'продвижение сайт', 'семантическое ядро', 'wordstat', 'вордстат', 'seo-специалист', 'seo специалист'],
  dizajn: ['дизайн', 'дизайнер', 'designer', 'figma', 'фигма', 'ui/ux', 'ui ux', 'ux/ui', 'тильда', 'tilda', 'adobe', 'иллюстратор', 'illustrator', 'photoshop', 'фотошоп', 'motion', 'моушн'],
  marketing: ['маркетинг', 'маркетолог', 'performance маркетинг', 'performance marketing', 'контент-маркетинг', 'интернет-маркетинг', 'digital маркетинг', 'бренд-менеджер', 'growth'],
  menedzher: ['проджект', 'project manager', 'product manager', 'менеджер проект', 'менеджер продукт', 'продакт менеджер', 'тим лид', 'team lead', 'руководитель проект', 'руководитель отдел', 'amocrm', 'bitrix24', 'битрикс24'],
  target: ['таргет', 'таргетолог', 'директ', 'директолог', 'контекстная реклама', 'яндекс директ', 'yandex direct', 'яндекс.директ', 'vk ads', 'вк реклама', 'mytarget', 'my target', 'ppc специалист', 'контекст специалист'],
  razrabotka: ['разработчик', 'программист', 'прогер', 'developer', 'frontend', 'backend', 'фулстек', 'react', 'python', 'javascript', 'битрикс', 'битрикс24', 'wordpress', 'вордпресс', 'верстальщик', 'верстка', 'opencart', 'open cart', 'joomla'],
  analitika: ['аналитик', 'аналитика', 'analytics', 'data analyst', 'bi'],
  finansy: ['финанс', 'бухгалтер', 'экономист'],
  kreativ: ['креатив', 'креативщик'],
  copywriting: ['копирайтер', 'копирайтинг', 'copywriter', 'copywriting', 'автор текстов', 'рерайтер', 'рерайтинг', 'редактор', 'статьи', 'копир'],
  content: ['контент', 'content', 'контент-мейкер', 'контент мейкер', 'контентмейкер', 'contentmaker', 'content maker', 'контент-стратег', 'контент стратег', 'посты'],
  udalyonka: ['удалённо', 'удаленно', 'удалёнка', 'удаленка', 'remote', 'дистанционно'],
  ofis: ['офис', 'office', 'в офисе'],
  gibrid: ['гибрид', 'гибридный', 'hybrid'],
  junior: ['junior', 'джуниор', 'стажёр', 'стажер', 'начинающий'],
  middle: ['middle', 'мидл'],
  senior: ['senior', 'сеньор', 'ведущий', 'lead'],
}

// Specialization tags — matched against title only
const SPEC_TAG_SLUGS = new Set(['smm','seo','dizajn','marketing','menedzher','target','razrabotka','analitika','finansy','kreativ','copywriting','content'])

function isBoundary(ch) {
  return /[\s.,;:!?\-—–()/\[\]{}«»"'#@\n\r]/.test(ch)
}

function hasKeyword(text, keyword) {
  const lower = text.toLowerCase()
  const kw = keyword.toLowerCase()
  const idx = lower.indexOf(kw)
  if (idx === -1) return false
  const before = idx > 0 ? lower[idx - 1] : ' '
  const after = idx + kw.length < lower.length ? lower[idx + kw.length] : ' '
  return (idx === 0 || isBoundary(before)) && (idx + kw.length >= lower.length || isBoundary(after))
}

function matchTags(title, body) {
  const fullText = body !== undefined ? `${title} ${body}` : title
  const matched = []
  for (const [slug, keywords] of Object.entries(TAG_KEYWORDS)) {
    const searchIn = SPEC_TAG_SLUGS.has(slug) ? title : fullText
    for (const kw of keywords) {
      if (hasKeyword(searchIn, kw)) {
        matched.push(slug)
        break
      }
    }
  }
  return matched
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const dbUrl = process.env.DB_CONNECTION_STRING || process.env.DATABASE_URL
if (!dbUrl) {
  console.error('DB_CONNECTION_STRING or DATABASE_URL env var is required')
  process.exit(1)
}

const pool = new Pool({ connectionString: dbUrl })

async function main() {
  const client = await pool.connect()
  try {
    const knownSlugs = Object.keys(TAG_KEYWORDS)

    const { rows: allTags } = await client.query(
      `SELECT id, slug FROM tags WHERE slug = ANY($1)`,
      [knownSlugs]
    )
    if (allTags.length === 0) {
      console.error('No matching tags found in DB.')
      process.exit(1)
    }

    const tagIdBySlug = Object.fromEntries(allTags.map(t => [t.slug, t.id]))
    const knownTagIds = new Set(allTags.map(t => t.id))

    console.log(`Known matcher tags in DB: ${allTags.length}/${knownSlugs.length}`)
    if (DRY_RUN) console.log('DRY-RUN mode — no DB writes')

    const { rows: posts } = await client.query(
      `SELECT id, title, description FROM posts WHERE status = 'published'`
    )
    console.log(`\nScanning ${posts.length} published posts...\n`)

    const { rows: currentRels } = await client.query(
      `SELECT parent_id, tags_id FROM posts_rels WHERE path = 'tags' AND tags_id = ANY($1)`,
      [Array.from(knownTagIds)]
    )

    const currentTagsByPost = new Map()
    for (const rel of currentRels) {
      if (!currentTagsByPost.has(rel.parent_id)) currentTagsByPost.set(rel.parent_id, new Set())
      currentTagsByPost.get(rel.parent_id).add(rel.tags_id)
    }

    let postsChanged = 0, tagsRemoved = 0, tagsAdded = 0

    for (const post of posts) {
      const shouldHave = new Set(
        matchTags(post.title || '', post.description || undefined)
          .map(slug => tagIdBySlug[slug])
          .filter(Boolean)
      )
      const currentAutoTagIds = currentTagsByPost.get(post.id) || new Set()
      const toRemove = [...currentAutoTagIds].filter(id => !shouldHave.has(id))
      const toAdd = [...shouldHave].filter(id => !currentAutoTagIds.has(id))

      if (toRemove.length === 0 && toAdd.length === 0) continue

      postsChanged++
      const removeSlugs = toRemove.map(id => allTags.find(t => t.id === id)?.slug || id)
      const addSlugs = toAdd.map(id => allTags.find(t => t.id === id)?.slug || id)
      console.log(`Post #${post.id}: -[${removeSlugs.join(', ')}] +[${addSlugs.join(', ')}]`)
      console.log(`  "${(post.title || '').slice(0, 80)}"`)

      if (!DRY_RUN) {
        if (toRemove.length > 0) {
          await client.query(
            `DELETE FROM posts_rels WHERE path = 'tags' AND parent_id = $1 AND tags_id = ANY($2)`,
            [post.id, toRemove]
          )
        }
        for (const tagId of toAdd) {
          await client.query(
            `INSERT INTO posts_rels (parent_id, path, tags_id) VALUES ($1, 'tags', $2) ON CONFLICT DO NOTHING`,
            [post.id, tagId]
          )
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

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
