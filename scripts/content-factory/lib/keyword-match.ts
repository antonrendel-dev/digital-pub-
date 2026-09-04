/**
 * Вхождения ключа с поправкой на русский язык.
 *
 * До 04.09.2026 приёмка считала обязательные фразы дословно, а промпт
 * требовал ключ «буквально, не синонимами» в первых 60 словах, H2 и FAQ.
 * Ключи приходят из Вордстата в форме поисковой строки — «резюме без опыта
 * работы образец», — и статьи открывались жирным «**Резюме без опыта работы
 * образец** — это…». Яндекс и Google лемматизируют; точная форма нужна
 * только в title и description, а в теле ключ должен склоняться.
 *
 * Вхождение — окно из N значимых слов текста (N = число значимых слов
 * фразы, плюс одно слово запаса на «junior» или «студента»), в котором есть
 * все основы фразы в любом порядке. Предлоги и союзы не считаются ни во
 * фразе, ни в тексте: «резюме для junior таргетолога» — одно вхождение
 * «резюме таргетолога».
 *
 * Основы — как в boost-plan: шесть символов у длинных слов («удалённая» →
 * «удален»), у коротких без последней буквы («работа» → «работ»). Пять
 * символов, как у Вордстат-отбора в lsi.ts, здесь слишком коротко: «контент»
 * и «контекстолога» совпадали (ревью 02.09.2026). Шесть всё ещё склеивают
 * профессию с деятельностью (маркетолог/маркетинг, таргетолог/таргетинг,
 * на семи — копирайтер/копирайтинг):
 * для счёта обязательных фраз это мягкость в пользу писателя, а для отказов
 * (жирный ключ, открытие определением) сравнение идёт по семи символам —
 * там цена ошибки выше, а фрагменты короткие.
 */

const STOP_WORDS = new Set([
  'и',
  'в',
  'во',
  'на',
  'с',
  'со',
  'по',
  'из',
  'к',
  'ко',
  'у',
  'о',
  'об',
  'от',
  'до',
  'за',
  'для',
  'без',
  'не',
  'ни',
  'как',
  'что',
  'или',
  'же',
  'ли',
  'бы',
  'то',
  'это',
  'при',
  'про',
  'над',
  'под',
])

function normalize(text: string): string {
  return text.toLowerCase().replace(/ё/g, 'е')
}

function stemAt(word: string, length: number): string {
  if (word.length > length) return word.slice(0, length)
  if (word.length > 4) return word.slice(0, word.length - 1)
  return word
}

const stem = (w: string) => stemAt(w, 6)
const stemStrict = (w: string) => stemAt(w, 7)

/**
 * Две основы — одно слово, если одна является префиксом другой и короткая
 * не короче четырёх символов. Срез по длине даёт разные основы формам
 * одного слова на границе: «юрист» → «юрис», «юриста» → «юрист», «юристов»
 * → «юристо» (ревью 04.09.2026); «опыт»/«опытом» → «опыт»/«опыто».
 * Равенство их не свяжет, префикс — свяжет. Беглую гласную не спасает:
 * «образец» → «образе», «образцов» → «образц» — разные слова для приёмки.
 */
function sameStem(a: string, b: string): boolean {
  if (a === b) return true
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  return short.length >= 4 && long.startsWith(short)
}

/** Значимые слова: без HTML, без URL markdown-ссылок (текст ссылки остаётся), без предлогов. */
function words(text: string): string[] {
  return normalize(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .split(/[^a-zа-я0-9]+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w))
}

/** Основы значимых слов фразы, без повторов. */
export function keyStems(phrase: string): string[] {
  return [...new Set(words(phrase).map(stem))]
}

/**
 * Сколько раз фраза встречается в тексте в любой грамматической форме и
 * порядке слов. Окна не пересекаются: «резюме таргетолога резюме таргетолога» — 2.
 */
export function countPhraseForms(text: string, phrase: string): number {
  const need = keyStems(phrase)
  if (need.length === 0) return 0
  const seq = words(text).map(stem)
  const window = need.length + 1
  let count = 0
  let i = 0
  while (i + need.length <= seq.length) {
    const slice = seq.slice(i, i + window)
    if (need.every((s) => slice.some((t) => sameStem(s, t)))) {
      count += 1
      i += need.length
    } else {
      i += 1
    }
  }
  return count
}

export function hasPhraseForm(text: string, phrase: string): boolean {
  return countPhraseForms(text, phrase) > 0
}

/**
 * Фрагмент — это ключ (в любой форме): не меньше трёх четвертей основ ключа
 * есть во фрагменте, и во фрагменте нет лишних значимых слов сверх одного.
 * «Образец резюме без опыта» при ключе «резюме без опыта работы образец» —
 * да; «Каждое второе резюме таргетолога» при «резюме таргетолога» — нет:
 * это крючок с ключом внутри, а не ключ.
 */
export function isKeyFragment(fragment: string, phrase: string): boolean {
  const need = [...new Set(words(phrase).map(stemStrict))]
  if (need.length === 0) return false
  const have = words(fragment).map(stemStrict)
  if (have.length > need.length + 1) return false
  const hits = need.filter((s) => have.some((t) => sameStem(s, t))).length
  return hits >= Math.max(1, Math.ceil(need.length * 0.75))
}

/** Ключ (в любой форме) выделен жирным: `**резюме без опыта**` или `__…__`. */
export function boldKeyOccurrences(text: string, phrase: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(/(?:\*\*|__)([^*_\n]{2,160})(?:\*\*|__)/g)) {
    if (isKeyFragment(m[1], phrase)) out.push(m[0])
  }
  return out
}

/**
 * Статья открывается определением ключа: первое предложение тела — «<ключ>
 * — это …». Именно так выглядели 76 из 86 статей. Возвращает совпавший
 * фрагмент для сообщения приёмки или null.
 *
 * Проверяется только текст до первого H2 — лид (C1). Если лида нет и тело
 * начинается с заголовка, определение под «## Что такое…» законно (D4),
 * а отсутствие крючка — отдельная беда, не эта.
 */
export function keyDefinitionOpener(markdown: string, phrase: string): string | null {
  const lines = markdown.split('\n').map((l) => l.trim())
  const firstText = lines.find((l) => l && !/^#\s/.test(l) && !/^<img/i.test(l) && !/^!\[/.test(l))
  if (!firstText || /^#{2,6}\s/.test(firstText)) return null
  const m = firstText.match(
    /^(?:\*\*|__)?([^*_\n.!?]{3,160}?)(?:\*\*|__)?\s*[—–-]\s*это(?=[\s,.:;!?]|$)/i
  )
  return m && isKeyFragment(m[1], phrase) ? m[0] : null
}

export function opensWithKeyDefinition(markdown: string, phrase: string): boolean {
  return keyDefinitionOpener(markdown, phrase) !== null
}
