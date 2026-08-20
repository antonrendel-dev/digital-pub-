// Отбор LSI-фраз из Вордстата под стандарт 2.7b (максимум 6 вхождений главного ключа).
//
// Вордстат отдаёт ВЛОЖЕННЫЕ фразы: при ключе «резюме таргетолога» это
// «резюме таргетолога образец», «резюме таргетолога без опыта» и так 15 раз.
// Писателю раньше уходил весь список с указанием «используй органично» — и он
// ставил главный ключ 15+ раз при лимите 6. Замерено на живых статьях:
// «резюме таргетолога» — 22 вхождения, «резюме аналитика данных» — 14.
//
// Поэтому фраза разбирается на две части: главный ключ (его бюджет ограничен)
// и уточняющие слова (их и надо раскрывать в тексте).

export interface Phrase {
  phrase: string
  count: number
}

export interface SelectedPhrase extends Phrase {
  // Слова фразы, которых нет в главном ключе — ради них фраза и берётся.
  modifiers: string[]
}

export interface LsiSelection {
  anchors: Phrase[]
  tail: SelectedPhrase[]
  floor: number
}

export const MAX_MAIN_KEY_USES = 6 // стандарт 2.7b
export const MAX_ANCHOR_PHRASES = 3
export const MIN_PHRASE_COUNT = 30 // ниже Вордстат отдаёт нестабильные цифры
export const TARGET_PHRASES = 15

const SERVICE_WORDS = new Set([
  'или',
  'с',
  'в',
  'на',
  'для',
  'по',
  'из',
  'и',
  'к',
  'за',
  'без',
  'что',
  'как',
  'это',
  'от',
  'до',
  'у',
  'о',
])

// Морфология без словаря: основа — первые 5 букв. «таргетолога» и «таргетологу»
// сходятся, «образец» от главного ключа отличается. Словарь лемматизации сюда
// тащить незачем — задача бинарная, слово либо из главного ключа, либо новое.
const STEM_LENGTH = 5

export function stems(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^a-zа-я0-9]+/)
    .filter((w) => w.length > 0 && !SERVICE_WORDS.has(w))
    .map((w) => w.slice(0, STEM_LENGTH))
}

/**
 * Делит фразы Вордстата на якорные (не добавляют к главному ключу ничего) и
 * уточняющие (несут новую лемму). Уточняющие дедуплицируются по набору новых
 * лемм: «резюме таргетолога образец» и «образец резюме таргетолога» — одна фраза.
 */
export function selectLsiPhrases(
  raw: Phrase[],
  mainKeyword: string,
  mainVolume?: number | null
): LsiSelection {
  const floor = Math.max(MIN_PHRASE_COUNT, Math.round((mainVolume ?? 0) * 0.05))
  const mainStems = new Set(stems(mainKeyword))

  const anchors: Phrase[] = []
  const tail: SelectedPhrase[] = []
  const seenModifiers = new Set<string>()

  for (const p of [...raw].sort((a, b) => b.count - a.count)) {
    if (p.count < floor) continue

    const modifiers = stems(p.phrase).filter((s) => !mainStems.has(s))

    if (modifiers.length === 0) {
      if (anchors.length < MAX_ANCHOR_PHRASES) anchors.push(p)
      continue
    }

    const signature = [...modifiers].sort().join('|')
    if (seenModifiers.has(signature)) continue
    seenModifiers.add(signature)

    tail.push({ ...p, modifiers })
  }

  return { anchors, tail: tail.slice(0, Math.max(0, TARGET_PHRASES - anchors.length)), floor }
}

/** Слова фразы, которых нет в главном ключе — в исходном виде, а не основами. */
export function modifierWords(phrase: string, mainKeyword: string): string {
  const mainStems = new Set(stems(mainKeyword))
  return phrase
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/\s+/)
    .filter((w) => {
      const s = w.replace(/[^a-zа-я0-9]/g, '').slice(0, STEM_LENGTH)
      return s.length > 0 && !mainStems.has(s)
    })
    .join(' ')
}

/** Блок про ключи для промпта писателя: бюджет вхождений + материал для раскрытия. */
export function buildWordstatBlock(
  selection: LsiSelection,
  mainKeyword: string,
  mainVolume?: number | null
): string {
  const { anchors, tail } = selection
  if (!anchors.length && !tail.length) return ''

  const volumeNote = typeof mainVolume === 'number' ? ` — ${mainVolume.toLocaleString()}/мес` : ''

  const lines = [
    '',
    'КЛЮЧИ ИЗ WORDSTAT (реальные данные, не выдумка)',
    '',
    `Главный ключ: "${mainKeyword}"${volumeNote}`,
    '',
    `БЮДЖЕТ ВХОЖДЕНИЙ. Точная фраза "${mainKeyword}" встречается в статье не более`,
    `${MAX_MAIN_KEY_USES} раз, по одному разу в каждом из мест: title, H1, первые 60 слов,`,
    'первый H2, один ответ FAQ, meta description. Всё сверх этого — переспам:',
    'Яндекс штрафует за keyword stuffing и размывает BERT-вектор страницы.',
    'В остальном тексте заменяй ключ синонимом, местоимением или номинальной группой.',
  ]

  if (tail.length) {
    lines.push(
      '',
      'УТОЧНЯЮЩИЕ СМЫСЛЫ. Это то, что люди дописывают к главному ключу — раскрой',
      'КАЖДЫЙ по смыслу отдельным пассажем или подзаголовком. Не повторяй при этом',
      'главный ключ целиком, бери выделенные слова:'
    )
    for (const p of tail) {
      lines.push(
        `  - ${modifierWords(p.phrase, mainKeyword)} (из "${p.phrase}", ${p.count.toLocaleString()}/мес)`
      )
    }
  }

  return lines.join('\n') + '\n'
}
