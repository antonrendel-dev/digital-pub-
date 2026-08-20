/**
 * Content Factory — Analyst
 * Генерирует батч тем на календарный месяц, постит в Telegram топик SEO Лаба.
 * Запуск: node analyst.compiled.js
 * Cron: 0 9 * * 1 (каждый понедельник в 9:00)
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { sendMessage } from './lib/telegram.js'
import {
  MAX_WORDSTAT_VOLUME,
  MIN_WORDSTAT_VOLUME,
  renumberByVolume,
  splitByVolume,
  wordstatIsAlive,
} from './lib/topic-gate.js'
import { fetchWebmasterOpportunities, fetchWordstatVolume } from './lib/yandex.js'

const DATA_DIR = path.join(import.meta.dirname, 'data')
const ARTICLES_DIR = path.join(import.meta.dirname, '../../content/articles')

// Батч = календарный месяц: публикуем по статье в день, длинный месяц берём с запасом.
// Остаток переезжает в следующий батч, недобор закрывается досрочным прогоном аналитика.
const TOPICS_REQUESTED = 30
const TOPICS_FOR_JOBSEEKERS = Math.round(TOPICS_REQUESTED * 0.9)

interface Topic {
  id: number
  title: string
  keyword: string
  audience: 'Соискатель' | 'HR' | 'Оба'
  type: 'Гайд' | 'Конспект' | 'Сравнение' | 'Кейс' | 'Чеклист'
  trafficEst: string
  wordstatVolume?: number | null
  offTarget?: boolean
}

function getPublishedArticleTitles(): string[] {
  if (!fs.existsSync(ARTICLES_DIR)) return []
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .flatMap((f) => {
      const raw = fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf-8')
      const m = raw.match(/^title:\s*["']?(.+?)["']?\s*$/m)
      return m ? [m[1]] : []
    })
}

function getAllPlannedTopics(): Array<{ title: string; keyword: string }> {
  if (!fs.existsSync(DATA_DIR)) return []
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('topics_') && f.endsWith('.json'))
    .flatMap((f) => {
      const { topics } = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')) as {
        topics: Topic[]
      }
      return topics.map((t) => ({ title: t.title, keyword: t.keyword }))
    })
}

// Только чтение: править репозиторий посреди сборки контент-плана аналитику незачем.
const AGENT_TOOLS = 'Read,Skill,Glob,Grep'

/**
 * @param agent Профиль из ~/.claude/agents. Без него Клод отвечает как есть,
 * без роли и без скиллов — так завод работал до 20.08.2026.
 */
function askClaude(prompt: string, agent?: 'analyst' | 'seo'): Promise<string> {
  return new Promise((resolve, reject) => {
    // --allowedTools обязателен: с --agent, но без него скилл не загружается
    // и агент честно отвечает «доступ не выдан». Проверено живым прогоном.
    const args = agent ? ['-p', '--agent', agent, '--allowedTools', AGENT_TOOLS] : ['-p']
    // Промпт через stdin: аргументом argv длинный контент-план бьётся об ARG_MAX → spawn E2BIG
    const child = spawn('claude', args, {
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    child.stdin.write(prompt)
    child.stdin.end()
    let out = ''
    let err = ''
    child.stdout.on('data', (d: Buffer) => (out += d.toString()))
    child.stderr.on('data', (d: Buffer) => (err += d.toString()))
    child.on('close', (code) => {
      if (code === 0) resolve(out.trim())
      else reject(new Error(err || `claude завершился с кодом ${code}`))
    })
    child.on('error', reject)
  })
}

// Тема ниже порога не выбрасывается: аналитик переформулирует ключ под массовый
// запрос и заголовок под него, частотность снимается заново. Два круга — компромисс
// между «дожать» и «не гонять Claude бесконечно по мёртвым темам».
const REFORMULATION_ROUNDS = 2

async function reformulateTopics(offTarget: Topic[]): Promise<{ fixed: Topic[]; weak: Topic[] }> {
  const fixed: Topic[] = []
  let pending = offTarget

  for (let round = 1; round <= REFORMULATION_ROUNDS && pending.length; round++) {
    console.log(`[analyst] Переформулировка, круг ${round}: ${pending.length} тем`)

    const raw = await askClaude(
      `Ты SEO-аналитик русскоязычного job board d-pub.ru (вакансии и резюме digital-специалистов).

Ниже темы, ключи которых НЕ попадают в рабочий коридор ${MIN_WORDSTAT_VOLUME}-${MAX_WORDSTAT_VOLUME} запросов/мес по Яндекс.Вордстату. Переформулируй КАЖДУЮ так, чтобы ключ попал в коридор, сохранив исходную пользу для читателя.

Коридор с двух сторон:
- Ниже ${MIN_WORDSTAT_VOLUME}/мес — спроса нет, статья пишется в никуда. Нужна формулировка ШИРЕ.
- Выше ${MAX_WORDSTAT_VOLUME}/мес — это ВЧ-запрос, там hh.ru и superjob, мы не ранжируемся. Нужна формулировка УЖЕ.

Как переформулировать:
- Слишком узкий ключ расширяем: «контроффер стоит ли принимать» (2/мес) → «переговоры о зарплате» ; «пробел в резюме как объяснить» (2/мес) → «как составить резюме»
- Слишком широкий ключ сужаем уточнением — профессией, уровнем, форматом работы, инструментом: «вакансии маркетолог» (12000/мес) → «вакансии маркетолог маркетплейсов» ; «резюме дизайнера» (5000/мес) → «резюме джуниор дизайнера без опыта»
- Работают шаблоны: «зарплата <профессия>», «вакансии <профессия>», «профессия <X>», «как стать <X>», «<X> обучение», «резюме <X>», «портфолио <X>», «собеседование <X>»
- Заголовок статьи перепиши под новый ключ, тема статьи может стать шире или уже исходной
- Ключ — 2-4 слова, без «как», «стоит ли», «что делать если»
- Не предлагай ключ, который уже есть в списке ниже

ТЕМЫ НА ПЕРЕФОРМУЛИРОВКУ:
${pending.map((t) => `id ${t.id}: "${t.title}" [ключ: ${t.keyword} — ${t.wordstatVolume}/мес]`).join('\n')}

Ответ строго в формате JSON массива, без лишнего текста:
[{"id": <исходный id>, "title": "новый заголовок", "keyword": "новый ключ"}]`,
      'analyst'
    )

    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.warn('[analyst] Переформулировка: Claude не вернул JSON, оставляю темы как есть')
      break
    }
    const rewrites = JSON.parse(jsonMatch[0]) as { id: number; title: string; keyword: string }[]
    const byId = new Map(rewrites.map((r) => [r.id, r]))

    for (const t of pending) {
      const r = byId.get(t.id)
      if (!r) continue
      t.title = r.title
      t.keyword = r.keyword
      t.wordstatVolume = await fetchWordstatVolume(r.keyword)
    }

    const split = splitByVolume(pending)
    fixed.push(...split.passed)
    // Неизмеренные (Вордстат не ответил) остаются в очереди следующего круга —
    // переформулировать их вслепую нельзя, но и терять их не нужно.
    pending = [...split.offTarget, ...split.unmeasured]
    console.log(
      `[analyst] Круг ${round}: дожато ${split.passed.length}, осталось ${pending.length}`
    )
  }

  return { fixed, weak: pending }
}

async function generateTopics(): Promise<{ topics: Topic[]; weak: Topic[] }> {
  const publishedTitles = getPublishedArticleTitles()
  const plannedTopics = getAllPlannedTopics()

  // Обратная связь из Яндекс.Вебмастера: запросы, где сайт уже показывается, но не в топе
  console.log('[analyst] Тяну запросы-возможности из Webmaster...')
  const opportunities = await fetchWebmasterOpportunities(20)
  if (opportunities.length > 0) {
    console.log(`[analyst] Webmaster: ${opportunities.length} целевых запросов с показами`)
  }

  const publishedBlock =
    publishedTitles.length > 0
      ? `\nУЖЕ ОПУБЛИКОВАННЫЕ СТАТЬИ (строго не повторять, не пересекаться по теме):\n` +
        publishedTitles.map((t) => `- ${t}`).join('\n')
      : ''

  const plannedBlock =
    plannedTopics.length > 0
      ? `\nУЖЕ ЗАПЛАНИРОВАННЫЕ ТЕМЫ (не дублировать ни заголовок, ни ключ):\n` +
        plannedTopics.map((t) => `- ${t.title} [ключ: ${t.keyword}]`).join('\n')
      : ''

  const opportunityBlock =
    opportunities.length > 0
      ? `\nРЕАЛЬНЫЕ ЗАПРОСЫ ЯНДЕКСА, ГДЕ САЙТ УЖЕ ПОКАЗЫВАЕТСЯ, НО НЕ В ТОПЕ (данные Вебмастера за неделю).\n` +
        `Приоритизируй 5-7 тем, которые прямо закрывают эти запросы — так мы дожмём почти-ранжирующийся трафик:\n` +
        opportunities
          .map((o) => `- "${o.query}" — ${o.shows} показов, ${o.clicks} кликов`)
          .join('\n')
      : ''

  const raw = await askClaude(
    `Ты SEO-аналитик и контент-стратег для русскоязычного job board d-pub.ru — агрегатора вакансий для digital-специалистов (маркетологи, дизайнеры, SMM, аналитики, копирайтеры, таргетологи) из Telegram-каналов.

ГЛАВНАЯ аудитория — СОИСКАТЕЛИ (ищут работу в digital). Проверено данными: соискательские запросы («зарплата X», «профессия X», «вакансии X», «как стать X», «резюме/портфолио X») имеют частотность в сотни-тысячи в месяц, а HR-запросы («как нанять X», «где найти специалиста») — 0-23/мес. Поэтому HR-темы почти не генерируем.
${publishedBlock}${plannedBlock}${opportunityBlock}

Составь список ${TOPICS_REQUESTED} НОВЫХ тем для статей на блог — уникальных, не пересекающихся с перечисленным выше. Для каждой темы укажи:
- Заголовок статьи (конкретный, с ключевым словом)
- Главный поисковый ключ (1-2 слова/фразы, которые ищут)
- Аудитория: Соискатель / HR / Оба
- Тип контента: Гайд / Конспект / Сравнение / Кейс / Чеклист
- Примерный трафик-потенциал: низкий (<200/мес) / средний (200-800/мес) / высокий (>800/мес)

Требования к темам:
- Вечнозелёные (не привязаны к конкретной дате)
- Практические, решают конкретную проблему
- Ключ должен собирать ${MIN_WORDSTAT_VOLUME}-${MAX_WORDSTAT_VOLUME} запросов/мес по Вордстату — темы вне этого коридора уйдут на переформулировку. Слишком узкие («контроффер стоит ли принимать», «пробел в резюме как объяснить» — 1-2 запроса/мес) не предлагай. Голые ВЧ-запросы («вакансии маркетолог», «резюме дизайнера» — тысячи в месяц) тоже не предлагай: там hh.ru и superjob, мы не ранжируемся. Бери среднечастотные — с уточнением по профессии, уровню, формату работы или инструменту
- Минимум ${TOPICS_FOR_JOBSEEKERS} из ${TOPICS_REQUESTED} тем — для соискателей, с ключами по шаблонам: «зарплата <профессия>», «профессия <X>», «вакансии <X>», «как стать <X>», «<X> с нуля», «резюме <X>», «портфолио <X>», «собеседование <X>», «тестовое задание <X>»
- Максимум 2-3 темы для HR — и только если ключ реально ищут (не «как нанять X»)
- Включи 3-4 темы в формате "конспект зарубежного материала" (пересказ зарубежных best practices)
- Не дублируй то что уже есть на hh.ru или superjob
- Каждая тема должна закрывать уникальный поисковый запрос — не должно быть двух тем по одной теме с разными формулировками

Ответ строго в формате JSON массива, без лишнего текста:
[
  {
    "id": 1,
    "title": "...",
    "keyword": "...",
    "audience": "Соискатель|HR|Оба",
    "type": "Гайд|Конспект|Сравнение|Кейс|Чеклист",
    "trafficEst": "низкий|средний|высокий"
  }
]`,
    'analyst'
  )

  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Claude не вернул JSON')
  const topics = JSON.parse(jsonMatch[0]) as Topic[]

  // Обогащаем реальной частотностью Wordstat и приоритизируем по спросу
  console.log('[analyst] Снимаю частотность Wordstat по темам...')
  await Promise.all(
    topics.map(async (t) => {
      t.wordstatVolume = await fetchWordstatVolume(t.keyword)
    })
  )

  if (!wordstatIsAlive(topics)) {
    console.log('[analyst] Wordstat: частотность недоступна, гейт пропущен')
    return { topics, weak: [] }
  }

  const { passed, offTarget, unmeasured } = splitByVolume(topics)
  console.log(
    `[analyst] Гейт ${MIN_WORDSTAT_VOLUME}-${MAX_WORDSTAT_VOLUME}/мес: прошло ${passed.length}, ` +
      `на переформулировку ${offTarget.length}, без замера ${unmeasured.length}`
  )

  const { fixed, weak } = await reformulateTopics(offTarget)
  // Недожатые остаются в плане — решение одобрять их или нет за Тони,
  // но помечены, чтобы не путать с темами, прошедшими гейт.
  weak.forEach((t) => (t.offTarget = true))
  unmeasured.forEach((t) => (t.offTarget = true))

  return {
    topics: renumberByVolume([...passed, ...fixed, ...weak, ...unmeasured]),
    weak: [...weak, ...unmeasured],
  }
}

function formatTopicsMessage(topics: Topic[], weak: Topic[], date: string): string {
  const audienceEmoji: Record<string, string> = { Соискатель: '👤', HR: '💼', Оба: '👥' }
  const typeEmoji: Record<string, string> = {
    Гайд: '📘',
    Конспект: '📹',
    Сравнение: '⚖️',
    Кейс: '💡',
    Чеклист: '✅',
  }
  const trafficEmoji: Record<string, string> = { низкий: '📉', средний: '📊', высокий: '🚀' }

  const lines = topics.map((t) => {
    const vol =
      t.wordstatVolume && t.wordstatVolume > 0
        ? ` · 📈 ${t.wordstatVolume.toLocaleString('ru-RU')}/мес`
        : ''
    return (
      `${t.id}. ${t.offTarget ? '⚠️ ' : ''}${typeEmoji[t.type] ?? ''} <b>${t.title}</b>\n` +
      `   🔑 <i>${t.keyword}</i> · ${audienceEmoji[t.audience] ?? ''} ${t.audience} · ${trafficEmoji[t.trafficEst] ?? ''} ${t.trafficEst}${vol}`
    )
  })

  const gateBlock = weak.length
    ? `\n\n━━━━━━━━━━━━━━━━\n` +
      `⚠️ <b>Не попали в коридор ${MIN_WORDSTAT_VOLUME}-${MAX_WORDSTAT_VOLUME}/мес после двух переформулировок: ${weak.length}</b>\n` +
      `Одобрять на свой риск:\n` +
      weak
        .slice(0, 10)
        .map(
          (t) =>
            `   ${t.wordstatVolume == null ? 'без замера' : `${t.wordstatVolume}/мес`} — <i>${t.keyword}</i>`
        )
        .join('\n')
    : ''

  return (
    `📊 <b>Контент-план — ${date}</b>\n\n` +
    lines.join('\n\n') +
    gateBlock +
    `\n\n━━━━━━━━━━━━━━━━\n` +
    `Чтобы одобрить темы, ответь командой:\n` +
    `<code>/content_approve 1 3 7</code>`
  )
}

async function main() {
  console.log('[analyst] Генерирую темы...')
  const { topics, weak } = await generateTopics()

  fs.mkdirSync(DATA_DIR, { recursive: true })
  const date = new Date().toISOString().split('T')[0]
  const filePath = path.join(DATA_DIR, `topics_${date}.json`)
  fs.writeFileSync(filePath, JSON.stringify({ date, topics }, null, 2))
  console.log(`[analyst] Сохранено: ${filePath}`)

  const dateRu = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const msg = formatTopicsMessage(topics, weak, dateRu)
  await sendMessage(msg)
  console.log('[analyst] Отправлено в Telegram ✓')
}

main().catch((e) => {
  console.error('[analyst] Ошибка:', e)
  process.exit(1)
})
