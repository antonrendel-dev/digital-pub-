// Гейт частотности: тема идёт в контент-план только если ключ собирает достаточно
// спроса. Темы ниже порога не выбрасываются — они уходят на переформулировку ключа
// (см. reformulateTopics в analyst.ts). На замере 19.08.2026 24 темы из 55 в батче
// имели <300/мес, часть — 0-2 запроса, то есть статья писалась заведомо в никуда.

export const MIN_WORDSTAT_VOLUME = 300

export interface GatedTopic {
  id: number
  keyword: string
  wordstatVolume?: number
}

const byVolumeDesc = (a: GatedTopic, b: GatedTopic) =>
  (b.wordstatVolume ?? 0) - (a.wordstatVolume ?? 0)

// При мёртвом Wordstat все частотности нулевые — гейт увёл бы весь батч
// на переформулировку, поэтому в этом случае пропускаем всех.
export function wordstatIsAlive(topics: GatedTopic[]): boolean {
  return topics.some((t) => (t.wordstatVolume ?? 0) > 0)
}

export function splitByVolume<T extends GatedTopic>(topics: T[]): { passed: T[]; below: T[] } {
  if (!wordstatIsAlive(topics)) return { passed: topics, below: [] }

  return {
    passed: topics.filter((t) => (t.wordstatVolume ?? 0) >= MIN_WORDSTAT_VOLUME).sort(byVolumeDesc),
    below: topics.filter((t) => (t.wordstatVolume ?? 0) < MIN_WORDSTAT_VOLUME).sort(byVolumeDesc),
  }
}

// Порядок плана — по убыванию спроса, id пересчитываются подряд:
// по ним Тони одобряет темы командой /content_approve.
export function renumberByVolume<T extends GatedTopic>(topics: T[]): T[] {
  const sorted = [...topics].sort(byVolumeDesc)
  sorted.forEach((t, i) => (t.id = i + 1))
  return sorted
}
