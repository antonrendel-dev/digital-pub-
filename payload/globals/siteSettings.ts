import type { GlobalConfig } from 'payload'
import { revalidatePath } from 'next/cache'

/**
 * SiteSettings Global
 *
 * No seed values — fields are filled manually in Payload Admin after deploy.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Настройки сайта',
  access: {
    read: () => true,
    update: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      label: 'Название сайта',
      required: false,
      admin: {
        description: 'Используется в title тегах и OG-метаданных',
      },
    },
    {
      name: 'defaultMetaDescription',
      type: 'textarea',
      label: 'Мета-описание по умолчанию',
      required: false,
      admin: {
        description: 'Описание сайта для поисковых систем и социальных сетей',
      },
    },
    {
      name: 'defaultOGImage',
      type: 'upload',
      label: 'OG-изображение по умолчанию',
      relationTo: 'media',
      required: false,
      admin: {
        description:
          'Изображение для превью при шаринге в соцсетях (рекомендуемый размер: 1200×630)',
      },
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
