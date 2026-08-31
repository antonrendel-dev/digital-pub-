/**
 * Retag published vacancies through the Payload REST API.
 *
 * The DB itself is only reachable from the production host, so the tags are
 * written the same way the Telegram sync writes them. Additive only: tags the
 * matcher no longer suggests are left alone, since removing a tag a human added
 * by hand is not something a batch job should decide.
 *
 * Run:     npx tsx scripts/retag-via-api.ts --apply
 * Dry-run: npx tsx scripts/retag-via-api.ts
 */

import 'dotenv/config'
import { matchTags, TAG_KEYWORDS, TOOL_TAG_SLUGS } from '../lib/tag-matcher'

const BASE = process.env.SITE_URL ?? 'https://d-pub.ru'
const API_KEY = process.env.PAYLOAD_API_KEY
const APPLY = process.argv.includes('--apply')

if (!API_KEY) {
  console.error('PAYLOAD_API_KEY env var is required')
  process.exit(1)
}

const auth = { Authorization: `users API-Key ${API_KEY}`, 'Content-Type': 'application/json' }

interface Post {
  id: number
  title: string | null
  description: string | null
  tags: number[] | null
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { ...auth, ...(init?.headers ?? {}) } })
  if (!res.ok)
    throw new Error(`${res.status} ${res.statusText} — ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

async function main() {
  const tagPage = await fetchJson(`${BASE}/api/tags?limit=200&depth=0`)
  const idBySlug = new Map<string, number>(
    (tagPage.docs as { id: number; slug: string }[]).map((t) => [t.slug, t.id])
  )
  const knownSlugs = [...Object.keys(TAG_KEYWORDS), ...Object.keys(TOOL_TAG_SLUGS)]
  const missing = knownSlugs.filter((s) => !idBySlug.has(s))
  if (missing.length) console.log(`нет в базе тегов: ${missing.join(', ')}`)

  const posts: Post[] = []
  for (let page = 1; ; page++) {
    const data = await fetchJson(
      `${BASE}/api/posts?limit=500&page=${page}&depth=0&where[type][equals]=vacancy&where[status][equals]=published`
    )
    posts.push(...(data.docs as Post[]))
    if (!data.hasNextPage) break
  }
  console.log(`вакансий: ${posts.length}${APPLY ? '' : '  (сухой прогон)'}`)

  const added: Record<string, number> = {}
  let changed = 0
  let failed = 0

  for (const post of posts) {
    const current = new Set(post.tags ?? [])
    const wanted = matchTags(post.title ?? '', post.description ?? undefined)
      .map((slug) => idBySlug.get(slug))
      .filter((id): id is number => id !== undefined)
    const toAdd = wanted.filter((id) => !current.has(id))
    if (!toAdd.length) continue

    changed++
    for (const id of toAdd) {
      const slug = [...idBySlug].find(([, v]) => v === id)?.[0] ?? String(id)
      added[slug] = (added[slug] ?? 0) + 1
    }

    if (APPLY) {
      try {
        await fetchJson(`${BASE}/api/posts/${post.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ tags: [...current, ...toAdd] }),
        })
      } catch (err) {
        failed++
        console.error(`  #${post.id}: ${(err as Error).message}`)
      }
      if (changed % 50 === 0) console.log(`  … ${changed}`)
    }
  }

  console.log(`\nпостов затронуто: ${changed} | ошибок: ${failed}`)
  for (const [slug, n] of Object.entries(added).sort((a, b) => b[1] - a[1])) {
    console.log(`  +${String(n).padStart(4)}  ${slug}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
