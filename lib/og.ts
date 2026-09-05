import crypto from 'crypto'
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
 * Склонение существительного при числе: «1 вакансия», «2 вакансии», «5 вакансий».
 * Нужно в подписи карточки — «347 резюме» без склонения выглядит как машинный вывод.
 */
export function ruPlural(n: number, forms: [string, string, string]): string {
  const mod100 = Math.abs(n) % 100
  const mod10 = mod100 % 10
  if (mod100 >= 11 && mod100 <= 14) return forms[2]
  if (mod10 === 1) return forms[0]
  if (mod10 >= 2 && mod10 <= 4) return forms[1]
  return forms[2]
}

/**
 * Подпись параметров картинки (аудит 04.09.2026, S19). Без неё /api/og рисовал
 * нашу карточку с любым текстом из query — чужой заголовок под брендом d-pub.ru
 * одной ссылкой.
 *
 * Секрет обязан быть одним и тем же при сборке и в рантайме: подписи попадают
 * в пререндеренные страницы (generateStaticParams у статей, профессий,
 * инструментов), а проверяет их сервер. На проде это так: deploy.yml кладёт
 * один PAYLOAD_SECRET и в окружение next build, и в etc/environment. Отсюда два
 * правила: OG_SIGNING_SECRET, если заводить, ставить в обоих местах сразу;
 * ротация секрета требует пересборки — до неё пререндеренные подписи не
 * сойдутся и картинки будут 404 до ближайшей ревалидации страницы.
 * Ключ HMAC выводится из секрета, а не равен ему: секрет Payload нужен для
 * JWT и шифрования, подписи картинок — другое назначение.
 * Без секрета (локальная сборка без .env) подписи нет — и роут отвечает 404.
 */
const OG_SIG_RE = /^[0-9a-f]{32}$/

let cachedKey: { secret: string; key: Buffer } | null = null

function ogKey(): Buffer | null {
  const secret = process.env.OG_SIGNING_SECRET || process.env.PAYLOAD_SECRET
  if (!secret) return null
  if (cachedKey?.secret !== secret) {
    cachedKey = {
      secret,
      key: crypto.createHmac('sha256', secret).update('d-pub og-image v1').digest(),
    }
  }
  return cachedKey.key
}

export function ogSignature(params: {
  title: string
  kind?: string
  subtitle?: string
}): string | null {
  const key = ogKey()
  if (!key) return null
  // JSON-массив вместо склейки через разделитель: поля с переносом строки
  // не перетекают друг в друга (ревью S19).
  return crypto
    .createHmac('sha256', key)
    .update(JSON.stringify([params.kind ?? '', params.title, params.subtitle ?? '']))
    .digest('hex')
    .slice(0, 32)
}

/** Проверка в роуте: подпись обязана быть в формате 32 hex и совпадать по константному времени. */
export function verifyOgSignature(
  params: { title: string; kind?: string; subtitle?: string },
  sig: string | null
): boolean {
  if (!sig || !OG_SIG_RE.test(sig)) return false
  const expected = ogSignature(params)
  if (!expected) return false
  return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
}

/** База адреса картинки: на staging — staging, иначе og:image вёл бы на прод с чужой подписью. */
function ogBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SERVER_URL || 'https://d-pub.ru').replace(/\/+$/, '')
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
  const sig = ogSignature(params)
  if (sig) q.set('sig', sig)
  return `${ogBaseUrl()}/api/og?${q.toString()}`
}
