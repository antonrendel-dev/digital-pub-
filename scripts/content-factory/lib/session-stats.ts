// Счётчик ходов по дочерним сессиям claude за прогон.
//
// Расход лимитов определяют не токены статьи, а число ходов ассистента: каждый
// ход тащит в API весь накопленный контекст сессии. 21.08.2026 прогон выжрал
// лимит целиком, и виноваты были два агента, залипшие в инструментах на 33 и 28
// ходов при норме 6-10. Увидеть это удалось только вручную по транскриптам уже
// постфактум — счётчик ниже показывает такой выброс сразу после прогона.

import fs from 'fs'
import os from 'os'
import path from 'path'

// Норма для агента завода — 4-18 ходов. Порог взят выше нормы, чтобы обычный
// тяжёлый черновик не поднимал тревогу, но залипание на 25+ было видно.
export const RUNAWAY_TURNS = 25

export interface SessionStat {
  agent: string
  turns: number
  sizeKb: number
}

/** Claude Code хранит транскрипты в каталоге, чьё имя — cwd со слэшами через дефис. */
export function transcriptDir(cwd: string, home: string = os.homedir()): string {
  return path.join(home, '.claude', 'projects', cwd.replace(/\//g, '-'))
}

function readStat(file: string): SessionStat {
  let turns = 0
  let agent = '—'
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue
    try {
      const entry = JSON.parse(line) as { type?: string; agentSetting?: string }
      if (entry.type === 'assistant') turns++
      else if (entry.type === 'agent-setting' && entry.agentSetting) agent = entry.agentSetting
    } catch {
      // Транскрипт пишется построчно: последняя строка живого файла бывает обрезана.
    }
  }
  return { agent, turns, sizeKb: Math.round(fs.statSync(file).size / 1024) }
}

/** Сессии, дописанные после `sinceMs`. Замер необязательный — при любой помехе пусто. */
export function collectSessionStats(sinceMs: number, dir: string): SessionStat[] {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => path.join(dir, f))
      .filter((f) => fs.statSync(f).mtimeMs >= sinceMs)
      .map(readStat)
      .sort((a, b) => b.turns - a.turns)
  } catch {
    return []
  }
}

export function summarize(stats: SessionStat[]): string {
  const turns = stats.reduce((s, x) => s + x.turns, 0)
  const kb = stats.reduce((s, x) => s + x.sizeKb, 0)
  return `сессий ${stats.length}, ходов ${turns}, вес ${kb}K`
}

/** Текст тревоги, если какая-то сессия залипла. Норма — null, чтобы молчать. */
export function runawayWarning(stats: SessionStat[]): string | null {
  const bad = stats.filter((s) => s.turns >= RUNAWAY_TURNS)
  if (!bad.length) return null
  const rows = bad.map((s) => `${s.agent}: ${s.turns} ходов, ${s.sizeKb}K`).join('\n')
  return `Сессий с залипанием: ${bad.length} (порог ${RUNAWAY_TURNS} ходов)\n${rows}`
}
