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

  it('отсутствие файла не молчит — предупреждение в announceToChannel', () => {
    const telegram = fs.readFileSync(
      path.join(process.cwd(), 'scripts/content-factory/lib/telegram.ts'),
      'utf8'
    )
    expect(telegram).toMatch(/imagePath && !fs\.existsSync\(imagePath\)[\s\S]{0,80}console\.warn/)
  })

  it('стенограммы агентов пишутся от корня проекта, не от cwd', () => {
    const t = fs.readFileSync(
      path.join(process.cwd(), 'scripts/content-factory/lib/agent-transcript.ts'),
      'utf8'
    )
    expect(t).toMatch(
      /const RUNS_ROOT = '\/home\/claude\/projects\/digital-pub-\/logs\/factory-runs'/
    )
    expect(t).not.toMatch(/RUNS_ROOT = path\.join\(process\.cwd\(\)/)
  })
})

describe('sharp в скриптах завода', () => {
  it('импортируется по имени пакета: путь node_modules/sharp/lib исчез в sharp 0.35', () => {
    for (const f of ['writer.ts', 'regen.ts']) {
      const src = fs.readFileSync(path.join(process.cwd(), 'scripts/content-factory', f), 'utf8')
      expect(src).not.toMatch(/node_modules', 'sharp'/)
      expect(src).toMatch(/import\('sharp'\)/)
    }
  })
})
