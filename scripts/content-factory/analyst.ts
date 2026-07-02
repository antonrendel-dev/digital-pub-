/**
 * Content Factory — Analyst
 * Генерирует 25 тем для статей, постит в Telegram топик SEO Лаба.
 * Запуск: node analyst.compiled.js
 * Cron: 0 9 * * 1 (каждый понедельник в 9:00)
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { sendMessage } from './lib/telegram.js'
import { fetchWebmasterOpportunities, fetchWordstatVolume } from './lib/yandex.js'

const DATA_DIR = path.join(import.meta.dirname, 'data')
const ARTICLES_DIR = path.join(import.meta.dirname, '../../content/articles')

interface Topic {
  id: number
  title: string
  keyword: string
  audience: 'Соискатель' | 'HR' | 'Оба'
  type: 'Гайд' | 'Конспект' | 'Сравнение' | 'Кейс' | 'Чеклист'
  trafficEst: string
  wordstatVolume?: number
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

function askClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', prompt], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
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

async function generateTopics(): Promise<Topic[]> {
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

  const raw =
    await askClaude(`Ты SEO-аналитик и контент-стратег для русскоязычного job board d-pub.ru — агрегатора вакансий для digital-специалистов (маркетологи, дизайнеры, SMM, аналитики, копирайтеры, таргетологи) из Telegram-каналов.

ГЛАВНАЯ аудитория — СОИСКАТЕЛИ (ищут работу в digital). Проверено данными: соискательские запросы («зарплата X», «профессия X», «вакансии X», «как стать X», «резюме/портфолио X») имеют частотность в сотни-тысячи в месяц, а HR-запросы («как нанять X», «где найти специалиста») — 0-23/мес. Поэтому HR-темы почти не генерируем.
${publishedBlock}${plannedBlock}${opportunityBlock}

Составь список 25 НОВЫХ тем для статей на блог — уникальных, не пересекающихся с перечисленным выше. Для каждой темы укажи:
- Заголовок статьи (конкретный, с ключевым словом)
- Главный поисковый ключ (1-2 слова/фразы, которые ищут)
- Аудитория: Соискатель / HR / Оба
- Тип контента: Гайд / Конспект / Сравнение / Кейс / Чеклист
- Примерный трафик-потенциал: низкий (<200/мес) / средний (200-800/мес) / высокий (>800/мес)

Требования к темам:
- Вечнозелёные (не привязаны к конкретной дате)
- Практические, решают конкретную проблему
- Минимум 22 из 25 тем — для соискателей, с ключами по шаблонам: «зарплата <профессия>», «профессия <X>», «вакансии <X>», «как стать <X>», «<X> с нуля», «резюме <X>», «портфолио <X>», «собеседование <X>», «тестовое задание <X>»
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
]`)

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

  const anyVolume = topics.some((t) => (t.wordstatVolume ?? 0) > 0)
  if (anyVolume) {
    topics.sort((a, b) => (b.wordstatVolume ?? 0) - (a.wordstatVolume ?? 0))
    topics.forEach((t, i) => (t.id = i + 1))
    console.log(
      `[analyst] Wordstat: топ "${topics[0].keyword}" — ${topics[0].wordstatVolume} запросов/мес`
    )
  } else {
    console.log('[analyst] Wordstat: частотность недоступна, порядок тем без изменений')
  }

  return topics
}

function formatTopicsMessage(topics: Topic[], date: string): string {
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
      `${t.id}. ${typeEmoji[t.type] ?? ''} <b>${t.title}</b>\n` +
      `   🔑 <i>${t.keyword}</i> · ${audienceEmoji[t.audience] ?? ''} ${t.audience} · ${trafficEmoji[t.trafficEst] ?? ''} ${t.trafficEst}${vol}`
    )
  })

  return (
    `📊 <b>Контент-план — ${date}</b>\n\n` +
    lines.join('\n\n') +
    `\n\n━━━━━━━━━━━━━━━━\n` +
    `Чтобы одобрить темы, ответь командой:\n` +
    `<code>/content_approve 1 3 7</code>`
  )
}

async function main() {
  console.log('[analyst] Генерирую темы...')
  const topics = await generateTopics()

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
  const msg = formatTopicsMessage(topics, dateRu)
  await sendMessage(msg)
  console.log('[analyst] Отправлено в Telegram ✓')
}

main().catch((e) => {
  console.error('[analyst] Ошибка:', e)
  process.exit(1)
})
