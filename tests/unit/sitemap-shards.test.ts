import {
  SITEMAP_BASE_URL,
  SITEMAP_SHARDS,
  SITEMAP_SHARD_IDS,
  isKnownShard,
  renderSitemapIndex,
  shardUrl,
} from '../../lib/sitemap/shards'

describe('список шардов', () => {
  it('описывает три шарда с последовательными id', () => {
    expect(SITEMAP_SHARD_IDS).toEqual([0, 1, 2])
    expect(SITEMAP_SHARDS).toHaveLength(3)
  })

  it('у каждого шарда есть описание содержимого', () => {
    for (const s of SITEMAP_SHARDS) {
      expect(s.contains.length).toBeGreaterThan(0)
    }
  })

  it('строит адрес шарда так же, как их отдаёт Next', () => {
    expect(shardUrl(0)).toBe('https://d-pub.ru/sitemap/0.xml')
    expect(shardUrl(2)).toBe('https://d-pub.ru/sitemap/2.xml')
  })
})

describe('isKnownShard', () => {
  it('признаёт заявленные шарды', () => {
    expect(isKnownShard(0)).toBe(true)
    expect(isKnownShard(1)).toBe(true)
    expect(isKnownShard(2)).toBe(true)
  })

  // Регрессия: /sitemap/3.xml отдавал 226 адресов — полную копию нулевого
  // шарда, потому что «остальное» проваливалось в его ветку.
  it('не признаёт шард, которого нет в списке', () => {
    expect(isKnownShard(3)).toBe(false)
    expect(isKnownShard(-1)).toBe(false)
    expect(isKnownShard(99)).toBe(false)
  })

  it('не признаёт нечисловой id', () => {
    expect(isKnownShard(Number('abc'))).toBe(false)
  })
})

describe('renderSitemapIndex', () => {
  const xml = renderSitemapIndex(new Date('2026-08-22T18:00:00.000Z'))

  it('это валидный sitemapindex, а не urlset', () => {
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain('</sitemapindex>')
    expect(xml).not.toContain('<urlset')
  })

  it('перечисляет ровно те шарды, что заявлены', () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs).toEqual(SITEMAP_SHARDS.map((s) => shardUrl(s.id)))
  })

  it('проставляет lastmod каждому шарду', () => {
    const mods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1])
    expect(mods).toHaveLength(SITEMAP_SHARDS.length)
    expect(mods.every((m) => m === '2026-08-22T18:00:00.000Z')).toBe(true)
  })

  it('все адреса абсолютные и на нашем домене', () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs.every((l) => l.startsWith(`${SITEMAP_BASE_URL}/`))).toBe(true)
  })
})
