import 'dotenv/config'

const PAYLOAD_BASE_URL = process.env.PAYLOAD_BASE_URL ?? 'https://d-pub.ru'

const NEW_TAGS = [
  {
    slug: 'head-of-seo',
    name: 'Head of SEO',
    tagType: 'specialization',
    seoTitle: 'Вакансии Head of SEO 2026 — руководитель SEO-отдела | Диджитал Паб',
    seoDescription:
      'Вакансии Head of SEO и руководителя отдела поискового продвижения в digital. Из Telegram-каналов, обновляется ежедневно — Диджитал Паб.',
  },
  {
    slug: 'videomontazher',
    name: 'Видеомонтажёр',
    tagType: 'specialization',
    seoTitle: 'Вакансии видеомонтажёра 2026 — удалённо и офис | Диджитал Паб',
    seoDescription:
      'Вакансии видеомонтажёра и видеоредактора в digital: Reels, YouTube, корпоративное видео. Из Telegram-каналов, обновляется ежедневно — Диджитал Паб.',
  },
]

async function addTags() {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) throw new Error('ADMIN_EMAIL не задан')
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) throw new Error('ADMIN_PASSWORD not set')

  const loginRes = await fetch(`${PAYLOAD_BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  const loginData = (await loginRes.json()) as { token?: string; errors?: unknown }
  if (!loginData.token) throw new Error(`Login failed: ${JSON.stringify(loginData).slice(0, 300)}`)

  const token = loginData.token
  console.log('Logged in as admin')

  for (const tag of NEW_TAGS) {
    const createRes = await fetch(`${PAYLOAD_BASE_URL}/api/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(tag),
    })

    if (createRes.ok) {
      console.log(`  created: ${tag.slug}`)
      continue
    }

    const body = await createRes.text()
    if (createRes.status === 400 || createRes.status === 409) {
      console.log(`  already exists: ${tag.slug}`)
    } else {
      console.error(`  failed: ${tag.slug} — ${createRes.status} ${body.slice(0, 200)}`)
    }
  }

  console.log('Done')
}

addTags().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
