export const FORMAT_SLUGS = ['udalyonka', 'ofis', 'gibrid'] as const
export const LEVEL_SLUGS = ['junior', 'middle', 'senior'] as const
export type FormatSlug = (typeof FORMAT_SLUGS)[number]
export type LevelSlug = (typeof LEVEL_SLUGS)[number]

export function isFilterSlug(slug: string): slug is FormatSlug | LevelSlug {
  return [...FORMAT_SLUGS, ...LEVEL_SLUGS].includes(slug as never)
}

export const FORMAT_CHIP_LABELS: Record<string, string> = {
  udalyonka: 'Удалённо',
  ofis: 'В офисе',
  gibrid: 'Гибрид',
}

export const LEVEL_CHIP_LABELS: Record<string, string> = {
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
}

// Имена специализаций в родительном падеже (для "Вакансии КОГО")
const SPEC_GENITIVE: Record<string, string> = {
  smm: 'SMM-менеджера',
  marketing: 'маркетолога',
  dizajn: 'дизайнера',
  seo: 'SEO-специалиста',
  target: 'таргетолога',
  razrabotka: 'разработчика',
  analitika: 'аналитика',
  copywriting: 'копирайтера',
  content: 'контент-менеджера',
  kreativ: 'арт-директора',
  menedzher: 'менеджера проектов',
  finansy: 'финансового специалиста',
  'kontekstnaya-reklama': 'контекстолога',
}

/**
 * Названия профессий в именительном падеже — для анкоров перелинковки.
 *
 * SPEC_NOMINATIVE ниже держит имя РАЗДЕЛА («Контент», «Аналитика») и годится
 * для хлебных крошек. В анкоре нужен человек: «Контент-менеджер удалённо»,
 * а не «Контент удалённо».
 */
const SPEC_PROFESSION: Record<string, string> = {
  smm: 'SMM-менеджер',
  marketing: 'Маркетолог',
  dizajn: 'Дизайнер',
  seo: 'SEO-специалист',
  target: 'Таргетолог',
  razrabotka: 'Разработчик',
  analitika: 'Аналитик',
  copywriting: 'Копирайтер',
  content: 'Контент-менеджер',
  kreativ: 'Арт-директор',
  menedzher: 'Менеджер проектов',
  finansy: 'Финансовый специалист',
  'kontekstnaya-reklama': 'Контекстолог',
}

// Имена специализаций в именительном падеже (для breadcrumb)
const SPEC_NOMINATIVE: Record<string, string> = {
  smm: 'SMM',
  marketing: 'Маркетинг',
  dizajn: 'Дизайн',
  seo: 'SEO',
  target: 'Таргет',
  razrabotka: 'Разработка',
  analitika: 'Аналитика',
  copywriting: 'Копирайтинг',
  content: 'Контент',
  kreativ: 'Креатив',
  menedzher: 'Менеджмент',
  finansy: 'Финансы',
  'kontekstnaya-reklama': 'Контекстная реклама',
}

/**
 * Названия профессий в творительном падеже — «работа КЕМ».
 *
 * Спрос сформулирован именно так: «работа контент менеджером удаленно» 159
 * показов, «работа контент-менеджером удаленно» 144, «…и без опыта» 144.
 * Без творительного падежа страница отвечает на треть кластера.
 */
const SPEC_INSTRUMENTAL: Record<string, string> = {
  smm: 'SMM-менеджером',
  marketing: 'маркетологом',
  dizajn: 'дизайнером',
  seo: 'SEO-специалистом',
  target: 'таргетологом',
  razrabotka: 'разработчиком',
  analitika: 'аналитиком',
  copywriting: 'копирайтером',
  content: 'контент-менеджером',
  kreativ: 'арт-директором',
  menedzher: 'менеджером проектов',
  finansy: 'финансовым специалистом',
  'kontekstnaya-reklama': 'контекстологом',
}

const FORMAT_LABELS: Record<string, string> = {
  udalyonka: 'удалённо',
  ofis: 'в офисе',
  gibrid: 'гибрид',
}

const FORMAT_LABELS_ADJ: Record<string, string> = {
  udalyonka: 'Удалённые',
  ofis: 'Офисные',
  gibrid: 'Гибридные',
}

const LEVEL_LABELS: Record<string, string> = {
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
}

export function getSpecFilterH1(specSlug: string, filterSlug: string): string {
  const y = new Date().getFullYear()
  const gen = SPEC_GENITIVE[specSlug] ?? specSlug
  if (FORMAT_SLUGS.includes(filterSlug as FormatSlug)) {
    // «Удалённая работа <кем>» вместо «Вакансии <кого> удалённо».
    //
    // Замер GSC 27.05–24.08.2026: на шести запросах кластера «контент-менеджер
    // + удалёнка» показывались четыре наши страницы, 1 064 показа и ноль
    // кликов. Причина не в позиции — пересечение стояло ЛУЧШЕ всех (33–40),
    // но собирало 7% показов, а 77% забирал хаб /vacancies/udalyonka с 45–52.
    // У хаба точная биграмма «удалённая работа» встречается 25 раз, включая
    // title и H1, а у пересечения было 5: оно построено на слове «удалённо».
    // Здесь мы отдаём биграмму тому, кто отвечает на запрос целиком.
    //
    // Творительный падеж закрывает вторую половину спроса — «работа КЕМ
    // удалённо». Титул при этом остаётся на «удалённо», чтобы страница
    // покрывала обе формулировки, а не меняла одну на другую.
    if (filterSlug === 'udalyonka') {
      const instr = SPEC_INSTRUMENTAL[specSlug] ?? gen
      return `Удалённая работа ${instr} — вакансии ${y}`
    }
    if (filterSlug === 'ofis') return `Вакансии ${gen} в офисе — ${y}`
    return `Вакансии ${gen} на гибриде — ${y}`
  }
  const level = LEVEL_LABELS[filterSlug] ?? filterSlug
  return `Вакансии ${level} ${gen} — ${y}`
}

export function getSpecFilterTitle(specSlug: string, filterSlug: string): string {
  const y = new Date().getFullYear()
  const gen = SPEC_GENITIVE[specSlug] ?? specSlug
  if (FORMAT_SLUGS.includes(filterSlug as FormatSlug)) {
    const label = FORMAT_LABELS[filterSlug] ?? filterSlug
    return `Вакансии ${gen} ${label} — ${y}`
  }
  const level = LEVEL_LABELS[filterSlug] ?? filterSlug
  return `Вакансии ${level} ${gen} — ${y}`
}

export function getSpecFilterDescription(specSlug: string, filterSlug: string): string {
  const gen = SPEC_GENITIVE[specSlug] ?? specSlug
  if (FORMAT_SLUGS.includes(filterSlug as FormatSlug)) {
    const label = FORMAT_LABELS[filterSlug] ?? filterSlug
    if (filterSlug === 'udalyonka') {
      // Точная биграмма «удалённая работа» — в первых двух словах сниппета.
      const instr = SPEC_INSTRUMENTAL[specSlug] ?? gen
      return `Удалённая работа ${instr}: актуальные вакансии ${gen} удалённо. Свежие предложения из Telegram-каналов. Обновляется ежедневно.`
    }
    return `Актуальные вакансии ${gen} ${label}. Свежие предложения из Telegram-каналов. Обновляется ежедневно.`
  }
  const level = LEVEL_LABELS[filterSlug] ?? filterSlug
  return `Актуальные вакансии для ${level}-специалиста в области ${gen}. Свежие предложения из Telegram-каналов.`
}

export function getSpecFilterBreadcrumb(specSlug: string, filterSlug: string): string {
  void specSlug
  if (FORMAT_SLUGS.includes(filterSlug as FormatSlug)) {
    return FORMAT_LABELS_ADJ[filterSlug] ?? filterSlug
  }
  return LEVEL_LABELS[filterSlug] ?? filterSlug
}

export function getSpecNominative(specSlug: string): string {
  return SPEC_NOMINATIVE[specSlug] ?? specSlug
}

// Все комбинации для sitemap и generateStaticParams
export const SPEC_SLUGS = Object.keys(SPEC_GENITIVE)

export interface FilterHubLink {
  spec: string
  /** Анкор: «Контент-менеджер удалённо». */
  label: string
  href: string
}

/**
 * Ссылки с хаба формата или уровня вниз, на пересечения с профессиями.
 *
 * Зачем. До 27.08.2026 на страницу `/vacancies/content/udalyonka` вела ровно
 * ОДНА внутренняя ссылка — с `/vacancies/content`. Хаб `/vacancies/udalyonka`
 * при этом стоит в сквозной навигации и получает ссылку с каждой страницы
 * сайта. На запросе «контент-менеджер удалённая работа» Гугл выбирал между
 * страницей, которая отвечает целиком, но почти сирота, и страницей, которая
 * отвечает наполовину, зато знакома всему сайту, — и показывал вторую.
 *
 * Замер GSC 27.05–24.08.2026: одиннадцать запросов вида «профессия + удалёнка»,
 * на каждом 2–5 наших страниц, 1 778 показов и НОЛЬ кликов. Пересечение всюду
 * самое слабое по показам (10–17), даже там, где по позиции оно лучшее.
 *
 * Анкор транзакционный и точный — «Контент-менеджер удалённо», под запрос.
 * Обратной ссылки снизу вверх с тем же анкором быть не должно: одинаковый тип
 * с обеих сторон превращает усиление в конкуренцию за один и тот же запрос.
 * Тот же принцип уже применён к карточкам профессий.
 */
export function getFilterHubLinks(filterSlug: string): FilterHubLink[] {
  if (!isFilterSlug(filterSlug)) return []
  const suffix = FORMAT_SLUGS.includes(filterSlug as FormatSlug)
    ? (FORMAT_LABELS[filterSlug] ?? filterSlug)
    : (LEVEL_LABELS[filterSlug] ?? filterSlug)
  const isLevel = LEVEL_SLUGS.includes(filterSlug as LevelSlug)
  return SPEC_SLUGS.map((spec) => {
    const profession = SPEC_PROFESSION[spec] ?? spec
    return {
      spec,
      // Уровень стоит перед профессией: «Junior дизайнер», а не «Дизайнер junior».
      label: isLevel ? `${suffix} ${profession.toLowerCase()}` : `${profession} ${suffix}`,
      href: `/vacancies/${spec}/${filterSlug}`,
    }
  })
}

export function getAllFilterCombinations(): Array<{ category: string; slug: string }> {
  const combos: Array<{ category: string; slug: string }> = []
  for (const spec of SPEC_SLUGS) {
    for (const f of FORMAT_SLUGS) combos.push({ category: spec, slug: f })
    for (const l of LEVEL_SLUGS) combos.push({ category: spec, slug: l })
  }
  return combos
}
