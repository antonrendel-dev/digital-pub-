import fs from 'fs'
import path from 'path'

/**
 * Маршрут, который читает базу, не имеет права пререндериться статически.
 *
 * Раннер GitHub Actions не видит продакшн-базу: хост внутренний. Любая
 * страница со статическим списком слагов и данными из Payload собирается
 * пустой и уезжает на прод готовым артефактом — а `revalidate = N` раздаёт
 * этот пустой файл всем ещё N секунд после деплоя. Деплой у нас ежедневный,
 * так что в это окно раз за разом попадал поисковый робот.
 *
 * Так потеряли /sitemap/1.xml и /sitemap/2.xml 23.08.2026 (0 URL в
 * Вебмастере при 1333 живых адресах) и, судя по всему, весь раздел /tools:
 * 16 страниц из 18 не набрали ни клика за квартал.
 *
 * Правило: либо маршрут динамический (нет generateStaticParams или стоит
 * force-dynamic), либо у него есть статический запасной контент, который
 * переживает отсутствие базы.
 */

const APP_DIR = path.join(process.cwd(), 'app')

// Долг, заведённый отдельными задачами. Список только сокращается: строка
// уходит отсюда, когда маршрут переводят на динамический рендер.
const KNOWN_DEBT = [
  // Статьи: текст лежит в MDX и рендерится без базы, Payload здесь только
  // запасной путь для карточек, заведённых через админку. Пустого артефакта
  // не бывает — на прод уезжает полноценный текст.
  path.join('app', '(main)', 'articles', '[slug]', 'page.tsx'),
]

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else if (entry.name === 'page.tsx' || entry.name === 'route.ts') acc.push(full)
  }
  return acc
}

describe('маршруты с данными из базы не пекутся статически', () => {
  it('generateStaticParams не соседствует с чтением Payload', () => {
    const offenders: string[] = []

    for (const file of walk(APP_DIR)) {
      const src = fs.readFileSync(file, 'utf8')
      const prerenders = /export (async )?function generateStaticParams/.test(src)
      if (!prerenders) continue
      if (/export const dynamic = 'force-dynamic'/.test(src)) continue

      const readsDb = /getPostsBy|getPayload|from '@\/lib\/posts'/.test(src)
      if (!readsDb) continue

      const relative = path.relative(process.cwd(), file)
      if (KNOWN_DEBT.includes(relative)) continue
      offenders.push(relative)
    }

    expect(offenders).toEqual([])
  })

  it('список известного долга не растёт молча', () => {
    // Если строку из KNOWN_DEBT удалили, а маршрут не починили, первый тест
    // это поймает. Здесь ловим обратное: файл переименовали или удалили, а
    // запись осталась — и страж молча перестал сторожить.
    for (const relative of KNOWN_DEBT) {
      expect(fs.existsSync(path.join(process.cwd(), relative))).toBe(true)
    }
  })
})
