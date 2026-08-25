import fs from 'fs'
import path from 'path'

/**
 * Маршрут, читающий базу, обязан объявить revalidate или dynamic.
 *
 * У раннера GitHub Actions нет доступа к продакшн-базе — в логе сборки
 * `getaddrinfo ENOTFOUND postgres.***.h2`. Маршрут без этого объявления
 * пререндерится на сборке с пустым результатом, и пустой артефакт уезжает
 * на прод готовым. Дальше его раздают всем, включая поискового робота.
 *
 * Ловилось дважды за три дня:
 *   23.08.2026 — /sitemap/1.xml и /sitemap/2.xml показывали 0 URL
 *                в Вебмастере при 1 333 и 347 живых адресах;
 *   25.08.2026 — карточки профессий отдавали «сейчас нет открытых вакансий»
 *                при 142 живых вакансиях видеомонтажёра.
 *
 * Оба раза правило было записано в памяти проекта (project_ci_no_db) и оба
 * раза не сработало: память читается в начале сессии, а нарушается через
 * несколько часов работы. Поэтому правило продублировано тестом и хуком
 * .claude/hooks/memory-rules.sh — они не забывают.
 */

const APP_DIR = path.join(process.cwd(), 'app')

/** Признаки того, что модуль обращается к базе на этапе рендера. */
const DB_MARKERS =
  /getPayload|payload\.find|getPostsBy|getVacancySitemapEntries|getResumeSitemapEntries/

/** Объявление, снимающее статический пререндер. */
const OPT_OUT = /^export const (revalidate|dynamic)\b/m

function collectRoutes(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collectRoutes(full, acc)
    } else if (/^(page|sitemap)\.tsx?$/.test(entry.name)) {
      // Route handlers (app/api/**) не проверяем: в Next 15 они динамические
      // по умолчанию, статического пререндера с пустой базой там не возникает.
      acc.push(full)
    }
  }
  return acc
}

describe('маршруты, читающие базу', () => {
  const routes = collectRoutes(APP_DIR)

  it('в проекте вообще есть маршруты для проверки', () => {
    // Защита от молчаливого нуля: если сборщик путей сломается,
    // остальные проверки станут зелёными, ничего не проверяя.
    expect(routes.length).toBeGreaterThan(5)
  })

  it('каждый объявляет revalidate или dynamic', () => {
    const offenders: string[] = []
    for (const file of routes) {
      const src = fs.readFileSync(file, 'utf8')
      if (!DB_MARKERS.test(src)) continue
      if (OPT_OUT.test(src)) continue
      offenders.push(path.relative(process.cwd(), file))
    }
    expect(offenders).toEqual([])
  })

  it('хук с тем же правилом на месте и исполняем', () => {
    // Тест ловит на коммите, хук — в момент записи файла. Нужны оба:
    // хук даёт обратную связь сразу, тест не даёт обойти правило молча.
    const hook = path.join(process.cwd(), '.claude', 'hooks', 'memory-rules.sh')
    expect(fs.existsSync(hook)).toBe(true)
    expect(fs.readFileSync(hook, 'utf8')).toContain('project_ci_no_db')
    // eslint-disable-next-line no-bitwise
    expect(fs.statSync(hook).mode & 0o111).toBeGreaterThan(0)
  })
})
