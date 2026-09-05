import { execFileSync } from 'child_process'

/**
 * Репозиторий публичный (S15, аудит 04.09.2026): SSH-логин и IP прода, email
 * админа и имя пользователя БД в нём — цели для брутфорса и фишинга. Все
 * вхождения вычищены 05.09.2026, цель прода живёт в ~/.config/d-pub/prod-ssh-target,
 * email админа — в секрете GitHub ADMIN_EMAIL. Страж не даёт им вернуться.
 * Историю git не переписываем (force-push запрещён) — вместо этого S16 меняет
 * email и логин.
 */
const PATTERNS = [
  'c48127',
  '91\\\\.201\\\\.52\\\\.231',
  '144\\\\.31\\\\.204\\\\.181',
  'in-ekb@mail\\\\.ru',
  'antonrendel@',
]

describe('идентификаторы прода и админа не в репозитории', () => {
  it.each(PATTERNS)('нет вхождений «%s» в отслеживаемых файлах', (pattern) => {
    let out = ''
    try {
      out = execFileSync(
        'git',
        ['grep', '-n', '-E', pattern, '--', ':!tests/unit/no-identifiers.test.ts'],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
        }
      )
    } catch (e) {
      // git grep без совпадений выходит с кодом 1 — это и есть ожидаемый результат
      const err = e as { status?: number; stdout?: string }
      if (err.status === 1) return
      throw e
    }
    expect(out.trim()).toBe('')
  })
})
