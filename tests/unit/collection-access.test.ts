import fs from 'fs'
import path from 'path'
import { Posts } from '../../payload/collections/posts'
import { Users } from '../../payload/collections/users'
import { Articles } from '../../payload/collections/articles'
import { canPublish } from '../../payload/collections/users'

/**
 * Страж на права чтения коллекций.
 *
 * Дыра появилась не по чьей-то забывчивости, а вместе со встроенным REST
 * Payload: catch-all маршрут app/(payload)/api/[...slug] публикует наружу
 * всё, что коллекция разрешает читать. Замер 01.09.2026: /api/posts отдавал
 * 2309 записей, 20,5 МБ одним ответом. Тест нужен, чтобы правило не вернулось
 * тихо при обновлении Payload или переписывании конфига.
 */
const anon = { req: { user: null } } as never
const admin = { req: { user: { role: 'admin' } } } as never
const anyUser = { req: { user: { role: 'sync' } } } as never

describe('Права чтения коллекций Payload', () => {
  it('posts не отдаётся анонимному запросу', () => {
    const read = Posts.access?.read as (args: never) => unknown
    expect(read(anon)).toBe(false)
  })

  it('posts читается авторизованным — админка и скрипты синка не ломаются', () => {
    const read = Posts.access?.read as (args: never) => unknown
    expect(read(admin)).toBe(true)
    expect(read(anyUser)).toBe(true)
  })

  it('users закрыт для анонимного', () => {
    const read = Users.access?.read as (args: never) => unknown
    expect(read(anon)).toBe(false)
  })

  // Агент или sync с чужим ключом не должен получать email и API-ключи всех
  // (аудит 04.09.2026, S14): не-админ видит только себя, unlock — только админ.
  it('users: не-админ читает только себя, админ — всех', () => {
    const read = Users.access?.read as (args: never) => unknown
    const agent = { req: { user: { id: 7, role: 'agent' } } } as never
    expect(read(agent)).toEqual({ id: { equals: 7 } })
    expect(read(admin)).toBe(true)
  })

  it('users: unlock только админу', () => {
    const unlock = Users.access?.unlock as (args: never) => unknown
    expect(unlock(admin)).toBe(true)
    expect(unlock(anyUser)).toBe(false)
    expect(unlock(anon)).toBe(false)
  })

  it('users: apiKey виден владельцу и админу, чужому и анонимному — нет', () => {
    const field = Users.fields.find((f) => 'name' in f && f.name === 'apiKey') as {
      access?: { read?: (args: never) => unknown }
    }
    const read = field.access?.read as (args: never) => unknown
    const own = { req: { user: { id: 7, role: 'agent' } }, id: 7, doc: { id: 7 } } as never
    const other = { req: { user: { id: 7, role: 'agent' } }, id: 1, doc: { id: 1 } } as never
    const adminOnOther = { req: { user: { id: 1, role: 'admin' } }, id: 7, doc: { id: 7 } } as never
    const anonOnAny = { req: { user: null }, id: 7, doc: { id: 7 } } as never
    expect(read(own)).toBe(true)
    expect(read(other)).toBe(false)
    expect(read(adminOnOther)).toBe(true)
    expect(read(anonOnAny)).toBe(false)
    // Без id документа (create) ключ не показываем никому, кроме админа.
    expect(read({ req: { user: { id: 7, role: 'agent' } } } as never)).toBe(false)
  })

  it('articles анонимному отдаёт только опубликованные', () => {
    const read = Articles.access?.read as (args: never) => unknown
    expect(read(anon)).toEqual({ status: { equals: 'published' } })
    expect(read(admin)).toBe(true)
  })
})

// S21: завод публикует без пароля админа — агент с флагом canPublish, который ставит только админ.
describe('Публикация статей без прав админа (S21)', () => {
  const agentNo = { req: { user: { id: 7, role: 'agent', canPublish: false } } } as never
  const agentYes = { req: { user: { id: 7, role: 'agent', canPublish: true } } } as never
  const syncYes = { req: { user: { id: 8, role: 'sync', canPublish: true } } } as never

  it('articles.update и поле status: агент без canPublish — нет, с canPublish — да, sync — никогда', () => {
    const update = Articles.access?.update as (args: never) => unknown
    const status = Articles.fields.find((f) => 'name' in f && f.name === 'status') as {
      access?: { update?: (args: never) => unknown; create?: (args: never) => unknown }
    }
    for (const fn of [update, status.access!.update!, status.access!.create!]) {
      expect(fn(agentNo)).toBe(false)
      expect(fn(agentYes)).toBe(true)
      expect(fn(syncYes)).toBe(false)
      expect(fn(admin)).toBe(true)
      expect(fn(anon)).toBe(false)
    }
  })

  it('articles.read: агент с canPublish видит черновики (publisher читает статью до PATCH), без флага — только опубликованные', () => {
    const read = Articles.access?.read as (args: never) => unknown
    expect(read(agentYes)).toBe(true)
    expect(read(agentNo)).toEqual({ status: { equals: 'published' } })
    expect(read(anon)).toEqual({ status: { equals: 'published' } })
  })

  it('содержательные поля статьи агент с canPublish менять не может — только status', () => {
    for (const f of Articles.fields as {
      name?: string
      access?: { update?: (a: never) => unknown }
    }[]) {
      if (!f.name || f.name === 'status') continue
      expect(f.access?.update).toBeDefined()
      expect(f.access!.update!(agentYes)).toBe(false)
      expect(f.access!.update!(admin)).toBe(true)
    }
  })

  it('флаг canPublish ставит и меняет только админ', () => {
    const field = Users.fields.find((f) => 'name' in f && f.name === 'canPublish') as {
      access?: { update?: (args: never) => unknown; create?: (args: never) => unknown }
    }
    expect(field.access!.update!(admin)).toBe(true)
    expect(field.access!.update!(agentYes)).toBe(false)
    expect(field.access!.create!(agentYes)).toBe(false)
  })

  it('canPublish(): нет пользователя — нет права', () => {
    expect(canPublish(null)).toBe(false)
    expect(canPublish({ role: 'agent', canPublish: null })).toBe(false)
  })

  it('publisher авторизуется API-ключом завода, логин админом только как запасной путь с предупреждением', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'scripts/content-factory/publisher.ts'),
      'utf8'
    )
    expect(src).toMatch(/users API-Key \$\{FACTORY_API_KEY\}/)
    expect(src.indexOf('FACTORY_API_KEY) return')).toBeLessThan(src.indexOf('/api/users/login'))
    expect(src).toMatch(/паролем админа/)
    expect(src).toMatch(/await sendMessage\(legacy\)/)
  })

  it('миграция can_publish зарегистрирована', () => {
    const idx = fs.readFileSync(path.join(process.cwd(), 'payload-migrations/index.ts'), 'utf8')
    expect(idx).toMatch(/name: '20260905_users_can_publish'/)
  })
})
