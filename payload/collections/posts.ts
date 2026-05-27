import type { CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'

export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'sync',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    afterChange: [
      ({ doc }) => {
        const tags = Array.isArray(doc.tags) ? doc.tags : []
        for (const tag of tags) {
          if (typeof tag === 'object' && tag !== null && tag.slug) {
            revalidatePath(`/vacancies/${tag.slug}`, 'page')
          }
        }
        revalidatePath('/vacancies', 'layout')
      },
    ],
  },
  admin: {
    useAsTitle: 'title',
    listSearchableFields: ['title', 'company', 'channelUsername'],
    // TODO Task 5: add custom DuplicatePostAction when component is implemented
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Вакансия', value: 'vacancy' },
        { label: 'Резюме', value: 'resume' },
      ],
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: {
        description: 'URL slug поста. Оставьте пустым для дублей.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'company',
      type: 'text',
    },
    {
      name: 'salary',
      type: 'text',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Ожидает', value: 'pending' },
        { label: 'Опубликован', value: 'published' },
        { label: 'Отклонён', value: 'rejected' },
      ],
      defaultValue: 'published',
      required: true,
    },
    {
      name: 'source',
      type: 'select',
      options: [
        { label: 'Telegram', value: 'telegram' },
        { label: 'Пользователь', value: 'user' },
      ],
      defaultValue: 'telegram',
      required: true,
    },
    {
      name: 'telegramMessageId',
      type: 'text',
      admin: {
        description: 'ID сообщения в Telegram (для дедупликации)',
      },
    },
    {
      name: 'channelUsername',
      type: 'text',
      admin: {
        description: 'Username канала в Telegram (без @)',
      },
    },
    {
      name: 'imageUrl',
      type: 'text',
      validate: (val: string | null | undefined) => {
        if (!val) return true
        if (/^https:\/\/.+/.test(val)) return true
        return 'imageUrl должен начинаться с https://'
      },
      admin: {
        description: 'URL изображения (только HTTPS)',
      },
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      admin: {
        description: 'Теги для фильтрации и SEO',
      },
    },
  ],
}
