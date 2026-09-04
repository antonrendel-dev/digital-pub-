import { Posts } from '../../payload/collections/posts'
import { Users } from '../../payload/collections/users'
import { Articles } from '../../payload/collections/articles'

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
