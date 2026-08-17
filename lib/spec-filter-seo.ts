import fs from 'fs'
import path from 'path'
import { SPEC_SLUGS, isFilterSlug } from './spec-filter-meta'

// SEO-контент лендингов спецификация×фильтр хранится в content/landings/{spec}-{filter}.json.
// Статический import невозможен (имена файлов динамические), поэтому читаем через
// fs.readFileSync при первом обращении и кэшируем в памяти модуля.

export interface SpecFilterContent {
  seoText: string
  faqItems: Array<{ question: string; answer: string }>
}

const LANDINGS_DIR = path.join(process.cwd(), 'content', 'landings')

const cache = new Map<string, SpecFilterContent | null>()

export function getSpecFilterSeo(specSlug: string, filterSlug: string): SpecFilterContent | null {
  // Whitelist-валидация слагов (приходят из URL) — защита от path traversal
  if (!SPEC_SLUGS.includes(specSlug) || !isFilterSlug(filterSlug)) return null

  const key = `${specSlug}-${filterSlug}`
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  let content: SpecFilterContent | null = null
  try {
    const raw = fs.readFileSync(path.join(LANDINGS_DIR, `${key}.json`), 'utf-8')
    const parsed = JSON.parse(raw) as SpecFilterContent
    if (typeof parsed.seoText !== 'string' || !Array.isArray(parsed.faqItems)) {
      throw new Error(`невалидная структура ${key}.json`)
    }
    content = parsed
  } catch (e) {
    // Все 72 файла обязаны существовать: молчаливая потеря = лендинг без SEO-текста и FAQ
    console.error(`[spec-filter-seo] не удалось загрузить лендинг ${key}:`, e)
    content = null
  }

  cache.set(key, content)
  return content
}
