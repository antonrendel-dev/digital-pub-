import fs from 'fs'
import path from 'path'

/**
 * Обложка для анонса в канал ищется от корня проекта, не от process.cwd():
 * планировщик и бот запускают writer из scripts/content-factory, и 05.09.2026
 * анонс молча ушёл ссылкой — файл «не нашёлся». Страж по исходнику: здесь
 * нельзя вернуть process.cwd() и нельзя молчать, если файла нет.
 */
const writer = fs.readFileSync(
  path.join(process.cwd(), 'scripts/content-factory/writer.ts'),
  'utf8'
)

describe('путь к обложке для анонса', () => {
  const block = writer.slice(
    writer.indexOf('const heroPath ='),
    writer.indexOf('await announceToChannel(')
  )

  it('строится от PROJECT_ROOT, не от process.cwd()', () => {
    expect(block).toMatch(/path\.join\(PROJECT_ROOT, 'public'/)
    expect(block).not.toMatch(/process\.cwd\(\)/)
  })

  it('отсутствие файла не молчит', () => {
    expect(block).toMatch(/existsSync\(heroPath\)/)
    expect(block).toMatch(/console\.warn\(.*обложка для анонса не найдена/)
  })
})
