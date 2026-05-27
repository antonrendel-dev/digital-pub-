import type { GlobalConfig } from 'payload'
import { revalidatePath } from 'next/cache'

/**
 * SocialChannels Global
 *
 * Seed values:
 *   - name/url from components/LeftSidebar.tsx (href attrs on <a> wrappers around SubCard)
 *   - subscribers from lib/config.ts (SOCIAL_CHANNELS object)
 *
 *   channels:
 *     - { name: "Telegram", url: "https://t.me/+69rdOEDrfvgyMDMy", subscribers: "14 200 подписчиков" }
 *     - { name: "Макс", url: "https://max.ru/join/TdAOrknpNtm20J92ke2oXJGoKA8OI_nH6GnQ5xtH2TQ", subscribers: "6 800 подписчиков" }
 *     - { name: "ВКонтакте", url: "https://vk.com/digital_pub_vacancies", subscribers: "9 300 подписчиков" }
 */
export const SocialChannels: GlobalConfig = {
  slug: 'social-channels',
  label: 'Социальные каналы',
  access: {
    read: () => true,
    update: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'channels',
      type: 'array',
      label: 'Каналы',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Название',
          required: true,
          admin: {
            description: 'Например: Telegram, Макс, ВКонтакте',
          },
        },
        {
          name: 'url',
          type: 'text',
          label: 'URL',
          required: true,
        },
        {
          name: 'subscribers',
          type: 'text',
          label: 'Подписчиков',
          required: false,
          admin: {
            description: 'Отображаемая строка, например: "14 200 подписчиков"',
          },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      () => {
        revalidatePath('/', 'layout')
      },
    ],
  },
}
