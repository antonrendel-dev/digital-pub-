import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

/**
 * Хук проектных правил (.claude/hooks/memory-rules.sh) — правила 5–7 из
 * стоп-листа аудита 04.09.2026 (O11). Код возврата 2 — правило нарушено.
 */
const ROOT = process.cwd()
const HOOK = path.join(ROOT, '.claude/hooks/memory-rules.sh')

function runHook(filePath: string): { code: number; stderr: string } {
  const r = spawnSync('bash', [HOOK], {
    input: JSON.stringify({ tool_input: { file_path: filePath } }),
    encoding: 'utf8',
  })
  return { code: r.status ?? -1, stderr: r.stderr }
}

describe('memory-rules.sh — стоп-лист O11', () => {
  it('существующие статьи проходят: эксперимент переписки свёрнут 01.09, control не блокируется', () => {
    for (const slug of [
      'rezume-marketologa',
      'rezyume-kopiraytera',
      'hr-menedzher-digital-agentstvo-najm',
    ]) {
      const r = runHook(path.join(ROOT, `content/articles/${slug}.mdx`))
      expect(r.stderr).not.toContain('control')
      expect(r.code).toBe(0)
    }
  })

  it('новая статья без ядра — только напоминание, без блокировки', () => {
    const file = path.join(ROOT, 'content/articles/zz-test-new-article.mdx')
    fs.writeFileSync(file, '---\ntitle: "t"\n---\n\n## Р\n')
    try {
      const r = runHook(file)
      expect(r.code).toBe(0)
      expect(r.stderr).toContain('ядра')
    } finally {
      fs.unlinkSync(file)
    }
  })

  it('страница «× город» блокируется', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-'))
    const file = path.join(dir, 'app/(main)/vacancies/[category]/[city]/page.tsx')
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, 'export default function Page() { return null }\n')
    const r = runHook(file)
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('город/регион')
  })
})
