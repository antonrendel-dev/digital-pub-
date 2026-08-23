import fs from 'fs'
import path from 'path'
import {
  OG_KINDS,
  OG_SIZE,
  OG_TITLE_LIMIT,
  clampOgTitle,
  loadOgFonts,
  ogImageUrl,
  ogKindLabel,
  ogTitleFontSize,
  ruPlural,
} from '../../lib/og'

describe('clampOgTitle', () => {
  it('короткий заголовок не трогает', () => {
    expect(clampOgTitle('Вакансии SMM-менеджера')).toBe('Вакансии SMM-менеджера')
  })

  it('схлопывает переносы и лишние пробелы', () => {
    expect(clampOgTitle('  Резюме\n\nтаргетолога  ')).toBe('Резюме таргетолога')
  })

  it('длинный режет по границе слова и ставит многоточие', () => {
    const long =
      'Резюме SMM-специалиста и SMM-менеджера: шаблон, образец и типичные ошибки, из-за которых HR отказывает'
    const out = clampOgTitle(long)
    expect(out.length).toBeLessThanOrEqual(OG_TITLE_LIMIT + 1)
    expect(out.endsWith('…')).toBe(true)

    // Слово не разорвано: то, что осталось, — префикс исходника, и обрыв
    // пришёлся ровно на границу слова, а не на середину.
    const kept = out.slice(0, -1)
    expect(long.startsWith(kept)).toBe(true)
    expect(long[kept.length]).toBe(' ')
  })

  it('пустой заголовок заменяет осмысленным, а не пустотой', () => {
    expect(clampOgTitle(null)).toBe('Вакансии и резюме для digital-специалистов')
    expect(clampOgTitle('   ')).toBe('Вакансии и резюме для digital-специалистов')
  })
})

describe('ogTitleFontSize', () => {
  it('короткому заголовку даёт крупный кегль', () => {
    expect(ogTitleFontSize('Вакансии SMM')).toBe(64)
  })

  it('длинному — мельче, чтобы влез', () => {
    expect(ogTitleFontSize('я'.repeat(50))).toBe(54)
    expect(ogTitleFontSize('я'.repeat(80))).toBe(46)
  })

  it('кегль не растёт с длиной', () => {
    const sizes = [10, 40, 41, 65, 66, 120].map((n) => ogTitleFontSize('я'.repeat(n)))
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1])
  })
})

describe('ogKindLabel', () => {
  it('переводит известные разделы', () => {
    expect(ogKindLabel('article')).toBe(OG_KINDS.article)
    expect(ogKindLabel('vacancy')).toBe(OG_KINDS.vacancy)
    expect(ogKindLabel('resume')).toBe(OG_KINDS.resume)
  })

  // kind приходит из query, то есть значение чужое. В картинку оно попадает
  // только через словарь, поэтому подставить туда произвольный текст нельзя.
  it('на чужое значение отдаёт запасную метку, а не сам ввод', () => {
    expect(ogKindLabel('<script>alert(1)</script>')).toBe(OG_KINDS.page)
    expect(ogKindLabel(null)).toBe(OG_KINDS.page)
    expect(ogKindLabel('')).toBe(OG_KINDS.page)
  })
})

describe('ogImageUrl', () => {
  it('собирает абсолютный адрес с экранированными параметрами', () => {
    const url = ogImageUrl({
      title: 'Таргетолог, удалённо',
      kind: 'vacancy',
      subtitle: 'от 90 000 ₽',
    })
    expect(url.startsWith('https://d-pub.ru/api/og?')).toBe(true)
    const q = new URL(url).searchParams
    expect(q.get('title')).toBe('Таргетолог, удалённо')
    expect(q.get('kind')).toBe('vacancy')
    expect(q.get('subtitle')).toBe('от 90 000 ₽')
  })

  it('необязательные параметры не подставляет пустыми', () => {
    const q = new URL(ogImageUrl({ title: 'Статья' })).searchParams
    expect(q.has('kind')).toBe(false)
    expect(q.has('subtitle')).toBe(false)
  })
})

describe('шрифты', () => {
  it('отдаёт обычное и жирное начертание', () => {
    const fonts = loadOgFonts()
    expect(fonts.map((f) => f.weight).sort()).toEqual([400, 700])
    expect(fonts.every((f) => f.data.length > 0)).toBe(true)
  })

  it('кэширует чтение с диска', () => {
    expect(loadOgFonts()).toBe(loadOgFonts())
  })

  // Регрессия: в Liberation Sans нет знака рубля, и satori на подписи
  // «от 90 000 ₽» уходил за шрифтом в Google Fonts, получал 400 и рисовал
  // пустое место. Шрифт обязан покрывать кириллицу и валютные знаки сам.
  it('шрифт покрывает кириллицу, ё и знак рубля', () => {
    const data = loadOgFonts()[0].data
    const codepoints = readCmapCodepoints(data)
    for (const ch of ['А', 'я', 'Ё', 'ё', '₽', '—', '·']) {
      expect(codepoints.has(ch.codePointAt(0) as number)).toBe(true)
    }
  })
})

describe('размер картинки', () => {
  it('соответствует требованию задачи 04 — 1200×630', () => {
    expect(OG_SIZE).toEqual({ width: 1200, height: 630 })
  })
})

/**
 * Минимальный разбор таблицы cmap: нам нужен только набор кодовых точек,
 * тянуть ради этого зависимость смысла нет.
 */
function readCmapCodepoints(buf: Buffer): Set<number> {
  const out = new Set<number>()
  const numTables = buf.readUInt16BE(4)
  let cmapOffset = 0
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16
    if (buf.toString('ascii', rec, rec + 4) === 'cmap') cmapOffset = buf.readUInt32BE(rec + 8)
  }
  if (!cmapOffset) return out

  const numSub = buf.readUInt16BE(cmapOffset + 2)
  for (let i = 0; i < numSub; i++) {
    const rec = cmapOffset + 4 + i * 8
    const sub = cmapOffset + buf.readUInt32BE(rec + 4)
    if (buf.readUInt16BE(sub) !== 4) continue // формат 4 покрывает BMP, этого хватает

    const segX2 = buf.readUInt16BE(sub + 6)
    const endBase = sub + 14
    const startBase = endBase + segX2 + 2
    for (let s = 0; s < segX2 / 2; s++) {
      const end = buf.readUInt16BE(endBase + s * 2)
      const start = buf.readUInt16BE(startBase + s * 2)
      if (start === 0xffff) continue
      for (let c = start; c <= end && c !== 0xffff; c++) out.add(c)
    }
  }
  return out
}

describe('ruPlural', () => {
  const forms: [string, string, string] = ['вакансия', 'вакансии', 'вакансий']

  it('склоняет по последней цифре', () => {
    expect(ruPlural(1, forms)).toBe('вакансия')
    expect(ruPlural(3, forms)).toBe('вакансии')
    expect(ruPlural(7, forms)).toBe('вакансий')
    expect(ruPlural(21, forms)).toBe('вакансия')
    expect(ruPlural(42, forms)).toBe('вакансии')
  })

  it('одиннадцать–четырнадцать — исключение', () => {
    for (const n of [11, 12, 13, 14, 111, 112]) expect(ruPlural(n, forms)).toBe('вакансий')
  })

  it('ноль — родительный падеж', () => {
    expect(ruPlural(0, forms)).toBe('вакансий')
  })
})

// Проверка 23.08.2026: карточки вакансий, резюме и статей на проде поголовно
// имеют собственную обложку, поэтому ветка с генерацией у них не срабатывает
// никогда. Общая og-image.png оставалась ровно там, где превью и делят чаще
// всего, — на категориях, тегах и страницах инструментов. Тест держит эти
// страницы на динамической карточке, чтобы правка не отъехала обратно.
describe('страницы-списки не откатываются на общую картинку', () => {
  const PAGES = [
    'app/(main)/vacancies/[category]/page.tsx',
    'app/(main)/resumes/tag/[tagSlug]/page.tsx',
    'app/(main)/articles/tag/[slug]/page.tsx',
    'app/(main)/tools/[toolSlug]/page.tsx',
  ]

  it.each(PAGES)('%s собирает og через ogImageUrl', (rel) => {
    const src = fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
    expect(src).toContain('ogImageUrl(')
    expect(src).not.toContain('og-image.png')
  })
})
