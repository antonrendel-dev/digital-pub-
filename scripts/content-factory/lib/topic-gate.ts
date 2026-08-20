// Гейт частотности: тема идёт в контент-план только если ключ попадает в коридор
// среднечастотных запросов. Темы вне коридора не выбрасываются — они уходят на
// переформулировку ключа (см. reformulateTopics в analyst.ts).
//
// Нижняя граница: на замере 19.08.2026 24 темы из 55 в батче имели <300/мес,
// часть — 0-2 запроса, то есть статья писалась заведомо в никуда.
// Верхняя граница: ВЧ-ключи выигрывают hh.ru и superjob, по замерам Топвизора
// потолок топ-10 сайта — около 550/мес; всё, что выше 1000, уезжает за топ-50.

export const MIN_WORDSTAT_VOLUME = 300
export const MAX_WORDSTAT_VOLUME = 1000

export interface GatedTopic {
  id: number
  keyword: string
  // null — Вордстат не ответил, частотность неизвестна. 0 — спроса нет.
  wordstatVolume?: number | null
}

const byVolumeDesc = (a: GatedTopic, b: GatedTopic) =>
  (b.wordstatVolume ?? 0) - (a.wordstatVolume ?? 0)

const isMeasured = (t: GatedTopic): t is GatedTopic & { wordstatVolume: number } =>
  typeof t.wordstatVolume === 'number'

export function inCorridor(volume: number): boolean {
  return volume >= MIN_WORDSTAT_VOLUME && volume <= MAX_WORDSTAT_VOLUME
}

// При мёртвом Wordstat все частотности нулевые — гейт увёл бы весь батч
// на переформулировку, поэтому в этом случае пропускаем всех.
export function wordstatIsAlive(topics: GatedTopic[]): boolean {
  return topics.some((t) => isMeasured(t) && t.wordstatVolume > 0)
}

// unmeasured отделены от offTarget намеренно: гонять их по переформулировке
// бессмысленно (частотность неизвестна, а не плохая) и это жжёт квоту Вордстата.
export function splitByVolume<T extends GatedTopic>(
  topics: T[]
): { passed: T[]; offTarget: T[]; unmeasured: T[] } {
  const unmeasured = topics.filter((t) => !isMeasured(t))
  const measured = topics.filter(isMeasured) as T[]

  if (!wordstatIsAlive(measured)) return { passed: measured, offTarget: [], unmeasured }

  return {
    passed: measured.filter((t) => inCorridor(t.wordstatVolume as number)).sort(byVolumeDesc),
    offTarget: measured.filter((t) => !inCorridor(t.wordstatVolume as number)).sort(byVolumeDesc),
    unmeasured,
  }
}

// Порядок плана — по убыванию спроса, id пересчитываются подряд:
// по ним Тони одобряет темы командой /content_approve.
export function renumberByVolume<T extends GatedTopic>(topics: T[]): T[] {
  const sorted = [...topics].sort(byVolumeDesc)
  sorted.forEach((t, i) => (t.id = i + 1))
  return sorted
}
