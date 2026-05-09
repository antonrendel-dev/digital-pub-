import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { seoTexts as batch1 } from './seo-texts-batch1'
import { seoTexts as batch2 } from './seo-texts-batch2'
import { seoTexts as batch3 } from './seo-texts-batch3'

const allTexts: Record<string, string> = {
  ...batch1,
  ...batch2,
  ...batch3,
}

// Also update seoTitle and seoDescription for tags that had weak ones
const seoMeta: Record<string, { seoTitle: string; seoDescription: string }> = {
  smm: {
    seoTitle: 'SMM-вакансии — работа SMM-менеджером в 2026',
    seoDescription: 'Свежие вакансии SMM-менеджера из Telegram-каналов. Зарплаты, удалёнка и офис. Обновление ежедневно на Диджитал Паб.',
  },
  seo: {
    seoTitle: 'SEO-вакансии — работа SEO-специалистом в 2026',
    seoDescription: 'Вакансии SEO-специалиста: оптимизация, аналитика, линкбилдинг. Удалённо и в офисе. Агрегатор из Telegram-каналов.',
  },
  dizajn: {
    seoTitle: 'Вакансии дизайнера — UI/UX, веб, графика в 2026',
    seoDescription: 'Вакансии дизайнера из Telegram-каналов: UI/UX, веб-дизайн, графика. Зарплаты от 50 до 300К. Удалённо и в офисе.',
  },
  marketing: {
    seoTitle: 'Вакансии маркетолога — digital-маркетинг в 2026',
    seoDescription: 'Вакансии маркетолога: digital, контент, performance, продуктовый. Зарплаты от 50 до 280К. Агрегатор из Telegram.',
  },
  menedzher: {
    seoTitle: 'Вакансии менеджера — проджект, продакт, контент',
    seoDescription: 'Вакансии менеджера в digital: проджект, продакт, аккаунт, контент. Удалённо и в офисе. Обновление ежедневно.',
  },
  target: {
    seoTitle: 'Вакансии таргетолога — настройка рекламы в 2026',
    seoDescription: 'Вакансии таргетолога: VK Реклама, Яндекс Директ, Telegram Ads. Зарплаты от 40 до 240К. Удалённо и в офисе.',
  },
  razrabotka: {
    seoTitle: 'Вакансии разработчика — frontend, backend, fullstack',
    seoDescription: 'Вакансии разработчика: Python, JavaScript, Java, Go. Frontend, backend, fullstack. Зарплаты от 60 до 400К.',
  },
  analitika: {
    seoTitle: 'Вакансии аналитика — данные, бизнес, продукт',
    seoDescription: 'Вакансии аналитика: data analyst, бизнес-аналитик, продуктовый аналитик. Зарплаты от 50 до 300К. Удалённо и в офисе.',
  },
  finansy: {
    seoTitle: 'Вакансии финансиста — финансы в digital-компаниях',
    seoDescription: 'Вакансии финансиста в digital: финансовый аналитик, менеджер, FP&A. Зарплаты от 50 до 350К. Агрегатор из Telegram.',
  },
  hr: {
    seoTitle: 'HR-вакансии — рекрутер, HRBP, HR-аналитик',
    seoDescription: 'Вакансии HR-менеджера в digital: рекрутинг, HR-бренд, аналитика. Зарплаты от 45 до 280К. Удалённо и в офисе.',
  },
  wordpress: {
    seoTitle: 'Вакансии WordPress-разработчика — CMS, PHP',
    seoDescription: 'Вакансии WordPress-разработчика: создание сайтов, WooCommerce, плагины. Зарплаты от 40 до 250К.',
  },
  udalyonka: {
    seoTitle: 'Удалённая работа — вакансии на дому в digital',
    seoDescription: 'Вакансии удалённой работы в digital: SMM, SEO, дизайн, разработка, аналитика. Агрегатор из Telegram-каналов d-pub.ru.',
  },
  ofis: {
    seoTitle: 'Работа в офисе — вакансии digital-специалистов',
    seoDescription: 'Офисные вакансии для digital-специалистов в Москве, СПб и регионах. Маркетологи, дизайнеры, разработчики.',
  },
  gibrid: {
    seoTitle: 'Гибридная работа — вакансии с гибким графиком',
    seoDescription: 'Вакансии с гибридным графиком в digital: 2-3 дня в офисе + удалёнка. Свежие предложения из Telegram-каналов.',
  },
  junior: {
    seoTitle: 'Junior-вакансии — первая работа в IT и digital',
    seoDescription: 'Вакансии уровня Junior в IT и digital: разработчик, аналитик, дизайнер, маркетолог. Зарплаты от 40 до 90К.',
  },
  middle: {
    seoTitle: 'Middle-вакансии — позиции для опытных специалистов',
    seoDescription: 'Вакансии уровня Middle в digital: разработка, дизайн, маркетинг, аналитика. Зарплаты 100-200К.',
  },
  senior: {
    seoTitle: 'Senior-вакансии — экспертные позиции в digital',
    seoDescription: 'Senior-вакансии в digital-сфере: зарплаты 200-450К+, архитектура, менторство, лидерство.',
  },
}

async function main() {
  let updated = 0
  let failed = 0

  for (const [slug, seoText] of Object.entries(allTexts)) {
    const meta = seoMeta[slug]
    try {
      await prisma.tag.update({
        where: { slug },
        data: {
          seoText,
          ...(meta && {
            seoTitle: meta.seoTitle,
            seoDescription: meta.seoDescription,
          }),
        },
      })
      const charCount = seoText.length
      console.log(`✓ ${slug} — ${charCount} символов`)
      updated++
    } catch (err) {
      console.error(`✗ ${slug} — ошибка:`, err)
      failed++
    }
  }

  console.log(`\nИтого: ${updated} обновлено, ${failed} ошибок`)
  await prisma.$disconnect()
}

main()
