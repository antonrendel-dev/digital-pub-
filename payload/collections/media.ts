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
    // Files are served at /uploads/<filename> via Next.js public directory static serving.
    // SVG не принимается: он отдаётся с домена под общим CSP с unsafe-inline,
    // то есть скрипт внутри картинки — это XSS на d-pub.ru. В uploads ни одного svg нет.
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [],
}
