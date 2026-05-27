import type { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { revalidatePath } from 'next/cache'

export const Tags: CollectionConfig = {
  slug: 'tags',
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
      name: 'seoTitle',
      type: 'text',
    },
    {
      name: 'seoDescription',
      type: 'textarea',
    },
    {
      name: 'seoText',
      type: 'richText',
      editor: lexicalEditor({}),
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc }) => {
        revalidatePath(`/vacancies/${doc.slug}`, 'page')
        revalidatePath('/', 'layout')
      },
    ],
  },
}
