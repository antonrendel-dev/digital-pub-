import type { CollectionConfig } from 'payload'
import type { FieldAccess } from 'payload'
import { canPublish } from './users'

/**
 * Содержательные поля правит только админ: агент с canPublish (пользователь
 * завода, S21) меняет ровно status — publisher шлёт только его. Так объём
 * прав завода не шире задачи «опубликовать черновик».
 */
const adminOnlyUpdate: FieldAccess = ({ req }) => req.user?.role === 'admin'

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: {
    singular: 'Статья',
    plural: 'Статьи',
  },
  access: {
    create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'agent',
    // Черновики видит тот, кто может их публиковать: publisher читает статью до PATCH.
    read: ({ req }) => (canPublish(req.user) ? true : { status: { equals: 'published' } }),
    // Агент с canPublish проходит на уровне коллекции, но поля кроме status
    // закрыты для него на уровне полей (adminOnlyUpdate) — S21.
    update: ({ req }) => canPublish(req.user),
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    afterChange: [
      async ({ doc }: { doc: { slug: string } }) => {
        try {
          const { revalidatePath } = await import('next/cache')
          revalidatePath('/articles', 'layout')
          revalidatePath(`/articles/${doc.slug}`, 'page')
        } catch {
          // no-op outside Next.js (e.g., payload CLI)
        }
      },
    ],
  },
  fields: [
    {
      name: 'title',
      access: { update: adminOnlyUpdate },
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      access: { update: adminOnlyUpdate },
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'description',
      access: { update: adminOnlyUpdate },
      type: 'textarea',
    },
    {
      name: 'metaTitle',
      access: { update: adminOnlyUpdate },
      type: 'text',
    },
    {
      name: 'metaDescription',
      access: { update: adminOnlyUpdate },
      type: 'textarea',
    },
    {
      name: 'publishedAt',
      access: { update: adminOnlyUpdate },
      type: 'date',
    },
    {
      name: 'content',
      access: { update: adminOnlyUpdate },
      type: 'textarea',
      admin: {
        description: 'Полный текст статьи (HTML-разметка поддерживается)',
      },
    },
    {
      name: 'image',
      access: { update: adminOnlyUpdate },
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Изображение статьи',
      },
    },
    {
      name: 'tags',
      access: { update: adminOnlyUpdate },
      type: 'json',
      defaultValue: [],
      admin: {
        description: 'Теги статьи — JSON-массив строк, например: ["карьера", "резюме"]',
      },
    },
    {
      name: 'status',
      type: 'select',
      options: ['draft', 'published'],
      defaultValue: 'draft',
      access: {
        create: ({ req }) => canPublish(req.user),
        update: ({ req }) => canPublish(req.user),
      },
    },
  ],
}
