// Разовая переформулировка тем активного батча под коридор 300-1000/мес.
// Темы не выбрасываются: меняется формулировка ключа и заголовок под него,
// исходные значения сохраняются в originalKeyword/originalTitle.
// Запуск: node reformulate-batch.mjs data/topics_2026-08-14.json

import { spawn } from 'child_process'
import fs from 'fs'
import { fetchWordstatVolume } from './lib/yandex.js'

const file = process.argv[2]
const MIN = 300
const MAX = 1000
const ROUNDS = 2
const SPACING_MS = 40_000
const RETRY_WAIT_MS = 10 * 60_000
const MAX_RETRIES = 6

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const load = () => JSON.parse(fs.readFileSync(file, 'utf-8'))
const inCorridor = (v) => typeof v === 'number' && v >= MIN && v <= MAX

function askClaude(prompt) {
  return new Promise((resolve, reject) => {
    // Имя агента берётся из окружения — см. lib/agent-cli.ts. Здесь .mjs,
    // поэтому профиль воспроизведён минимально: этот скрипт запускается руками.
    const cli = process.env.CONTENT_FACTORY_CLI === 'codex' ? 'codex' : 'claude'
    const args = cli === 'codex' ? ['exec', prompt] : ['-p', prompt]
    const child = spawn(cli, args, { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d.toString()))
    child.stderr.on('data', (d) => (err += d.toString()))
    child.on('close', (code) =>
      code === 0 ? resolve(out.trim()) : reject(new Error(err || `claude exit ${code}`))
    )
    child.on('error', reject)
  })
}

async function measure(keyword) {
  let v = await fetchWordstatVolume(keyword)
  for (let a = 1; v === null && a <= MAX_RETRIES; a++) {
    console.log(`[reform] Пауза ${RETRY_WAIT_MS / 60000} мин (попытка ${a}) — похоже на квоту`)
    await sleep(RETRY_WAIT_MS)
    v = await fetchWordstatVolume(keyword)
  }
  return v
}

for (let round = 1; round <= ROUNDS; round++) {
  const all = load().topics
  const pending = all.filter(
    (t) => t.approved && !t.published && !inCorridor(t.wordstatVolume)
  )
  if (!pending.length) break

  console.log(`[reform] Круг ${round}: ${pending.length} тем`)

  const takenKeywords = all.map((t) => t.keyword)
  const prompt = `Ты SEO-аналитик русскоязычного job board d-pub.ru — агрегатора вакансий и резюме digital-специалистов.

Ниже темы, ключи которых НЕ попадают в рабочий коридор ${MIN}-${MAX} запросов/мес по Яндекс.Вордстату. Переформулируй КАЖДУЮ так, чтобы ключ попал в коридор, сохранив пользу статьи для читателя.

Коридор бракует с двух сторон:
- Ниже ${MIN}/мес — спроса нет, статья пишется в никуда. Формулировку РАСШИРИТЬ.
- Выше ${MAX}/мес — это ВЧ-запрос, там hh.ru и superjob, мы туда не ранжируемся. Формулировку СУЗИТЬ уточнением: профессия, уровень (джуниор/senior), формат работы (удалённо/гибрид), инструмент, город, «без опыта», «с нуля».

Примеры сужения ВЧ: «зарплата дизайнера» (7351) → «зарплата моушн дизайнера»; «резюме без опыта работы» (3068) → «резюме маркетолога без опыта».
Примеры расширения НЧ: «контроффер стоит ли принимать» (2) → «переговоры о зарплате»; «пробел в резюме как объяснить» (2) → «как составить резюме».

ОТДЕЛЬНО про HR-темы. Проверено данными: запросы работодателей («как нанять», «ошибки при найме», «как проверить кейсы») собирают 0-20/мес — это мёртвый сегмент. Такие темы не расширяй, а ПЕРЕВЕРНИ на соискателя, сохранив материал: «ошибки при найме маркетолога» → «собеседование маркетолога» (что спрашивают и как отвечать).

Правила для нового ключа:
- 2-4 слова, без «как», «стоит ли», «что делать если»
- работают шаблоны: «зарплата <X>», «вакансии <X>», «профессия <X>», «<X> обучение», «резюме <X>», «портфолио <X>», «собеседование <X>», «<X> без опыта»
- заголовок статьи перепиши под новый ключ, тема может стать шире или уже исходной
- ключ не должен повторять ни один из уже занятых (список ниже)

УЖЕ ЗАНЯТЫЕ КЛЮЧИ (не предлагать):
${takenKeywords.map((k) => `- ${k}`).join('\n')}

ТЕМЫ НА ПЕРЕФОРМУЛИРОВКУ:
${pending.map((t) => `id ${t.id}: "${t.title}" [ключ: ${t.keyword} — ${t.wordstatVolume}/мес]`).join('\n')}

Ответ строго в формате JSON массива, без лишнего текста:
[{"id": <исходный id>, "title": "новый заголовок", "keyword": "новый ключ"}]`

  const raw = await askClaude(prompt)
  const m = raw.match(/\[[\s\S]*\]/)
  if (!m) {
    console.log(`[reform] Круг ${round}: Клод не вернул JSON, останавливаюсь`)
    break
  }
  const rewrites = new Map(JSON.parse(m[0]).map((r) => [r.id, r]))
  console.log(`[reform] Круг ${round}: получено ${rewrites.size} переформулировок`)

  let hit = 0
  const targets = pending.filter((t) => rewrites.has(t.id))
  for (const [i, t] of targets.entries()) {
    const r = rewrites.get(t.id)
    const volume = await measure(r.keyword)

    const data = load()
    const row = data.topics.find((x) => x.id === t.id)
    if (row) {
      // Исходники фиксируем один раз — по ним видно, из чего тема выросла.
      if (row.originalKeyword === undefined) {
        row.originalKeyword = row.keyword
        row.originalTitle = row.title
        row.originalVolume = row.wordstatVolume
      }
      row.title = r.title
      row.keyword = r.keyword
      row.wordstatVolume = volume
      fs.writeFileSync(file, JSON.stringify(data, null, 2))
    }

    const ok = inCorridor(volume)
    if (ok) hit++
    console.log(
      `[reform] ${round}/${i + 1}-${targets.length} ${ok ? '✓' : '✗'} "${t.keyword}" → "${r.keyword}" — ${volume === null ? 'без замера' : volume + '/мес'}`
    )
    if (i < targets.length - 1) await sleep(SPACING_MS)
  }
  console.log(`[reform] Круг ${round}: дожато ${hit} из ${targets.length}`)
}

const final = load().topics.filter((t) => t.approved && !t.published)
const passed = final.filter((t) => inCorridor(t.wordstatVolume))
console.log(
  `[reform] ВЕРДИКТ: в коридоре ${passed.length} из ${final.length}, вне коридора ${final.length - passed.length}`
)
