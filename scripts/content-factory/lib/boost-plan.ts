/**
 * Отбор и приёмка для дожима статей, стоящих в 11–30.
 *
 * Ключи из этого коридора уже закреплены за страницами: новая статья на тот же
 * запрос даст каннибализацию, а не рост. Значит работать надо с существующим
 * телом — а инструмента для этого в заводе не было вовсе, regen.ts вопреки
 * названию перегенерирует только картинки.
 *
 * Здесь всё, что можно проверить без запуска модели: кого брать в работу и как
 * понять, что переписанный текст не стало хуже исходного.
 */

/** Коридор позиций, ради которого всё затевается. */
export const BOOST_MIN_POSITION = 11
export const BOOST_MAX_POSITION = 30

export interface BoostCandidate {
  key: string
  position: number
  url: string
  slug: string
}

export interface RawRow {
  key: string
  position: number
  /** Целевой URL из Топвизора. Пустой — цель не назначена. */
  url: string
}

/**
 * Дожимать умеем только статьи: у них тело лежит в MDX и правится целиком.
 * У листингов и страниц инструментов текст живёт в коде рядом с рендером —
 * это другая задача и другой инструмент.
 */
export function slugFromArticleUrl(url: string): string | null {
  const m = url.match(/\/articles\/([a-z0-9-]+)\/?$/i)
  return m ? m[1] : null
}

export interface Selection {
  take: BoostCandidate[]
  /** Ключ в коридоре, но посадочная — не статья. Причина указана для отчёта. */
  skip: Array<{ key: string; position: number; url: string; why: string }>
}

export function selectCandidates(rows: RawRow[]): Selection {
  const take: BoostCandidate[] = []
  const skip: Selection['skip'] = []
  const seen = new Set<string>()

  for (const row of rows) {
    if (row.position < BOOST_MIN_POSITION || row.position > BOOST_MAX_POSITION) continue
    if (!row.url) {
      skip.push({ ...row, why: 'нет целевого URL в Топвизоре' })
      continue
    }
    const slug = slugFromArticleUrl(row.url)
    if (!slug) {
      skip.push({ ...row, why: 'посадочная не статья — тело лежит в коде, не в MDX' })
      continue
    }
    // Одна статья — один заход за прогон, даже если ключей на неё несколько.
    // Иначе второй заход перепишет то, что только что сделал первый.
    if (seen.has(slug)) {
      skip.push({ ...row, why: `статья ${slug} уже взята по другому ключу` })
      continue
    }
    seen.add(slug)
    take.push({ key: row.key, position: row.position, url: row.url, slug })
  }

  // Сначала те, кто ближе к топ-10: короче путь, быстрее видно результат.
  take.sort((a, b) => a.position - b.position)
  return { take, skip }
}

/** Разбор вывода `topvisor.mjs --range=11-30 --tsv`: ключ, позиция, целевой URL. */
export function parseRows(tsv: string): RawRow[] {
  const rows: RawRow[] = []
  for (const line of tsv.split('\n')) {
    const parts = line.split('\t')
    if (parts.length < 2) continue
    const position = Number(parts[1])
    if (!parts[0] || !Number.isFinite(position)) continue
    rows.push({ key: parts[0].trim(), position, url: (parts[2] ?? '').trim() })
  }
  return rows
}

/**
 * Есть ли ключ в отрывке — с поправкой на русский язык.
 *
 * Буквальное вхождение здесь не работает: ключ «резюме контент менеджера»
 * в живом тексте выглядит как «резюме контент-менеджера», а в заголовке — как
 * «Резюме контент-менеджера: шаблон». Дефис, падеж и ё против е ломают строгое
 * сравнение, и первый же боевой прогон 02.09.2026 отклонил нормальную работу
 * модели именно по этой причине.
 *
 * Сравниваем по основам, см. stem(). Пять символов оказались слишком коротко —
 * «резюме контекстолога и менеджмента» проходило как «резюме контент
 * менеджера» (ревью 02.09.2026). Порядок не проверяем —
 * «зарплата seo специалиста» и «seo специалист: зарплата» одинаково хороши.
 */
function stem(word: string): string {
  // Шесть символов режут окончания длинных слов («удалённая» → «удален») и при
  // этом различают разные корни («контент» против «контекстолога»). Короткие
  // теряют последнюю букву, иначе «работа» не найдётся в «работу».
  if (word.length > 6) return word.slice(0, 6)
  if (word.length > 4) return word.slice(0, word.length - 1)
  return word
}

export function containsKey(text: string, key: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/[-–—]/g, ' ')
  const haystack = norm(text)
  return norm(key)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(stem(word)))
}

export interface RewriteViolation {
  rule: string
  detail: string
}

const words = (text: string) =>
  text
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length

/** Заголовки любого уровня — по ним видно, не выбросил ли агент структуру. */
const headings = (text: string) => (text.match(/^#{2,3}\s+.+$/gm) ?? []).length

/**
 * Приёмка переписанного тела. Модель просят усилить статью под ключ, а не
 * сократить её: любая потеря объёма или структуры здесь — регресс, потому что
 * страница уже стоит в 11–30 и терять ей есть что.
 */
export function validateRewrite(before: string, after: string, key: string): RewriteViolation[] {
  const v: RewriteViolation[] = []
  const wBefore = words(before)
  const wAfter = words(after)

  if (wAfter < wBefore * 0.95) {
    v.push({
      rule: 'SHRANK',
      detail: `объём упал с ${wBefore} до ${wAfter} слов — дожим не должен сокращать статью`,
    })
  }
  const hBefore = headings(before)
  const hAfter = headings(after)
  if (hAfter < hBefore) {
    v.push({
      rule: 'LOST_HEADINGS',
      detail: `заголовков было ${hBefore}, стало ${hAfter} — структура потеряна`,
    })
  }
  // Картинки и внутренние ссылки объёму не видны: words() режет теги до
  // подсчёта, поэтому пропажа <img> не меняет ни слов, ни заголовков. Каждая
  // картинка — отдельный вызов Codex, а ссылки мы ставили руками.
  const imgs = (s: string) => (s.match(/<img\s/g) ?? []).length
  const links = (s: string) => (s.match(/\]\(\//g) ?? []).length
  if (imgs(after) < imgs(before)) {
    v.push({
      rule: 'LOST_IMAGES',
      detail: `картинок было ${imgs(before)}, стало ${imgs(after)}`,
    })
  }
  if (links(after) < links(before)) {
    v.push({
      rule: 'LOST_LINKS',
      detail: `внутренних ссылок было ${links(before)}, стало ${links(after)}`,
    })
  }
  // Ключ должен стоять там, где его читает поиск: в заголовке или в первых
  // 60 словах. Просто «встречается в тексте» сигналом не является.
  const firstWords = after.split(/\s+/).slice(0, 60).join(' ')
  const inHeading = (after.match(/^#{2,3}\s+.+$/gm) ?? []).some((h) => containsKey(h, key))
  if (!inHeading && !containsKey(firstWords, key)) {
    v.push({
      rule: 'KEY_NOT_PLACED',
      detail: `ключ «${key}» не стоит ни в заголовке, ни в первых 60 словах`,
    })
  }
  return v
}

/** Frontmatter и тело. Бросает, если файл не похож на статью. */
export function splitMdx(raw: string): { frontmatter: string; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/)
  if (!m) throw new Error('во главе файла нет frontmatter')
  return { frontmatter: m[1], body: raw.slice(m[0].length) }
}

export function field(frontmatter: string, name: string): string {
  return frontmatter.match(new RegExp(`^${name}: "(.*)"$`, 'm'))?.[1] ?? ''
}

/**
 * Дата изменения — и в поле, и внутри schemaJsonLd.
 *
 * Article-разметка уходит в прод прямо из фронтматтера, поэтому обновить одно
 * поле мало: страница переписана сегодня, а поисковику сообщается июльская
 * дата. Дожим существует ради свежести сигнала и гасил бы единственный, что
 * может выставить сам (ревью 02.09.2026).
 */
export function withUpdatedDate(frontmatter: string, isoDate: string): string {
  let next = frontmatter.replace(/^dateModified: ".*"$/m, `dateModified: "${isoDate}"`)
  if (!/^dateModified:/m.test(next)) next += `\ndateModified: "${isoDate}"`
  return next.replace(/("dateModified":")[^"]*(")/g, `$1${isoDate}$2`)
}
