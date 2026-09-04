/**
 * Прогоняет слияние нашего поля apiKey с базовым полем auth тем же кодом,
 * что и Payload при старте (sanitize → mergeBaseFields). Запускается через tsx
 * из теста: dist Payload — ESM, а jest грузит тесты как CJS.
 */
import { mergeBaseFields } from '../../node_modules/payload/dist/fields/mergeBaseFields.js'
import { getBaseAuthFields } from '../../node_modules/payload/dist/auth/getAuthFields.js'
import { Users } from '../../payload/collections/users'

type AnyField = {
  name?: string
  type?: string
  label?: unknown
  access?: { read?: unknown }
  hooks?: Record<string, unknown[]>
  admin?: { components?: { Field?: unknown } }
}

// sanitizeFields до merge докладывает в поле пустые hooks/access/admin — повторяем.
const ours = (Users.fields as AnyField[]).map((f) => ({ hooks: {}, access: {}, admin: {}, ...f }))
const merged = mergeBaseFields(
  ours as never,
  getBaseAuthFields({ useAPIKey: true } as never) as never
) as AnyField[]
const apiKey = merged.filter((f) => f.name === 'apiKey')
const ourRead = (Users.fields as AnyField[]).find((f) => f.name === 'apiKey')?.access?.read

console.log(
  JSON.stringify({
    count: apiKey.length,
    type: apiKey[0]?.type,
    afterRead: (apiKey[0]?.hooks?.afterRead ?? []).map((fn) => (fn as { name: string }).name),
    beforeChange: (apiKey[0]?.hooks?.beforeChange ?? []).map((fn) => (fn as { name: string }).name),
    fieldHidden: apiKey[0]?.admin?.components?.Field === false,
    accessIsOurs: apiKey[0]?.access?.read === ourRead,
  })
)
