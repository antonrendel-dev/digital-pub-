import 'dotenv/config'

const PAYLOAD_BASE_URL = process.env.PAYLOAD_BASE_URL ?? 'https://d-pub.ru'

const TAGS = [
  { slug: 'smm', name: 'SMM', tagType: 'specialization' },
  { slug: 'seo', name: 'SEO', tagType: 'specialization' },
  { slug: 'dizajn', name: 'Дизайн', tagType: 'specialization' },
  { slug: 'marketing', name: 'Маркетинг', tagType: 'specialization' },
  { slug: 'menedzher', name: 'Менеджер', tagType: 'specialization' },
  { slug: 'target', name: 'Таргет', tagType: 'specialization' },
  { slug: 'razrabotka', name: 'Разработка', tagType: 'specialization' },
  { slug: 'analitika', name: 'Аналитика', tagType: 'specialization' },
  { slug: 'finansy', name: 'Финансы', tagType: 'specialization' },
  { slug: 'kreativ', name: 'Креатив', tagType: 'specialization' },
  { slug: 'copywriting', name: 'Копирайтинг', tagType: 'specialization' },
  { slug: 'content', name: 'Контент', tagType: 'specialization' },
  { slug: 'udalyonka', name: 'Удалёнка', tagType: 'format' },
  { slug: 'ofis', name: 'Офис', tagType: 'format' },
  { slug: 'gibrid', name: 'Гибрид', tagType: 'format' },
  { slug: 'junior', name: 'Junior', tagType: 'level' },
  { slug: 'middle', name: 'Middle', tagType: 'level' },
  { slug: 'senior', name: 'Senior', tagType: 'level' },
]

async function seedTags() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'antonrendel@gmail.com'
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) throw new Error('ADMIN_PASSWORD not set')

  const loginRes = await fetch(`${PAYLOAD_BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  const loginData = (await loginRes.json()) as { token?: string }
  if (!loginData.token) throw new Error(`Login failed: ${JSON.stringify(loginData).slice(0, 200)}`)

  const token = loginData.token
  console.log('Logged in as admin')

  let created = 0
  let skipped = 0

  for (const tag of TAGS) {
    const res = await fetch(`${PAYLOAD_BASE_URL}/api/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(tag),
    })
    if (res.status === 409 || res.status === 400) {
      const body = await res.text()
      if (body.includes('unique') || body.includes('duplicate') || body.includes('already')) {
        console.log(`  skip: ${tag.slug} (already exists)`)
        skipped++
      } else {
        console.error(`  failed: ${tag.slug} — ${res.status} ${body.slice(0, 100)}`)
      }
    } else if (res.ok) {
      console.log(`  created: ${tag.slug}`)
      created++
    } else {
      const body = await res.text()
      console.error(`  failed: ${tag.slug} — ${res.status} ${body.slice(0, 100)}`)
    }
  }

  console.log(`\nDone. Created: ${created}, skipped: ${skipped}`)
}

seedTags().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
