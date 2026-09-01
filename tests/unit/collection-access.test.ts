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

  it('articles анонимному отдаёт только опубликованные', () => {
    const read = Articles.access?.read as (args: never) => unknown
    expect(read(anon)).toEqual({ status: { equals: 'published' } })
    expect(read(admin)).toBe(true)
  })
})
