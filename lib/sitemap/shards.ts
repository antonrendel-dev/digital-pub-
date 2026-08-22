// Единый список шардов сайтмапа.
//
// До 22.08.2026 список жил в трёх местах: generateSitemaps() в app/sitemap.ts,
// перечень Sitemap: в app/robots.ts и — неявно — в ветвлении по id внутри
// самого sitemap(). Разъезжались они молча: robots перечислял 0, 1 и 2, а
// /sitemap/3.xml отдавал 226 URL, потому что «неизвестный id» проваливался в
// ветку нулевого шарда и дублировал его содержимое.
//
// Теперь список один, и всё остальное считается от него.

export const SITEMAP_BASE_URL = 'https://d-pub.ru'

export interface SitemapShard {
  id: number
  /** Что лежит в шарде — только для читателя кода, в выдачу не идёт. */
  contains: string
}

export const SITEMAP_SHARDS: readonly SitemapShard[] = [
  { id: 0, contains: 'статические страницы, статьи, теги, фильтровые лендинги' },
  { id: 1, contains: 'карточки вакансий' },
  { id: 2, contains: 'карточки резюме' },
] as const

export const SITEMAP_SHARD_IDS: readonly number[] = SITEMAP_SHARDS.map((s) => s.id)

/** Адрес шарда. Next отдаёт generateSitemaps как /sitemap/<id>.xml. */
export function shardUrl(id: number): string {
  return `${SITEMAP_BASE_URL}/sitemap/${id}.xml`
}

export function isKnownShard(id: number): boolean {
  return SITEMAP_SHARD_IDS.includes(id)
}

/**
 * Индексный файл. Порог из задачи 52 — 1000 URL — пройден: на замере 22.08.2026
 * в трёх шардах 1906 адресов. Поисковику отдаём один вход вместо трёх строк в
 * robots.txt, и при добавлении шарда править robots уже не нужно.
 *
 * lastmod ставим единый: шарды пересобираются одним ISR-циклом (revalidate 600),
 * и разводить им даты — значит обещать точность, которой у нас нет.
 */
export function renderSitemapIndex(lastModified: Date): string {
  const lastmod = lastModified.toISOString()
  const entries = SITEMAP_SHARDS.map(
    (s) =>
      `  <sitemap>\n    <loc>${shardUrl(s.id)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`
  ).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`
}
