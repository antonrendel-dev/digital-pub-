// Фаза 1: собрать сырые цифры и сохранить снапшот.
// Отделена от отчёта намеренно — падение рендера не должно приводить
// к повторному опросу API.
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectMetrika, collectTopvisor, collectWebmaster, loadEnv } from './lib/sources.mjs'

const SNAPSHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'data', 'snapshots')
const WINDOW_DAYS = 14

export async function collect() {
  const env = loadEnv()
  const [topvisor, webmaster, metrika] = await Promise.all([
    collectTopvisor(env),
    collectWebmaster(env),
    collectMetrika(env, WINDOW_DAYS),
  ])

  return {
    collectedAt: new Date().toISOString(),
    windowDays: WINDOW_DAYS,
    topvisor,
    webmaster,
    metrika,
  }
}

export function saveSnapshot(snapshot) {
  mkdirSync(SNAPSHOT_DIR, { recursive: true })
  const date = snapshot.collectedAt.split('T')[0]
  const target = join(SNAPSHOT_DIR, `seo_${date}.json`)
  const tmp = `${target}.tmp`
  writeFileSync(tmp, JSON.stringify(snapshot, null, 2))
  renameSync(tmp, target)
  return target
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const snapshot = await collect()
  const path = saveSnapshot(snapshot)
  const status = (s) => (s.ok ? 'ok' : `FAIL — ${s.error}`)
  console.log(`Снапшот: ${path}`)
  console.log(`  Топвизор:  ${status(snapshot.topvisor)}`)
  console.log(`  Вебмастер: ${status(snapshot.webmaster)}`)
  console.log(`  Метрика:   ${status(snapshot.metrika)}`)
}
