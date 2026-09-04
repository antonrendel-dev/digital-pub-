import { execFileSync } from 'child_process'
import path from 'path'

/**
 * Страж на внутреннюю семантику Payload, на которой держится S14: одноимённое
 * поле apiKey сливается с базовым полем auth так, что шифрование ключа
 * (хуки decryptKey/encryptKey) остаётся от Payload, а access.read — наш.
 * Порядок deepMerge(base, ours) — не публичный контракт; апгрейд Payload
 * мог бы тихо снять либо шифрование, либо наш доступ.
 */
describe('users.apiKey после слияния с базовым полем auth', () => {
  it('одно поле: хуки шифрования от Payload, access.read наш, форма скрыта', () => {
    const out = execFileSync(
      'npx',
      ['tsx', path.join(__dirname, '../helpers/users-apikey-merge.ts')],
      {
        cwd: path.join(__dirname, '../..'),
        encoding: 'utf8',
        timeout: 60_000,
      }
    )
    const r = JSON.parse(out.trim().split('\n').pop() ?? '{}')
    expect(r).toEqual({
      count: 1,
      type: 'text',
      afterRead: ['decryptKey'],
      beforeChange: ['encryptKey'],
      fieldHidden: true,
      accessIsOurs: true,
    })
  })
})
