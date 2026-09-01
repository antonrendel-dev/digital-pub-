import type { Finding } from './findings'

/**
 * Гейт частотности: не заводить задачу на ключ, которого никто не набирает.
 *
 * Крон отбирает находки по ДВИЖЕНИЮ ПОЗИЦИИ и до 01.09.2026 частотность не
 * смотрел вовсе. В результате на доску попадали карточки с правдоподобными
 * цифрами позиций и нулевым спросом за ними. Три пачки подряд, все проверены
 * замером вручную:
 *
 *   31.08  «7 ключей вышли из топ-10»    настоящий 1 из 7
 *   31.08  «12 ключей в шаге от топ-10»  настоящих 5 из 12
 *   01.09  «5 ключей просели в топ-100»  настоящих 0 из 5
 *
 * Шесть настоящих ключей из двадцати четырёх. Три четверти работы, которую
 * заводил крон, делать было не надо, и понять это можно было только руками.
 */

/** Находки, у которых `key` — поисковый запрос, а не адрес страницы. */
export const KEY_TYPES: ReadonlySet<Finding['type']> = new Set([
  'left-top10',
  'position-drop',
  'near-top10',
  'zero-clicks',
  'wrong-page',
])

/**
 * Ниже этого порога позиция не значит ничего.
 *
 * Планка взята по трём разобранным пачкам: настоящими оказались ключи от 88
 * показов, мусорными — от 0 до 27. Пятьдесят проходит между ними с запасом
 * в обе стороны.
 */
export const MIN_VOLUME = 50

export interface GateResult {
  kept: Finding[]
  /** Отсеянные — с частотностью, чтобы крон мог их назвать в отчёте. */
  dropped: Array<{ finding: Finding; volume: number }>
}

/** Частотность в заголовок: решение «брать или нет» должно быть видно из карточки. */
function withVolume(f: Finding, volume: number): Finding {
  return { ...f, title: `${f.title} · ${volume}/мес` }
}

/**
 * Неизвестная частотность НЕ режет находку.
 *
 * Вордстат может не ответить — лимит сто запросов в час, сеть, биллинг. Терять
 * из-за этого настоящую находку хуже, чем показать лишнюю карточку: лишнюю
 * видно глазами, потерянную не видно никак.
 */
export function applyVolumeGate(
  findings: Finding[],
  volumes: Record<string, number | undefined>
): GateResult {
  const kept: Finding[] = []
  const dropped: GateResult['dropped'] = []

  for (const f of findings) {
    if (!KEY_TYPES.has(f.type)) {
      kept.push(f)
      continue
    }
    const volume = volumes[f.key]
    if (volume === undefined) {
      kept.push(f)
      continue
    }
    if (volume < MIN_VOLUME) dropped.push({ finding: f, volume })
    else kept.push(withVolume(f, volume))
  }

  return { kept, dropped }
}

/** Ключи, для которых нужно спросить частотность. */
export function keysToMeasure(findings: Finding[]): string[] {
  return [...new Set(findings.filter((f) => KEY_TYPES.has(f.type)).map((f) => f.key))]
}
