import fs from 'fs'
import os from 'os'
import path from 'path'

/**
 * Роль агента не должна исчезать молча при смене CLI.
 *
 * 27.08.2026 завод переключили на Codex. У Codex нет флага `--agent`: профили
 * из ~/.claude/agents — механизм Claude Code, субагенты Codex порождаются на
 * лету и файловых профилей не имеют. Код в writer.ts и analyst.ts в этом
 * случае просто ронял `agent` в undefined — флага нет, ошибки нет, а аналитик
 * отвечает как обычная модель и писатель не читает dpub-content-standard.
 *
 * Прогон 28.08 до этой правки упал раньше, на модели, и роль потерялась бы
 * незамеченной. Проверки ниже держат, чтобы потеря была либо невозможной,
 * либо громкой.
 */

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-'))

fs.writeFileSync(
  path.join(TMP, 'writer.md'),
  `---
name: writer
description: |
  SEO-копирайтер.
model: inherit
skills:
  - copywriting
  - dpub-content-standard
allowed-tools:
  - Skill
---

Ты — SEO-копирайтер для русскоязычного рынка.
Пиши по стандарту v6.6.
`
)

fs.writeFileSync(path.join(TMP, 'noskills.md'), `---\nname: noskills\n---\n\nПросто роль.\n`)
fs.writeFileSync(path.join(TMP, 'empty.md'), `---\nname: empty\nskills:\n  - x\n---\n\n\n`)

process.env.CLAUDE_AGENTS_DIR = TMP
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  loadAgentRole,
  stripRoleTag,
  withRole,
} = require('../../scripts/content-factory/lib/agent-role')

describe('перенос роли агента в текст промпта', () => {
  it('читает тело профиля без frontmatter', () => {
    const role = loadAgentRole('writer')
    expect(role).not.toBeNull()
    expect(role.instructions).toContain('SEO-копирайтер для русскоязычного рынка')
    expect(role.instructions).toContain('стандарту v6.6')
    // Frontmatter в системный промпт попадать не должен — это метаданные CLI.
    expect(role.instructions).not.toContain('model: inherit')
    expect(role.instructions).not.toContain('allowed-tools')
  })

  it('вытаскивает список скиллов — чтобы предупредить, чего агент лишился', () => {
    // Скиллы подключает CLI, текстом они не переносятся. Молчать об этом
    // нельзя: расхождение со стандартом всплывёт только на приёмке.
    expect(loadAgentRole('writer').skills).toEqual(['copywriting', 'dpub-content-standard'])
  })

  it('профиль без скиллов даёт пустой список, а не падение', () => {
    const role = loadAgentRole('noskills')
    expect(role.skills).toEqual([])
    expect(role.instructions).toBe('Просто роль.')
  })

  it('пустое тело считается отсутствием роли', () => {
    // Иначе в промпт уедет пустая рамка «РОЛЬ», и модель решит, что роли нет.
    expect(loadAgentRole('empty')).toBeNull()
  })

  it('несуществующий профиль возвращает null, а не бросает', () => {
    expect(loadAgentRole('нет-такого')).toBeNull()
  })

  it('роль и задача разделены явной границей', () => {
    // Без границы инструкции роли смешиваются с данными задачи, и модель
    // начинает исполнять то, что пришло в контент-плане, как указание себе.
    const out = withRole('Напиши статью про резюме.', {
      instructions: 'Ты — SEO-копирайтер.',
      skills: [],
    })
    expect(out.indexOf('РОЛЬ')).toBeLessThan(out.indexOf('ЗАДАЧА'))
    expect(out).toContain('Ты — SEO-копирайтер.')
    expect(out).toContain('Напиши статью про резюме.')
    expect(out).toMatch(/КОНЕЦ РОЛИ/)
  })

  it('завод нигде не роняет роль в undefined без замены', () => {
    // Регрессия, ради которой всё писалось: `agent: … ? agent : undefined`
    // в аргументах команды означал тихую потерю роли.
    for (const f of ['writer.ts', 'analyst.ts']) {
      const src = fs.readFileSync(path.join(process.cwd(), 'scripts', 'content-factory', f), 'utf8')
      expect(src).toContain('loadAgentRole')
      expect(src).not.toMatch(/agent: agent && supportsAgentProfiles\(\) \? agent : undefined/)
    }
  })
})

describe('метка роли не уезжает в артефакт', () => {
  /**
   * Профили велят агенту начинать каждый ответ с [WRITER] / [ANALYST]: в чате
   * это подпись, в заводе — первая строка статьи. 7 статей за август вышли
   * на сайт с меткой, восьмая — с [ANALYST] внутри alt графика.
   */
  it('срезает метку в начале ответа', () => {
    expect(stripRoleTag('[WRITER]\n\n## Заголовок')).toBe('## Заголовок')
    expect(stripRoleTag('[ANALYST] Динамика рынка')).toBe('Динамика рынка')
  })

  it('не трогает ссылку в середине текста', () => {
    // `[SMM](/vacancies/smm)` — живая перелинковка в статье про
    // контент-менеджера. Жадная замена стёрла бы её.
    const text = 'Смежные пути: [копирайтинг](/vacancies/copywriting), [SMM](/vacancies/smm).'
    expect(stripRoleTag(text)).toBe(text)
  })

  it('чужие метки в начале строки остаются нетронутыми', () => {
    expect(stripRoleTag('[ГОСТ] требования')).toBe('[ГОСТ] требования')
  })

  it('щит стоит на общем выходе CLI, а не на отдельных шагах', () => {
    // Ставить срез на каждом из десятка шагов — значит забыть про новый шаг.
    for (const f of ['writer.ts', 'analyst.ts']) {
      const src = fs.readFileSync(path.join(process.cwd(), 'scripts', 'content-factory', f), 'utf8')
      expect(src).toContain('resolve(stripRoleTag(out.trim()))')
      expect(src).not.toContain('resolve(out.trim())')
    }
  })

  it('alt графика чистится отдельно — там метка внутри поля JSON', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'scripts', 'content-factory', 'writer.ts'),
      'utf8'
    )
    expect(src).toContain('alt: stripRoleTag(chart.alt)')
  })

  it('в опубликованных статьях меток нет', () => {
    const dir = path.join(process.cwd(), 'content', 'articles')
    const dirty = fs
      .readdirSync(dir)
      .filter((f: string) => f.endsWith('.mdx'))
      .filter((f: string) =>
        /\[(WRITER|ANALYST|SEO|EDITOR|MARKETER|REVIEWER)\]/.test(
          fs.readFileSync(path.join(dir, f), 'utf8')
        )
      )
    expect(dirty).toEqual([])
  })
})
