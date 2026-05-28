import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: {
    singular: 'Пост',
    plural: 'Вакансии и резюме',
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'sync',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    afterChange: [
      async ({ doc }) => {
        try {
          const { revalidatePath } = await import('next/cache')
          const tags = Array.isArray(doc.tags) ? doc.tags : []
          for (const tag of tags) {
            if (typeof tag === 'object' && tag !== null && tag.slug) {
              revalidatePath(`/vacancies/${tag.slug}`, 'page')
            }
          }
          revalidatePath('/vacancies', 'layout')
        } catch {
          // no-op outside Next.js (e.g., payload CLI)
        }
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
        if (val.startsWith('http://')) return 'imageUrl должен использовать HTTPS, не HTTP'
        if (/^javascript:/i.test(val)) return 'Недопустимый imageUrl'
        return true
      },
      admin: {
        description: 'URL изображения (HTTPS или локальный путь /images/posts/...)',
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
