import type { Access, CollectionConfig, FieldAccess } from 'payload'

/**
 * Доступ к пользователям.
 *
 * До 04.09.2026 read был «любой авторизованный»: пользователь роли agent или
 * sync делал GET /api/users и получал email всех и API-ключи всех, у кого
 * включён enableAPIKey — поле apiKey у Payload без field-level access, а хук
 * afterRead возвращает ключ расшифрованным каждому, кто прошёл read.
 * Компрометация служебного ключа (sync-ключ лежит в .env и уходит в cron)
 * давала ключ админа и полный доступ к CMS.
 *
 * Теперь не-админ читает только себя (where по своему id — так работает и
 * список, и findByID, и /api/users/me), unlock — только админ, а apiKey
 * виден только владельцу и админу. Стратегия API-ключа ищет пользователя
 * с overrideAccess, так что вход по ключу от этого не зависит.
 */
const isAdmin: Access = ({ req }) => req.user?.role === 'admin'

const selfOrAdmin: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  return { id: { equals: req.user.id } }
}

const ownKeyOrAdmin: FieldAccess = ({ req, id, doc }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  const docId = doc?.id ?? id
  return docId !== undefined && String(docId) === String(req.user.id)
}

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
    read: selfOrAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
    unlock: isAdmin,
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      options: ['admin', 'agent', 'sync'],
      defaultValue: 'agent',
      saveToJWT: true,
    },
    // Одноимённое поле сливается с базовым полем auth (mergeBaseFields):
    // тип и хуки шифрования остаются от Payload, access — наш.
    {
      name: 'apiKey',
      type: 'text',
      label: 'API-ключ',
      access: { read: ownKeyOrAdmin },
    },
  ],
}
