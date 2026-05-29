import type { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

export const Tags: CollectionConfig = {
  slug: 'tags',
  labels: {
    singular: 'Тег',
    plural: 'Теги',
  },
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'tagType',
      type: 'select',
      options: ['format', 'level', 'specialization'],
      required: true,
    },
    {
      name: 'h1',
      type: 'text',
    },
    {
      type: 'collapsible',
      label: 'SEO',
      fields: [
        {
          name: 'seoTitle',
          type: 'text',
        },
        {
          name: 'seoDescription',
          type: 'textarea',
          admin: {
            description: 'Meta-description страницы тега (до 160 символов)',
          },
        },
        {
          name: 'seoText',
          type: 'richText',
          editor: lexicalEditor({}),
          admin: {
            description: 'SEO-текст внизу страницы категории',
          },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc }) => {
        try {
          const { revalidatePath } = await import('next/cache')
          revalidatePath(`/vacancies/${doc.slug}`, 'page')
          revalidatePath('/', 'layout')
        } catch {
          // no-op outside Next.js (e.g., payload CLI)
        }
      },
    ],
  },
}
