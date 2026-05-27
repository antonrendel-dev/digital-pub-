import type { CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'

export const Articles: CollectionConfig = {
  slug: 'articles',
  access: {
    create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'agent',
    read: ({ req }) => (req.user?.role === 'admin' ? true : { status: { equals: 'published' } }),
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    afterChange: [
      async ({ doc }: { doc: { slug: string } }) => {
        revalidatePath('/articles', 'layout')
        revalidatePath(`/articles/${doc.slug}`, 'page')
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
      type: 'richText',
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
