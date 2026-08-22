import fs from 'fs'
import path from 'path'

// Шрифты лежат в public/, а не в app/fonts/, где живут шрифты интерфейса.
// Причина не в эстетике: деплой копирует на прод только .next/, lib/, public/,
// content/, scripts/ и миграции — каталог app/ туда не уезжает вовсе. Шрифт из
// app/fonts/ существовал бы локально и отсутствовал в продакшне, а падение
// вылезло бы не на сборке, а на первом запросе картинки.
//
// DejaVu Sans выбран по двум причинам. Первая: Geist в репозитории —
// вариативный woff, а satori вариативные шрифты не читает вовсе, падает на
// разборе таблицы глифов. Вторая: в Liberation Sans, первом кандидате, нет
// знака рубля — на подписи «от 90 000 ₽» satori молча уходил за шрифтом в
// Google Fonts, получал 400 и рисовал пустоту. Для сайта с зарплатами в каждой
// второй карточке это не мелочь, а исходящий запрос на каждый рендер.
const FONT_DIR = path.join(process.cwd(), 'public', 'fonts')

export const OG_SIZE = { width: 1200, height: 630 } as const

export interface OgFont {
  name: string
  data: Buffer
  style: 'normal'
  weight: 400 | 700
}

let cached: OgFont[] | null = null

/**
 * Шрифты читаются один раз на процесс: два файла суммарно на 1,4 МБ, а роут
 * вызывается на каждую карточку вакансии и статьи.
 */
export function loadOgFonts(): OgFont[] {
  if (cached) return cached
  cached = [
    {
      name: 'DejaVu',
      data: fs.readFileSync(path.join(FONT_DIR, 'DejaVuSans.ttf')),
      style: 'normal',
      weight: 400,
    },
    {
      name: 'DejaVu',
      data: fs.readFileSync(path.join(FONT_DIR, 'DejaVuSans-Bold.ttf')),
      style: 'normal',
      weight: 700,
    },
  ]
  return cached
}

/** Метки разделов. Ключ приходит из query — значение чужое, поэтому только словарь. */
export const OG_KINDS: Record<string, string> = {
  article: 'Статья',
  vacancy: 'Вакансия',
  resume: 'Резюме',
  page: 'Диджитал Паб',
}

export function ogKindLabel(kind: string | null): string {
  return OG_KINDS[kind ?? ''] ?? OG_KINDS.page
}

// Длинный заголовок в карточке не переносится бесконечно — он выдавливает
// подпись за нижнюю границу и превращает картинку в стену текста. Режем по
// словам, чтобы не рвать слово посередине, и добавляем многоточие.
export const OG_TITLE_LIMIT = 90

export function clampOgTitle(raw: string | null, limit = OG_TITLE_LIMIT): string {
  const title = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!title) return 'Вакансии и резюме для digital-специалистов'
  if (title.length <= limit) return title

  const cut = title.slice(0, limit)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/** Размер кегля под длину: короткий заголовок не должен теряться в пустоте. */
export function ogTitleFontSize(title: string): number {
  if (title.length <= 40) return 64
  if (title.length <= 65) return 54
  return 46
}

/**
 * Адрес динамической картинки. Ставится там, где раньше подставлялся общий
 * og-image.png: у вакансии без своего изображения и у статьи без обложки.
 * Свою картинку не вытесняет — обложка статьи всегда лучше сгенерированной.
 */
export function ogImageUrl(params: {
  title: string
  kind?: keyof typeof OG_KINDS
  subtitle?: string
}): string {
  const q = new URLSearchParams({ title: params.title })
  if (params.kind) q.set('kind', params.kind)
  if (params.subtitle) q.set('subtitle', params.subtitle)
  return `https://d-pub.ru/api/og?${q.toString()}`
}
