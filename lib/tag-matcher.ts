/**
 * Tag keyword matching — extracted from scripts/sync-telegram.ts so it can be
 * unit-tested in isolation.
 *
 * scripts/sync-telegram.ts has module-level side effects (reads bot .env,
 * invokes main()), so importing it from Jest is not safe. This module is
 * pure: no I/O, no top-level state. sync-telegram.ts re-imports from here.
 *
 * Behavior contract:
 *   - case-insensitive
 *   - word-boundary aware (Cyrillic-aware via punctuation/space check)
 *   - one match per tag (no duplicates in result)
 *   - returns tag slugs in TAG_KEYWORDS-iteration order
 *   - SPECIALIZATION tags matched against title + the role headline (first
 *     non-empty, non-hashtag line, cut at the employer preposition) — the title
 *     alone is just the channel's hashtag, while the whole body would tag every
 *     passing mention
 *   - FORMAT and LEVEL tags matched against full text
 *   - TOOL tags matched against full text (title + description)
 */

/** Slugs that represent the job specialization — matched against title only. */
export const SPEC_TAG_SLUGS = new Set([
  'smm',
  'seo',
  'dizajn',
  'marketing',
  'menedzher',
  'target',
  'razrabotka',
  'analitika',
  'finansy',
  'kreativ',
  'copywriting',
  'content',
  'head-of-seo',
  'videomontazher',
  'hr',
  'kontekstnaya-reklama',
])

/**
 * Tool-specific tag slugs — matched against full text (title + description).
 * Uses regex patterns to avoid false positives.
 */
export const TOOL_TAG_SLUGS: Record<string, RegExp> = {
  figma: /figma|фигм[аеы]/gi,
  canva: /canva|канв[аеы]/gi,
  tilda: /\btilda\b|\bтильд[аеы]\b/gi,
  'yandex-direct': /яндекс[\s.]?директ|яндекс\.директ|директолог/gi,
  // Excel отсюда убран 31.08.2026: он ловился и сюда, и в собственный раздел,
  // из-за чего выборки двух страниц пересекались на четверти объявлений.
  // Спрос разводит их однозначно — «вакансии excel» 525/мес против «вакансии
  // google таблицы» 15.
  tablicy: /google\s+таблиц|гугл\s+таблиц|google\s+sheets/gi,
}

export const TAG_KEYWORDS: Record<string, string[]> = {
  smm: [
    'smm',
    'смм',
    'соцсети',
    'social media',
    'инстаграм',
    'instagram',
    'smm менеджер',
    'смм менеджер',
    'smm-менеджер',
    'смм-менеджер',
    'сммщик',
    'риллс',
    'риллсмейкер',
    'рилсмейкер',
    'рилсы',
    'reels',
    'вконтакте',
    'телеграм',
  ],
  seo: [
    'seo',
    'сео специалист',
    'поисковая оптимизация',
    'продвижение сайт',
    'семантическое ядро',
    'wordstat',
    'вордстат',
    'seo-специалист',
    'seo специалист',
  ],
  dizajn: [
    'дизайн',
    'дизайнер',
    'designer',
    'figma',
    'фигма',
    'ui/ux',
    'ui ux',
    'ux/ui',
    'тильда',
    'tilda',
    'adobe',
    'иллюстратор',
    'illustrator',
    'photoshop',
    'фотошоп',
    'motion',
    'моушн',
  ],
  marketing: [
    'маркетинг',
    'маркетолог',
    'performance маркетинг',
    'performance marketing',
    'контент-маркетинг',
    'интернет-маркетинг',
    'digital маркетинг',
    'бренд-менеджер',
    'growth',
  ],
  menedzher: [
    'менеджер',
    'проджект',
    'project manager',
    'product manager',
    'менеджер проект',
    'менеджер продукт',
    'продакт менеджер',
    'тим лид',
    'team lead',
    'team_lead',
    'руководитель проект',
    'руководитель отдел',
    'amocrm',
    'bitrix24',
    'битрикс24',
    'crm',
  ],
  target: [
    'таргет',
    'таргетолог',
    'директ',
    'директа',
    'директу',
    'директе',
    'директом',
    'директолог',
    'контекстная реклама',
    'яндекс директ',
    'yandex direct',
    'яндекс.директ',
    'vk ads',
    'вк реклама',
    'mytarget',
    'my target',
    'ppc специалист',
    'контекст специалист',
  ],
  razrabotka: [
    'разработчик',
    'программист',
    'прогер',
    'developer',
    'frontend',
    'backend',
    'фулстек',
    'react',
    'python',
    'javascript',
    'битрикс',
    'битрикс24',
    'wordpress',
    'вордпресс',
    'верстальщик',
    'верстка',
    'opencart',
    'open cart',
    'joomla',
  ],
  analitika: ['аналитик', 'аналитика', 'analytics', 'data analyst', 'bi'],
  finansy: ['финанс', 'финансов', 'финансист', 'бухгалтер', 'экономист', 'бухучет', 'бухучёт'],
  hr: ['hr', 'эйчар', 'рекрутер', 'рекрутёр', 'рекрутинг', 'ресечер', 'ресёрчер', 'кадровик'],
  // Контекст живёт отдельно от таргета: это разные специализации и разные
  // запросы. Ключи, уже закреплённые за target («директ», «контекстная
  // реклама»), отсюда не забираем — вакансия может попасть в обе категории,
  // а разводить их в выдаче должны цели ключей в Топвизоре, не теги.
  'kontekstnaya-reklama': ['контекстолог', 'ppc', 'google ads', 'гугл адс', 'директолог'],
  kreativ: ['креатив', 'креативщик', 'creative', 'арт-директор', 'art director', 'артдирект'],
  copywriting: [
    'копирайтер',
    'копирайтинг',
    'copywriter',
    'copywriting',
    'автор текстов',
    'рерайтер',
    'рерайтинг',
    'редактор',
    'статьи',
    'копир',
  ],
  content: [
    'контент',
    'content',
    'контент-мейкер',
    'контент мейкер',
    'контентмейкер',
    'contentmaker',
    'content maker',
    'контент-стратег',
    'контент стратег',
    'посты',
  ],
  'head-of-seo': [
    'head of seo',
    'head seo',
    'руководитель seo',
    'руководитель отдела seo',
    'директор по seo',
    'head of поискового',
  ],
  videomontazher: [
    'видеомонтажёр',
    'видеомонтажер',
    'монтажёр',
    'монтажер',
    'video editor',
    'видеоредактор',
    'монтаж видео',
    'видеомонтаж',
  ],
  udalyonka: ['удалённо', 'удаленно', 'удалёнка', 'удаленка', 'remote', 'дистанционно'],
  ofis: ['офис', 'office', 'в офисе'],
  gibrid: ['гибрид', 'гибридный', 'hybrid'],
  junior: ['junior', 'джуниор', 'стажёр', 'стажер', 'начинающий'],
  middle: ['middle', 'мидл'],
  senior: ['senior', 'сеньор', 'ведущий', 'lead'],
}

/**
 * Роль в объявлении стоит первой строкой, после хештегов канала. Заголовок
 * поста её не даёт: title — это первый хештег («SMM», «CRM», «МЕНЕДЖЕР»),
 * а не должность, поэтому специализации не находились вовсе.
 *
 * Берём только первую непустую строку без хештега и отрезаем всё после
 * предлога места: в «Менеджер по продажам в SMM-Академию» специализация —
 * менеджер, а SMM здесь название работодателя. Вторую строку не берём: там
 * уже описание компании, и «Frontend-разработчик» из агентства с широким
 * профилем получал бы чужой тег. Весь текст тем более: упоминание роли в
 * требованиях — не вакансия этой роли, счёт по телу завышает её в разы.
 */
const EMPLOYER_PREPOSITION = /\s+(?:в|во|для|при)\s+/i

export function roleHeadline(body: string): string {
  const firstLine = body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('#'))
  return firstLine ? firstLine.split(EMPLOYER_PREPOSITION)[0] : ''
}

const isBoundary = (ch: string) => /[\s\.,;:!?\-—–()\/\[\]{}«»"'#@\n\r]/.test(ch)

/**
 * Русское слово в объявлении почти всегда склонено: ищут «дизайнера», а не
 * «дизайнер». Поэтому после кириллического ключа допускаем короткое окончание
 * и требуем границу уже за ним. Три буквы — намеренный потолок: «дизайнера»
 * и «креативный» проходят, «дизайнерский» (другое слово, не должность) нет.
 * На латинские ключи правило не распространяется, иначе «seotext» стал бы seo.
 */
const MAX_INFLECTION = 3
const isCyrillic = (s: string) => /[а-яё]/i.test(s)

/**
 * Ключи, которым окончание не разрешено: с ним они превращаются в чужое слово.
 * «директ» + «ор» — это арт-директор, а не Яндекс.Директ; на этой подстроке
 * счётчики уже один раз завышали кластер. Падежи Директа заведены отдельными
 * ключами, чтобы «настройка Директа» не потерялась.
 */
const EXACT_KEYWORDS = new Set(['директ'])

function hasKeyword(text: string, keyword: string): boolean {
  const lower = text.toLowerCase()
  const kw = keyword.toLowerCase()
  const maxTail = isCyrillic(kw) && !EXACT_KEYWORDS.has(kw) ? MAX_INFLECTION : 0

  let idx = lower.indexOf(kw)
  while (idx !== -1) {
    const before = idx > 0 ? lower[idx - 1] : ' '
    if (idx === 0 || isBoundary(before)) {
      for (let tail = 0; tail <= maxTail; tail++) {
        const end = idx + kw.length + tail
        if (end > lower.length) break
        const inflection = lower.slice(idx + kw.length, end)
        if (tail > 0 && !isCyrillic(inflection[tail - 1])) break
        if (end === lower.length || isBoundary(lower[end])) return true
      }
    }
    idx = lower.indexOf(kw, idx + 1)
  }
  return false
}

/**
 * Match title + body against tag keywords.
 *
 * Specialization tags (smm, seo, dizajn, …) are matched against `title` plus the
 * role headline of the body — see roleHeadline.
 * Format/level tags (udalyonka, junior, …) are matched against the full text.
 * Tool tags (figma, canva, tilda, …) are matched against full text via regex.
 *
 * Pass body as second argument. If omitted, title is treated as full text
 * (legacy behaviour — safe for callers that already concatenate title+body).
 */
export function matchTags(title: string, body?: string): string[] {
  const fullText = body !== undefined ? `${title} ${body}` : title
  const roleText = body !== undefined ? `${title} ${roleHeadline(body)}` : title
  const matched: string[] = []

  for (const [tagSlug, keywords] of Object.entries(TAG_KEYWORDS)) {
    const searchIn = SPEC_TAG_SLUGS.has(tagSlug) ? roleText : fullText
    for (const keyword of keywords) {
      if (hasKeyword(searchIn, keyword)) {
        matched.push(tagSlug)
        break
      }
    }
  }

  // Tool tags: regex match against full text
  for (const [tagSlug, pattern] of Object.entries(TOOL_TAG_SLUGS)) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0
    if (pattern.test(fullText)) {
      matched.push(tagSlug)
    }
  }

  return matched
}
