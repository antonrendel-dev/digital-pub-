/**
 * Content Factory — Analyst
 * Генерирует 25 тем для статей, постит в Telegram топик SEO Лаба.
 * Запуск: node analyst.compiled.js
 * Cron: 0 9 * * 1 (каждый понедельник в 9:00)
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { sendMessage } from './lib/telegram.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const DATA_DIR = path.join(import.meta.dirname, 'data')

interface Topic {
  id: number
  title: string
  keyword: string
  audience: 'Соискатель' | 'HR' | 'Оба'
  type: 'Гайд' | 'Конспект' | 'Сравнение' | 'Кейс' | 'Чеклист'
  trafficEst: string
}

async function generateTopics(): Promise<Topic[]> {
  const today = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const message = await client.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `Ты SEO-аналитик и контент-стратег для русскоязычного job board d-pub.ru — агрегатора вакансий для digital-специалистов (маркетологи, дизайнеры, SMM, аналитики, копирайтеры, таргетологи) из Telegram-каналов.

Аудитория сайта: соискатели (ищут работу в digital) и HR/работодатели (нанимают digital-специалистов).

Составь список 25 тем для статей на блог. Для каждой темы укажи:
- Заголовок статьи (конкретный, с ключевым словом)
- Главный поисковый ключ (1-2 слова/фразы, которые ищут)
- Аудитория: Соискатель / HR / Оба
- Тип контента: Гайд / Конспект / Сравнение / Кейс / Чеклист
- Примерный трафик-потенциал: низкий (<200/мес) / средний (200-800/мес) / высокий (>800/мес)

Требования к темам:
- Вечнозелёные (не привязаны к конкретной дате)
- Практические, решают конкретную проблему
- Разные форматы и аудитории (mix HR и соискателей)
- Включи 3-4 темы в формате "конспект зарубежного материала" (пересказ зарубежных best practices)
- Не дублируй то что уже есть на hh.ru или superjob

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
      },
    ],
  })

  const raw = (message.content[0] as { type: string; text: string }).text
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Claude не вернул JSON')
  return JSON.parse(jsonMatch[0]) as Topic[]
}

function formatTopicsMessage(topics: Topic[], date: string): string {
  const audienceEmoji = { Соискатель: '👤', HR: '💼', Оба: '👥' }
  const typeEmoji = { Гайд: '📘', Конспект: '📹', Сравнение: '⚖️', Кейс: '💡', Чеклист: '✅' }
  const trafficEmoji = { низкий: '📉', средний: '📊', высокий: '🚀' }

  const lines = topics.map(
    (t) =>
      `${t.id}. ${typeEmoji[t.type]} <b>${t.title}</b>\n` +
      `   🔑 <i>${t.keyword}</i> · ${audienceEmoji[t.audience]} ${t.audience} · ${trafficEmoji[t.trafficEst]} ${t.trafficEst}`
  )

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

  // Save to file
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const date = new Date().toISOString().split('T')[0]
  const filePath = path.join(DATA_DIR, `topics_${date}.json`)
  fs.writeFileSync(filePath, JSON.stringify({ date, topics }, null, 2))
  console.log(`[analyst] Сохранено: ${filePath}`)

  // Post to Telegram
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
