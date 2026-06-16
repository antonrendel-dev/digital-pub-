/**
 * Content Factory — Scheduler
 * Берёт следующую одобренную неопубликованную тему и запускает writer.
 * Запуск: node scheduler.compiled.js
 * Cron: 0 6 * * 1,3,5 (пн/ср/пт в 06:00 UTC = 09:00 Москва)
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { sendMessage } from './lib/telegram.js'

const DATA_DIR = path.join(import.meta.dirname, 'data')
const SCRIPTS_DIR = import.meta.dirname

interface Topic {
  id: number
  title: string
  keyword: string
  audience: string
  type: string
  trafficEst: string
  approved?: boolean
  published?: boolean
}

function getLatestTopicsFile(): string | null {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('topics_') && f.endsWith('.json'))
    .sort()
    .reverse()
  return files.length ? path.join(DATA_DIR, files[0]) : null
}

function getNextApprovedTopic(topicsFile: string): Topic | null {
  const { topics } = JSON.parse(fs.readFileSync(topicsFile, 'utf-8')) as {
    date: string
    topics: Topic[]
  }
  return topics.find((t) => t.approved && !t.published) || null
}

function countApprovedUnpublished(topicsFile: string): number {
  const { topics } = JSON.parse(fs.readFileSync(topicsFile, 'utf-8')) as {
    date: string
    topics: Topic[]
  }
  return topics.filter((t) => t.approved && !t.published).length
}

function runWriter(topicId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const writerPath = path.join(SCRIPTS_DIR, 'writer.compiled.js')
    const child = spawn('node', [writerPath, String(topicId)], {
      cwd: SCRIPTS_DIR,
      env: process.env,
      stdio: 'inherit',
    })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`writer вышел с кодом ${code}`))
    })
    child.on('error', reject)
  })
}

async function main() {
  const topicsFile = getLatestTopicsFile()

  if (!topicsFile) {
    await sendMessage(
      `⚠️ <b>Контент-завод: нет тем</b>\n\n` +
        `Запусти <code>/content_plan</code> чтобы аналитик сгенерировал новые темы.`
    )
    console.log('[scheduler] Нет файлов с темами')
    return
  }

  const nextTopic = getNextApprovedTopic(topicsFile)

  if (!nextTopic) {
    await sendMessage(
      `📭 <b>Контент-завод: нет одобренных тем</b>\n\n` +
        `Все одобренные темы опубликованы или тем нет.\n\n` +
        `Одобри новые темы командой:\n<code>/content_approve 3 4 5 6 7</code>\n\n` +
        `Или запусти генерацию новых:\n<code>/content_plan</code>`
    )
    console.log('[scheduler] Нет одобренных неопубликованных тем')
    return
  }

  const remaining = countApprovedUnpublished(topicsFile)
  console.log(`[scheduler] Запускаю тему #${nextTopic.id}: "${nextTopic.title}"`)
  console.log(`[scheduler] Осталось одобренных тем: ${remaining}`)

  // Уведомляем если тем остаётся мало
  if (remaining <= 3) {
    await sendMessage(
      `⚠️ <b>Контент-завод: тем осталось мало (${remaining})</b>\n\n` +
        `Одобри новые темы или запусти аналитика:\n<code>/content_plan</code>`
    )
  }

  await runWriter(nextTopic.id)
}

main().catch(async (e) => {
  console.error('[scheduler] Ошибка:', e)
  await sendMessage(`❌ Ошибка планировщика:\n${e.message}`).catch(() => {})
  process.exit(1)
})
