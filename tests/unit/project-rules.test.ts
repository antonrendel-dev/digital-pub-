import fs from 'fs'
import path from 'path'

/**
 * Правила проекта, продублированные тестами.
 *
 * Хук .claude/hooks/memory-rules.sh проверяет то же самое, но живёт
 * в настройках Claude Code. При смене агента он не сломается — он просто
 * исчезнет, без единой ошибки, и мы узнаем об этом, только снова наступив
 * на грабли, от которых он защищал.
 *
 * Тест живёт в репозитории и работает у любого агента, у человека вручную
 * и в CI. Хук даёт обратную связь мгновенно, тест не даёт правилу пропасть.
 * Нужны оба, и они обязаны проверять одно и то же — за этим следит
 * последняя проверка в файле.
 *
 * Правило про revalidate вынесено отдельно в db-routes-dynamic.test.ts.
 */

const SRC_DIRS = ['app', 'lib', 'components', 'scripts']

function collect(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collect(full, acc)
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) acc.push(full)
  }
  return acc
}

const FILES = SRC_DIRS.flatMap((d) => collect(path.join(process.cwd(), d)))

describe('правила проекта живут в репозитории', () => {
  it('исходники вообще собрались', () => {
    expect(FILES.length).toBeGreaterThan(50)
  })

  it('в like не уходит несколько слов', () => {
    // Payload дробит многословный запрос на отдельные слова: «дизайнер
    // презентаций» находит вакансию, где «дизайнер» в одном месте, а
    // «презентаций» в другом. Карточка рилсмейкера так обещала 380 вакансий
    // при 31 настоящей. Нужен отсев по точной фразе после выборки.
    const offenders: string[] = []
    for (const file of FILES) {
      const src = fs.readFileSync(file, 'utf8')
      for (const m of src.matchAll(/like: *'([^']+)'/g)) {
        if (m[1].trim().includes(' ')) {
          offenders.push(`${path.relative(process.cwd(), file)}: like «${m[1]}»`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('число вакансий подставляется через fillCount', () => {
    // Прямая подстановка при нуле даёт «— 0:» в заголовке, а это в сниппете
    // читается как «вакансий нет». Уехало в выдачу 25.08.2026.
    const offenders: string[] = []
    for (const file of FILES) {
      if (file.endsWith('fill-count.ts')) continue
      const src = fs.readFileSync(file, 'utf8')
      if (/replace\( *'\{N\}'/.test(src)) {
        offenders.push(path.relative(process.cwd(), file))
      }
    }
    expect(offenders).toEqual([])
  })

  it('имя CLI-агента не зашито в скриптах', () => {
    // spawn('claude') ломает завод при смене агента — молча, уже внутри крона.
    // Команда собирается через lib/agent-cli.ts.
    const offenders: string[] = []
    for (const file of FILES) {
      if (file.endsWith('agent-cli.ts')) continue
      const src = fs.readFileSync(file, 'utf8')
      if (/spawn\( *['"]claude['"]/.test(src)) {
        offenders.push(path.relative(process.cwd(), file))
      }
    }
    expect(offenders).toEqual([])
  })

  it('хук проверяет те же правила, что и тесты', () => {
    // Расхождение между хуком и тестом опаснее отсутствия обоих: правило
    // выглядит защищённым, а дыра остаётся с той стороны, куда не смотрят.
    const hook = fs.readFileSync(
      path.join(process.cwd(), '.claude', 'hooks', 'memory-rules.sh'),
      'utf8'
    )
    for (const marker of ['revalidate', 'like', 'fillCount', 'GSC']) {
      expect(hook).toContain(marker)
    }
  })
})
