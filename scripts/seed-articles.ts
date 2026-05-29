import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const PAYLOAD_BASE_URL = process.env.PAYLOAD_BASE_URL ?? 'https://d-pub.ru'
const ARTICLES_DIR = path.join(process.cwd(), 'content', 'articles')

async function seedArticles() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'in-ekb@mail.ru'
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) throw new Error('ADMIN_PASSWORD not set')

  const loginRes = await fetch(`${PAYLOAD_BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  const loginData = (await loginRes.json()) as { token?: string }
  if (!loginData.token) throw new Error('Login failed')
  const token = loginData.token
  console.log('Logged in')

  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.mdx'))
  let created = 0
  let updated = 0
  let failed = 0

  for (const file of files) {
    const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf-8')
    const { data } = matter(raw)
    if (!data.title || !data.slug) continue

    const payload = {
      title: data.title,
      slug: data.slug,
      description: data.description ?? '',
      metaTitle: data.metaTitle ?? data.title,
      metaDescription: data.metaDescription ?? data.description ?? '',
      publishedAt: data.publishedAt ?? new Date().toISOString(),
      status: 'published',
    }

    const createRes = await fetch(`${PAYLOAD_BASE_URL}/api/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })

    if (createRes.ok) {
      console.log(`  ✓ created: ${data.slug}`)
      created++
      continue
    }

    if (createRes.status === 400 || createRes.status === 409) {
      const findRes = await fetch(
        `${PAYLOAD_BASE_URL}/api/articles?where[slug][equals]=${data.slug}&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const findData = (await findRes.json()) as { docs?: Array<{ id: number }> }
      const existing = findData.docs?.[0]
      if (existing) {
        const patchRes = await fetch(`${PAYLOAD_BASE_URL}/api/articles/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        })
        if (patchRes.ok) {
          console.log(`  ↑ updated: ${data.slug}`)
          updated++
        } else {
          console.error(`  ✗ patch failed: ${data.slug}`)
          failed++
        }
        continue
      }
    }

    console.error(`  ✗ failed: ${data.slug} — ${createRes.status}`)
    failed++
  }

  console.log(`\nDone. Created: ${created}, updated: ${updated}, failed: ${failed}`)
}

seedArticles().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
