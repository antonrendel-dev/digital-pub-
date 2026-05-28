import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Файл',
    plural: 'Медиа',
  },
  upload: {
    // Files stored in public/uploads — served as /uploads/<filename> by Next.js static file handling
    staticDir: 'public/uploads',
    // Files are served at /uploads/<filename> via Next.js public directory static serving
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [],
}
