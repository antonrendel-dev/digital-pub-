import 'dotenv/config'

const PAYLOAD_BASE_URL = process.env.PAYLOAD_BASE_URL ?? 'https://d-pub.ru'

const TAGS = [
  {
    slug: 'udalyonka',
    name: 'Удалёнка',
    tagType: 'format',
    seoTitle: 'Удалённая работа — вакансии на дому в digital',
    seoDescription:
      'Вакансии удалённой работы в digital: SMM, SEO, дизайн, разработка, аналитика. Агрегатор из Telegram-каналов d-pub.ru.',
  },
  {
    slug: 'ofis',
    name: 'Офис',
    tagType: 'format',
    seoTitle: 'Работа в офисе — вакансии digital-специалистов',
    seoDescription:
      'Офисные вакансии для digital-специалистов в Москве, СПб и регионах. Маркетологи, дизайнеры, разработчики.',
  },
  {
    slug: 'gibrid',
    name: 'Гибрид',
    tagType: 'format',
    seoTitle: 'Гибридная работа — вакансии с гибким графиком',
    seoDescription:
      'Вакансии с гибридным графиком в digital: 2-3 дня в офисе + удалёнка. Свежие предложения из Telegram-каналов.',
  },
  {
    slug: 'smm',
    name: 'SMM',
    tagType: 'specialization',
    seoTitle: 'SMM-вакансии — работа SMM-менеджером в 2026',
    seoDescription:
      'Свежие вакансии SMM-менеджера из Telegram-каналов. Зарплаты, удалёнка и офис. Обновление ежедневно на Диджитал Паб.',
  },
  {
    slug: 'seo',
    name: 'SEO',
    tagType: 'specialization',
    seoTitle: 'SEO-вакансии — работа SEO-специалистом в 2026',
    seoDescription:
      'Вакансии SEO-специалиста: оптимизация, аналитика, линкбилдинг. Удалённо и в офисе. Агрегатор из Telegram-каналов.',
  },
  {
    slug: 'dizajn',
    name: 'Дизайн',
    tagType: 'specialization',
    seoTitle: 'Вакансии дизайнера — UI/UX, веб, графика в 2026',
    seoDescription:
      'Вакансии дизайнера из Telegram-каналов: UI/UX, веб-дизайн, графика. Зарплаты от 50 до 300К. Удалённо и в офисе.',
  },
  {
    slug: 'marketing',
    name: 'Маркетинг',
    tagType: 'specialization',
    seoTitle: 'Вакансии маркетолога — digital-маркетинг в 2026',
    seoDescription:
      'Вакансии маркетолога: digital, контент, performance, продуктовый. Зарплаты от 50 до 280К. Агрегатор из Telegram.',
  },
  {
    slug: 'menedzher',
    name: 'Менеджер',
    tagType: 'specialization',
    seoTitle: 'Вакансии менеджера — проджект, продакт, контент',
    seoDescription:
      'Вакансии менеджера в digital: проджект, продакт, аккаунт, контент. Удалённо и в офисе. Обновление ежедневно.',
  },
  {
    slug: 'target',
    name: 'Таргет',
    tagType: 'specialization',
    seoTitle: 'Вакансии таргетолога — настройка рекламы в 2026',
    seoDescription:
      'Вакансии таргетолога: VK Реклама, Яндекс Директ, Telegram Ads. Зарплаты от 40 до 240К. Удалённо и в офисе.',
  },
  {
    slug: 'razrabotka',
    name: 'Разработка',
    tagType: 'specialization',
    seoTitle: 'Вакансии разработчика — frontend, backend, fullstack',
    seoDescription:
      'Вакансии разработчика: Python, JavaScript, Java, Go. Frontend, backend, fullstack. Зарплаты от 60 до 400К.',
  },
  {
    slug: 'analitika',
    name: 'Аналитика',
    tagType: 'specialization',
    seoTitle: 'Вакансии аналитика — данные, бизнес, продукт',
    seoDescription:
      'Вакансии аналитика: data analyst, бизнес-аналитик, продуктовый аналитик. Зарплаты от 50 до 300К. Удалённо и в офисе.',
  },
  {
    slug: 'finansy',
    name: 'Финансы',
    tagType: 'specialization',
    seoTitle: 'Вакансии финансиста — финансы в digital-компаниях',
    seoDescription:
      'Вакансии финансиста в digital: финансовый аналитик, менеджер, FP&A. Зарплаты от 50 до 350К. Агрегатор из Telegram.',
  },
  {
    slug: 'hr',
    name: 'HR',
    tagType: 'specialization',
    seoTitle: 'HR-вакансии — рекрутер, HRBP, HR-аналитик',
    seoDescription:
      'Вакансии HR-менеджера в digital: рекрутинг, HR-бренд, аналитика. Зарплаты от 45 до 280К. Удалённо и в офисе.',
  },
  {
    slug: 'wordpress',
    name: 'WordPress',
    tagType: 'specialization',
    seoTitle: 'Вакансии WordPress-разработчика — CMS, PHP',
    seoDescription:
      'Вакансии WordPress-разработчика: создание сайтов, WooCommerce, плагины. Зарплаты от 40 до 250К.',
  },
  {
    slug: 'copywriting',
    name: 'Копирайтинг',
    tagType: 'specialization',
    seoTitle: 'Вакансии копирайтера — тексты, контент, редактура',
    seoDescription:
      'Вакансии копирайтера в digital: тексты для сайтов, соцсетей, рассылок. Зарплаты от 30 до 180К. Удалённо.',
  },
  {
    slug: 'content',
    name: 'Контент',
    tagType: 'specialization',
    seoTitle: 'Вакансии контент-менеджера — контент для digital',
    seoDescription:
      'Вакансии контент-менеджера: социальные сети, сайты, рассылки. Зарплаты от 35 до 200К. Удалённо и в офисе.',
  },
  {
    slug: 'kreativ',
    name: 'Креатив',
    tagType: 'specialization',
    seoTitle: 'Вакансии креативщика — идеи, концепции, кампании',
    seoDescription:
      'Вакансии креативного директора и специалиста: идеи, бренд, рекламные кампании. Зарплаты от 60 до 350К.',
  },
  {
    slug: 'junior',
    name: 'Junior',
    tagType: 'level',
    seoTitle: 'Junior-вакансии — первая работа в IT и digital',
    seoDescription:
      'Вакансии уровня Junior в IT и digital: разработчик, аналитик, дизайнер, маркетолог. Зарплаты от 40 до 90К.',
  },
  {
    slug: 'middle',
    name: 'Middle',
    tagType: 'level',
    seoTitle: 'Middle-вакансии — позиции для опытных специалистов',
    seoDescription:
      'Вакансии уровня Middle в digital: разработка, дизайн, маркетинг, аналитика. Зарплаты 100-200К.',
  },
  {
    slug: 'senior',
    name: 'Senior',
    tagType: 'level',
    seoTitle: 'Senior-вакансии — экспертные позиции в digital',
    seoDescription:
      'Senior-вакансии в digital-сфере: зарплаты 200-450К+, архитектура, менторство, лидерство.',
  },
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
  const loginData = (await loginRes.json()) as { token?: string; errors?: unknown }
  if (!loginData.token) throw new Error(`Login failed: ${JSON.stringify(loginData).slice(0, 300)}`)

  const token = loginData.token
  console.log('Logged in as admin')

  let created = 0
  let updated = 0
  let failed = 0

  for (const tag of TAGS) {
    const { tagType, ...rest } = tag
    const payload = { ...rest, tagType }

    // Try create first
    const createRes = await fetch(`${PAYLOAD_BASE_URL}/api/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })

    if (createRes.ok) {
      console.log(`  ✓ created: ${tag.slug}`)
      created++
      continue
    }

    const createBody = await createRes.text()

    // If duplicate — find and PATCH with SEO data
    if (createRes.status === 400 || createRes.status === 409) {
      const findRes = await fetch(
        `${PAYLOAD_BASE_URL}/api/tags?where[slug][equals]=${tag.slug}&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const findData = (await findRes.json()) as { docs?: Array<{ id: number }> }
      const existing = findData.docs?.[0]

      if (existing) {
        const patchRes = await fetch(`${PAYLOAD_BASE_URL}/api/tags/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ seoTitle: tag.seoTitle, seoDescription: tag.seoDescription }),
        })
        if (patchRes.ok) {
          console.log(`  ↑ updated SEO: ${tag.slug}`)
          updated++
        } else {
          console.error(`  ✗ patch failed: ${tag.slug} — ${patchRes.status}`)
          failed++
        }
        continue
      }
    }

    console.error(`  ✗ failed: ${tag.slug} — ${createRes.status} ${createBody.slice(0, 100)}`)
    failed++
  }

  console.log(`\nDone. Created: ${created}, updated SEO: ${updated}, failed: ${failed}`)
}

seedTags().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
