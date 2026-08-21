// Пул готовых фраз с замеренной частотностью — из него аналитик выбирает ключи.
//
// До этого аналитик придумывал ключ, а частотность снималась после: попадание в
// коридор было везением. На батче 14.08.2026 из 48 тем 14 промахнулись, у пяти
// спроса не было вовсе. Здесь порядок обратный — в пул попадает только то, что
// уже замерено и уже в коридоре, поэтому попадание становится свойством выборки.
//
// Источник — data/semantics-volumes.json: прогон банка Топвизора через Вордстат.
// Один запрос отдаёт и частотность затравки, и вложенные фразы с их частотами,
// поэтому 687 затравок дали 2742 фразы.

import fs from 'fs'
import { MAX_WORDSTAT_VOLUME, MIN_WORDSTAT_VOLUME, inCorridor } from './topic-gate.js'

export interface PoolPhrase {
  phrase: string
  volume: number
}

interface Seed {
  volume: number
  relevantUrl?: string | null
  nested?: { phrase: string; count: number }[]
}

// Запрос за списком вакансий закрывается посадочной джоб-борда, а не статьёй:
// иначе две наши страницы конкурируют за один запрос. Границы фразы важны —
// «вакансии таргетолог» это листинг, а «как написать отклик на вакансию» нет.
// «Вакансии» ищут список, где бы слово ни стояло: «аналитик вакансии москва»,
// «разработчик вакансии без опыта». А вот «работа» внутри фразы безобидна
// («собеседование на работу вопросы работодателю») — для неё смотрим только края.
const VACANCY_TOKENS = ['вакансии', 'вакансия', 'вакансию', 'вакансий']
const WORK_TOKENS = ['работа', 'работу', 'работы', 'работе']
const INFO_MARKERS = ['как ', 'где ', 'что ', 'чем ', 'зачем', 'почему', 'сколько', 'нужно ли']

// Запросы с именем агрегатора навигационные: человек идёт на конкретный сайт,
// и это не тот сайт, который мы можем ему подсунуть статьёй.
const BRAND_TOKENS = [
  'авито',
  'яндекс',
  'hh',
  'хедхантер',
  'headhunter',
  'superjob',
  'суперджоб',
  'кворк',
]

export function isListingIntent(phrase: string): boolean {
  const lower = phrase.toLowerCase()
  const words = lower.split(/\s+/).filter(Boolean)
  if (!words.length) return false
  if (words.some((w) => BRAND_TOKENS.includes(w))) return true

  const hasVacancy = words.some((w) => VACANCY_TOKENS.includes(w))
  const workAtEdge = WORK_TOKENS.includes(words[0]) || WORK_TOKENS.includes(words[words.length - 1])
  if (!hasVacancy && !workAtEdge) return false

  return !INFO_MARKERS.some((m) => lower.includes(m))
}

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9]+/g, ' ')
    .trim()

/**
 * Фразы в коридоре, за вычетом занятого нами и листинговых запросов.
 * exclude — ключи, которые уже кому-то принадлежат: посадочным, живым темам
 * батча, опубликованным статьям.
 */
export function buildPhrasePool(
  seeds: Record<string, Seed>,
  exclude: string[] = [],
  limit = 150
): PoolPhrase[] {
  const taken = new Set(exclude.map(normalize))
  const pool = new Map<string, number>()

  const offer = (phrase: string, volume: number, owned: boolean) => {
    if (owned || !inCorridor(volume)) return
    if (isListingIntent(phrase) || taken.has(normalize(phrase))) return
    const known = pool.get(phrase)
    if (known === undefined || volume > known) pool.set(phrase, volume)
  }

  for (const [seed, data] of Object.entries(seeds)) {
    offer(seed, data.volume, Boolean(data.relevantUrl))
    for (const n of data.nested ?? []) offer(n.phrase, n.count, false)
  }

  return [...pool]
    .map(([phrase, volume]) => ({ phrase, volume }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit)
}

export function loadPhrasePool(file: string, exclude: string[] = [], limit = 150): PoolPhrase[] {
  if (!fs.existsSync(file)) {
    console.warn(`[pool] Замеры Вордстата не найдены: ${file}. Аналитик пойдёт без пула.`)
    return []
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as { seeds?: Record<string, Seed> }
  return buildPhrasePool(raw.seeds ?? {}, exclude, limit)
}

export function renderPoolBlock(pool: PoolPhrase[]): string {
  if (!pool.length) return ''
  return (
    `\nПУЛ ЗАМЕРЕННЫХ ФРАЗ (Яндекс.Вордстат, все уже в коридоре ${MIN_WORDSTAT_VOLUME}-${MAX_WORDSTAT_VOLUME}/мес).\n` +
    `Бери ключи ОТСЮДА. Цифра рядом с фразой — это замер, а не оценка, поэтому взятая\n` +
    `из пула тема гарантированно проходит гейт частотности. Придумывать ключ сам можно\n` +
    `только если в пуле нет ничего по нужной теме — и тогда так и напиши в поле source.\n` +
    pool.map((p) => `- ${p.phrase} — ${p.volume.toLocaleString('ru-RU')}/мес`).join('\n')
  )
}
