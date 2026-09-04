import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  LOCK_TTL_MS,
  ScriptLock,
  escapeHtml,
  isValidSlug,
} from '../../scripts/content-factory/lib/bot-guard'

const botSource = fs.readFileSync(
  path.join(process.cwd(), 'scripts/content-factory/content-bot.ts'),
  'utf8'
)
const regenSource = fs.readFileSync(
  path.join(process.cwd(), 'scripts/content-factory/regen.ts'),
  'utf8'
)

describe('isValidSlug', () => {
  it('принимает хвост URL статьи, отклоняет обход каталога и мусор', () => {
    expect(isValidSlug('rezyume-bez-opyta-raboty-obrazec')).toBe(true)
    expect(isValidSlug('a1-')).toBe(true)
    for (const bad of [
      '../x',
      '../../x',
      'x/y',
      'Рез',
      'ab',
      'A-b',
      'a b',
      '',
      'a.mdx',
      'x'.repeat(121),
    ]) {
      expect(isValidSlug(bad)).toBe(false)
    }
  })

  it('проверка стоит и в боте до regen, и в самом regen перед path.join', () => {
    expect(botSource).toMatch(/if \(!isValidSlug\(slug\)\)/)
    expect(regenSource).toMatch(/if \(!isValidSlug\(slug\)\)[\s\S]*process\.exit\(1\)/)
    expect(regenSource.indexOf('isValidSlug(slug)')).toBeLessThan(
      regenSource.indexOf('path.join(CONTENT_DIR')
    )
  })
})

describe('escapeHtml', () => {
  it('экранирует четыре символа, которые ломают parse_mode HTML', () => {
    expect(escapeHtml('<b>&"x"</b>')).toBe('&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;')
  })

  it('слаг, сцена и текст ошибок уходят в ответ только через escapeHtml', () => {
    expect(botSource).toMatch(/<i>\$\{escapeHtml\(customScene\)\}<\/i>/)
    expect(botSource).toMatch(/Неверный slug: <code>\$\{escapeHtml\(slug\)\}<\/code>/)
    expect(botSource).not.toMatch(/\$\{e\.message\}/)
    // Сводка очереди: название и ключ темы пишет модель.
    expect(botSource).toMatch(/<b>\$\{escapeHtml\(t\.title\)\}<\/b>/)
    expect(botSource).toMatch(/🔑 \$\{escapeHtml\(t\.keyword\)\}/)
    expect(botSource).not.toMatch(/\$\{t\.title\}|\$\{t\.keyword\}/)
  })
})

describe('допуск к командам', () => {
  it('апдейт без отправителя и пустой список — мимо, а не «всем»', () => {
    expect(botSource).toMatch(/if \(!userId \|\| !ALLOWED_USER_IDS\.includes\(userId\)\)/)
    expect(botSource).not.toMatch(/ALLOWED_USER_IDS\.length > 0 &&/)
  })
})

describe('ScriptLock', () => {
  const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lock-')), 'x.lock')

  it('второй захват получает держателя, после release — свободно', () => {
    const lock = new ScriptLock(tmp())
    expect(lock.acquire('аналитик', 100)).toBeNull()
    const busy = lock.acquire('статья #5', 100)
    expect(busy?.label).toBe('аналитик')
    lock.release()
    expect(lock.acquire('статья #5', 100)).toBeNull()
  })

  it('файл лока переживает рестарт бота: живой pid блокирует, мёртвый — нет', () => {
    const file = tmp()
    const first = new ScriptLock(file, () => true)
    expect(first.acquire('картинка x', 4242)).toBeNull()
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).pid).toBe(4242)

    const afterRestartAlive = new ScriptLock(file, () => true)
    expect(afterRestartAlive.holder()?.label).toBe('картинка x')

    const afterRestartDead = new ScriptLock(file, () => false)
    expect(afterRestartDead.holder()).toBeNull()
    expect(afterRestartDead.acquire('аналитик', 1)).toBeNull()
  })

  it('в файле pid ребёнка, а не бота; лок старше TTL протух даже с живым pid', () => {
    const file = tmp()
    const lock = new ScriptLock(file, () => true)
    lock.acquire('статья #5', 100)
    lock.attachPid(555)
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).pid).toBe(555)
    const restarted = new ScriptLock(file, (pid) => pid === 555)
    expect(restarted.holder()?.pid).toBe(555)
    expect(restarted.holder(Date.now() + LOCK_TTL_MS + 1000)).toBeNull()
  })

  it('SIGTERM снимает лок, tgPost пишет отказ Bot API в лог', () => {
    expect(botSource).toMatch(/process\.on\(signal, \(\) => \{\s*scriptLock\.release\(\)/)
    expect(botSource).toMatch(/data\.ok === false/)
  })

  it('битый файл лока не блокирует', () => {
    const file = tmp()
    fs.writeFileSync(file, 'не json')
    expect(new ScriptLock(file).holder()).toBeNull()
  })

  it('все три запуска в боте идут через лок, прямой runScript в обработчиках не остался', () => {
    const handlers = botSource.slice(botSource.indexOf('async function handleMessage'))
    expect(handlers).not.toMatch(/\brunScript\(/)
    expect((handlers.match(/runLocked\(/g) ?? []).length).toBe(3)
    expect((handlers.match(/refuseIfBusy\(/g) ?? []).length).toBe(3)
  })
})
