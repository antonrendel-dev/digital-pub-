'use strict'
/**
 * Content Factory — Scheduler
 * Берёт следующую одобренную неопубликованную тему и запускает writer.
 * Запуск: node scheduler.compiled.js
 * Cron: 0 6 * * 1,3,5 (пн/ср/пт в 06:00 UTC = 09:00 Москва)
 */
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
const child_process_1 = require('child_process')
const fs_1 = __importDefault(require('fs'))
const path_1 = __importDefault(require('path'))
const telegram_js_1 = require('./lib/telegram.js')
const DATA_DIR = path_1.default.join(import.meta.dirname, 'data')
const SCRIPTS_DIR = import.meta.dirname
function getLatestTopicsFile() {
  const files = fs_1.default
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('topics_') && f.endsWith('.json'))
    .sort()
    .reverse()
  return files.length ? path_1.default.join(DATA_DIR, files[0]) : null
}
function getNextApprovedTopic(topicsFile) {
  const { topics } = JSON.parse(fs_1.default.readFileSync(topicsFile, 'utf-8'))
  return topics.find((t) => t.approved && !t.published) || null
}
function countApprovedUnpublished(topicsFile) {
  const { topics } = JSON.parse(fs_1.default.readFileSync(topicsFile, 'utf-8'))
  return topics.filter((t) => t.approved && !t.published).length
}
function runWriter(topicId) {
  return new Promise((resolve, reject) => {
    const writerPath = path_1.default.join(SCRIPTS_DIR, 'writer.compiled.js')
    const child = (0, child_process_1.spawn)('node', [writerPath, String(topicId)], {
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
    await (0, telegram_js_1.sendMessage)(
      `⚠️ <b>Контент-завод: нет тем</b>\n\n` +
        `Запусти <code>/content_plan</code> чтобы аналитик сгенерировал новые темы.`
    )
    console.log('[scheduler] Нет файлов с темами')
    return
  }
  const nextTopic = getNextApprovedTopic(topicsFile)
  if (!nextTopic) {
    await (0, telegram_js_1.sendMessage)(
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
  if (remaining <= 6) {
    await (0, telegram_js_1.sendMessage)(
      `⚠️ <b>Контент-завод: тем осталось мало (${remaining})</b>\n\n` +
        `Запусти аналитика и одобри новые темы:\n<code>/content_plan</code>`
    )
  }
  await runWriter(nextTopic.id)
}
main().catch(async (e) => {
  console.error('[scheduler] Ошибка:', e)
  await (0, telegram_js_1.sendMessage)(`❌ Ошибка планировщика:\n${e.message}`).catch(() => {})
  process.exit(1)
})
