/**
 * Превращение двух снапшотов в поводы для задач.
 *
 * Отдельный модуль без сети и записи на диск: сюда подаются два готовых
 * снапшота, обратно приходит список находок. Так логику можно гонять тестами
 * на выдуманных данных, не дожидаясь 30-го числа.
 *
 * Граница ответственности крона (решено 24.08.2026): здесь только ДОЖИМ
 * СДЕЛАННОГО — существующие страницы и отслеживаемые ключи. Всё, чего ещё нет,
 * ведёт ежедневный крон задач.
 */

/** Ключ упал не меньше чем на столько позиций — повод. */
const DROP_THRESHOLD = 5

/** Коридор «в шаге от топ-10»: дожать дешевле, чем брать новый запрос. */
const NEAR_TOP = [11, 30]

/** Просмотры страницы упали больше чем на столько процентов — повод. */
const PAGEVIEW_DROP_PCT = 50

/** Меньше этого числа просмотров — статистика слишком мелкая, шум. */
const PAGEVIEW_FLOOR = 10

/** Показов много, кликов нет — сниппет или интент мимо. */
const ZERO_CLICK_SHOWS = 30

/**
 * Статью заводим в задачу, только если она уже собирает людей: править то,
 * куда никто не заходит, — тратить время на догадки вместо фактов.
 */
const ARTICLE_MIN_VISITS = 10
/** Ниже этой доли прочтения статью не читают, а закрывают. */
const ARTICLE_READ_SHARE = 0.15
/** Столько секунд не хватит ни на какую статью. */
const ARTICLE_MIN_SECONDS = 30

/**
 * Вес находки «отвечает не та страница» растёт с показами.
 *
 * Жёсткий порог тут не работает: на молодом домене у половины расхождений
 * один-два показа, и отсечка в пять штук молча съедала бы их целиком — на
 * прогоне 30.08.2026 из двух реальных расхождений не прошло ни одного.
 * Поэтому засчитываем любую известную связку, но дешёвую находку наверх
 * доски не пускаем: балл спроса растёт от показов и упирается в потолок.
 */
const wrongPageDemand = (shows: number): number => Math.min(25, 5 + Math.floor(shows / 10))

export interface Snapshot {
  collectedAt?: string
  topvisor?: {
    ok: boolean
    data?: {
      positions?: Record<string, number | null>
      /** Целевой URL ключа — какая страница ДОЛЖНА отвечать. */
      targets?: Record<string, string>
    }
  }
  metrika?: { ok: boolean; data?: { topPages?: Array<{ path: string; pageviews: number }> } }
  webmaster?: {
    ok: boolean
    data?: {
      queries?: Array<{ query: string; shows: number; clicks: number }>
      /** Какую страницу Яндекс считает ответом на запрос. */
      pages?: Record<string, { url: string; shows: number }>
    }
  }
  articles?: {
    ok: boolean
    data?: {
      rows?: Array<{
        slug: string
        visits: number
        seconds: number
        share: number
        position: number | null
        leftPage: boolean
      }>
    }
  }
}

export interface Score {
  s: number
  g: number
  r: number
  a: number
  total: number
}

export interface Finding {
  type:
    | 'left-top10'
    | 'position-drop'
    | 'near-top10'
    | 'pageviews-drop'
    | 'zero-clicks'
    | 'wrong-page'
    | 'article-not-read'
    | 'article-not-ranked'
  key: string
  title: string
  detail: string
  /** Стабильный ключ, по которому находка узнаётся в уже заведённых задачах. */
  dedupKey: string
  score: Score
}

/**
 * Позиция в снапшоте: число, либо null для «дальше сотни».
 * null сравнивать напрямую нельзя — считаем его как 101, иначе выход из топа
 * выглядит как улучшение.
 */
const pos = (v: unknown): number => (typeof v === 'number' ? v : 101)
const known = (v: unknown): v is number => typeof v === 'number'

function scoreOf(s: number, g: number, r: number, a: number): Score {
  return { s, g, r, a, total: s + g + r + a }
}

export function buildFindings(prev: Snapshot, curr: Snapshot): Finding[] {
  const out: Finding[] = []
  const prevPos = prev?.topvisor?.ok ? (prev.topvisor.data?.positions ?? {}) : {}
  const currPos = curr?.topvisor?.ok ? (curr.topvisor.data?.positions ?? {}) : {}

  for (const [key, raw] of Object.entries(currPos)) {
    const now = pos(raw)
    const was = pos(prevPos[key])
    const hadBefore = Object.prototype.hasOwnProperty.call(prevPos, key)

    // Выпадение из топ-10 — самое дорогое, что может случиться с готовой страницей.
    if (hadBefore && known(prevPos[key]) && was <= 10 && now > 10) {
      out.push({
        type: 'left-top10',
        key,
        title: `Ключ «${key}» вышел из топ-10: ${was} → ${known(raw) ? now : '>100'}`,
        detail:
          `Страница по этому запросу уже была в десятке, значит контент и структура ` +
          `работали. Разобраться, что изменилось: конкурент, каннибализация или правка на нашей стороне.`,
        dedupKey: `left-top10:${key}`,
        score: scoreOf(20, 20, 0, 18),
      })
      continue
    }

    // Заметное падение внутри топ-100.
    if (hadBefore && known(prevPos[key]) && known(raw) && now - was >= DROP_THRESHOLD) {
      out.push({
        type: 'position-drop',
        key,
        title: `Ключ «${key}» просел на ${now - was}: ${was} → ${now}`,
        detail: `Падение внутри топ-100. Проверить страницу, свежесть данных и перелинковку.`,
        dedupKey: `position-drop:${key}`,
        score: scoreOf(12, 18, 0, 18),
      })
      continue
    }

    // Кандидат на дожим: новыми статьями это не лечится, ключ уже закреплён
    // за страницей, вторая даст каннибализацию.
    if (known(raw) && now >= NEAR_TOP[0] && now <= NEAR_TOP[1]) {
      out.push({
        type: 'near-top10',
        key,
        title: `Ключ «${key}» на ${now} — кандидат на дожим`,
        detail:
          `В коридоре ${NEAR_TOP[0]}–${NEAR_TOP[1]} прирост даёт переписывание существующей ` +
          `страницы: объём, вхождения, FAQ, перелинковка. Новая статья только поделит выдачу.`,
        dedupKey: `near-top10:${key}`,
        score: scoreOf(18, 15, 0, 18),
      })
    }
  }

  // Статьи: пересечение позиции и глубины чтения говорит, что чинить.
  // В задачи идут только те, у кого есть трафик, — иначе доска заполнится
  // статьями, о которых нечего сказать, кроме «их никто не видел».
  for (const a of curr?.articles?.ok ? (curr.articles.data?.rows ?? []) : []) {
    if (a.visits < ARTICLE_MIN_VISITS) continue
    const read = a.seconds >= ARTICLE_MIN_SECONDS && a.share >= ARTICLE_READ_SHARE
    const inTop = a.position !== null && a.position <= 10
    const percent = Math.round(Math.min(a.share, 1) * 100)

    if (inTop && !read) {
      out.push({
        type: 'article-not-read',
        key: a.slug,
        title: `Статья «${a.slug}» на ${a.position} месте, но её не читают`,
        detail:
          `${a.visits} визитов за 90 дней, прочитывают ${percent}% текста. ` +
          `Позиция есть, значит заголовок работает — проблема в самом тексте: ` +
          `первый экран не отвечает на запрос, структура не держит или объём ` +
          `не соответствует обещанию. Правится переписыванием, не ключами.`,
        dedupKey: `article-not-read:${a.slug}`,
        score: scoreOf(16, 18, 8, 16),
      })
    } else if (!inTop && read) {
      out.push({
        type: 'article-not-ranked',
        key: a.slug,
        title: `Статью «${a.slug}» читают на ${percent}%, но её нет в топ-10`,
        detail:
          `${a.visits} визитов за 90 дней. Текст удерживает — значит написан ` +
          `хорошо, а не находят его из-за заголовка и ключей. Подобрать ключ ` +
          `с частотностью от 300 и переписать title под него; текст не трогать.`,
        dedupKey: `article-not-ranked:${a.slug}`,
        score: scoreOf(18, 20, 6, 18),
      })
    }
  }

  // Просмотры страниц: обвал сделанного важнее ровного фона.
  const prevPages = new Map(
    (prev?.metrika?.ok ? (prev.metrika.data?.topPages ?? []) : []).map((p) => [p.path, p.pageviews])
  )
  for (const p of curr?.metrika?.ok ? (curr.metrika.data?.topPages ?? []) : []) {
    const before = prevPages.get(p.path)
    if (before == null || before < PAGEVIEW_FLOOR) continue
    const dropPct = Math.round(((before - p.pageviews) / before) * 100)
    if (dropPct >= PAGEVIEW_DROP_PCT) {
      out.push({
        type: 'pageviews-drop',
        key: p.path,
        title: `Просмотры ${p.path} упали на ${dropPct}%: ${before} → ${p.pageviews}`,
        detail: `Проверить индексацию, позиции по ключам страницы и не сломалась ли она.`,
        dedupKey: `pageviews-drop:${p.path}`,
        score: scoreOf(15, 18, 0, 18),
      })
    }
  }

  // Показы есть, кликов нет — работает сниппет, а не страница.
  for (const q of curr?.webmaster?.ok ? (curr.webmaster.data?.queries ?? []) : []) {
    if (q.shows >= ZERO_CLICK_SHOWS && q.clicks === 0) {
      out.push({
        type: 'zero-clicks',
        key: q.query,
        title: `«${q.query}»: ${q.shows} показов, ноль кликов`,
        detail:
          `Нас показывают, но не выбирают. Смотреть title и description страницы, ` +
          `которая ранжируется, и соответствие интенту.`,
        dedupKey: `zero-clicks:${q.query}`,
        score: scoreOf(10, 15, 0, 18),
      })
    }
  }

  // Отвечает не та страница, что назначена целью. Ровно тот случай, ради
  // которого целевые URL и проставлялись: без них каннибализацию приходится
  // разбирать вручную по каждому ключу.
  const targets = curr?.topvisor?.ok ? (curr.topvisor.data?.targets ?? {}) : {}
  const pages = curr?.webmaster?.ok ? (curr.webmaster.data?.pages ?? {}) : {}
  const strip = (u: string) => u.replace('https://d-pub.ru', '').replace(/\/$/, '') || '/'
  const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
  const factByQuery = new Map(Object.entries(pages).map(([q, v]) => [norm(q), v]))

  for (const [key, target] of Object.entries(targets)) {
    const fact = factByQuery.get(norm(key))
    if (!fact) continue
    const want = strip(target)
    const actual = strip(fact.url)
    if (want === actual) continue
    out.push({
      type: 'wrong-page',
      key,
      title: `«${key}»: отвечает ${actual}, а целью назначена ${want}`,
      detail:
        `Поиск выбрал другую страницу — ${fact.shows} показов на ${actual}. ` +
        `Либо целевая слабее своего же соседа и её надо усиливать, либо цель ` +
        `назначена неверно и править нужно разметку, а не страницу.`,
      dedupKey: `wrong-page:${key}`,
      score: scoreOf(wrongPageDemand(fact.shows), 20, 0, 18),
    })
  }

  return out.sort((a, b) => b.score.total - a.score.total)
}

/** Отсекаем то, на что уже заведена открытая задача. */
export function filterKnown(findings: Finding[], existingDedupKeys: Iterable<string>): Finding[] {
  const seen = new Set(existingDedupKeys)
  return findings.filter((f) => !seen.has(f.dedupKey))
}

export const THRESHOLDS = {
  DROP_THRESHOLD,
  NEAR_TOP,
  PAGEVIEW_DROP_PCT,
  PAGEVIEW_FLOOR,
  ZERO_CLICK_SHOWS,
}
