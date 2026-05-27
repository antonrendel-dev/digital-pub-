import type { GlobalConfig } from 'payload'

/**
 * Footer Global
 *
 * Seed values (from components/Footer.tsx):
 *   socialLinks:
 *     - { platform: "Telegram", url: "https://t.me/+69rdOEDrfvgyMDMy" }
 *     - { platform: "Макс", url: "https://max.ru/join/TdAOrknpNtm20J92ke2oXJGoKA8OI_nH6GnQ5xtH2TQ" }
 *     - { platform: "ВКонтакте", url: "https://vk.com/digital_pub_vacancies" }
 *   copyrightText: "Диджитал Паб"
 *     (dynamic year is added by the component: `© {new Date().getFullYear()} {copyrightText}`)
 */
export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'Footer',
  access: {
    read: () => true,
    update: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'socialLinks',
      type: 'array',
      label: 'Ссылки на соцсети',
      fields: [
        {
          name: 'platform',
          type: 'text',
          label: 'Платформа',
          required: true,
          admin: {
            description: 'Например: Telegram, ВКонтакте, Макс',
          },
        },
        {
          name: 'url',
          type: 'text',
          label: 'URL',
          required: true,
        },
      ],
    },
    {
      name: 'copyrightText',
      type: 'text',
      label: 'Текст копирайта',
      required: false,
      admin: {
        description: 'Бренд-строка без года, год добавляется автоматически. Пример: "Диджитал Паб"',
      },
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        try {
          const { revalidatePath } = await import('next/cache')
          revalidatePath('/', 'layout')
        } catch {
          // no-op outside Next.js (e.g., payload CLI)
        }
      },
    ],
  },
}
