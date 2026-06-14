import type { CollectionConfig } from 'payload'

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: {
    singular: 'Статья',
    plural: 'Статьи',
  },
  access: {
    create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'agent',
    read: ({ req }) => (req.user?.role === 'admin' ? true : { status: { equals: 'published' } }),
    update: ({ req }) => req.user?.role === 'admin',
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
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'metaTitle',
      type: 'text',
    },
    {
      name: 'metaDescription',
      type: 'textarea',
    },
    {
      name: 'publishedAt',
      type: 'date',
    },
    {
      name: 'content',
      type: 'textarea',
      admin: {
        description: 'Полный текст статьи (HTML-разметка поддерживается)',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Изображение статьи',
      },
    },
    {
      name: 'tags',
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
        create: ({ req }) => req.user?.role === 'admin',
        update: ({ req }) => req.user?.role === 'admin',
      },
    },
  ],
}
