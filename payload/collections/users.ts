import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Пользователь',
    plural: 'Пользователи',
  },
  auth: {
    useAPIKey: true,
  },
  access: {
    read: ({ req }) => !!req.user,
    create: () => false,
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      options: ['admin', 'agent', 'sync'],
      defaultValue: 'agent',
      saveToJWT: true,
    },
  ],
}
