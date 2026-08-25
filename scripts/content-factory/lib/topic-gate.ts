// Гейт частотности: тема идёт в контент-план только если ключ попадает в коридор
// среднечастотных запросов. Темы вне коридора не выбрасываются — они уходят на
// переформулировку ключа (см. reformulateTopics в analyst.ts).
//
// Нижняя граница: на замере 19.08.2026 24 темы из 55 в батче имели <300/мес,
// часть — 0-2 запроса, то есть статья писалась заведомо в никуда.
// Верхняя граница: ВЧ-ключи выигрывают hh.ru и superjob, по замерам Топвизора
// потолок топ-10 сайта — около 550/мес; всё, что выше 1000, уезжает за топ-50.

// Потолок поднят с 1000 до 1600 на разборе батча 21.08.2026: в 1000-1600 лежат
// вводные запросы по профессиям («бизнес аналитик кто это», «ключевые навыки в
// резюме»), где выдача информационная, а не забитая агрегаторами. Девять тем
// оттуда прошли приёмку SEO — при потолке 1000 гейт завернул бы их зря.
export const MIN_WORDSTAT_VOLUME = 300
export const MAX_WORDSTAT_VOLUME = 1600

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

// Метка трафика раньше приходила от аналитика вместе с темой — то есть была
// догадкой модели, не связанной с замером. На батче 14.08 это разошлось с
// реальностью в 34 раза («зарплата продуктового аналитика»: заявлено 6151/мес,
// замер 179). Тони одобряет темы по этой метке, поэтому она считается из
// wordstatVolume и ниоткуда больше.
//
// Границы привязаны к коридору: нижняя треть коридора — низкий трафик,
// верхняя — высокий. Тема вне коридора до плана не доходит, но метку получает
// честную: её показывают в блоке «одобрять на свой риск».
export const TRAFFIC_MID_VOLUME = 700

export function trafficLabelFromVolume(volume: number | null | undefined): string {
  if (typeof volume !== 'number') return 'без замера'
  if (volume < MIN_WORDSTAT_VOLUME) return 'низкий'
  if (volume < TRAFFIC_MID_VOLUME) return 'средний'
  return 'высокий'
}

// Второй рубеж, уже перед написанием. Гейт выше ловит темы без замера на этапе
// плана, но одобренная тема живёт в файле неделями, и правка ключа руками замер
// не пересчитывает. Пять статей из десяти опубликованных вышли по ключу с
// неизвестной частотностью — последняя 20.08.2026, за два часа до появления
// гейта. Здесь такая тема просто не берётся в работу.
export function isReadyToWrite(t: GatedTopic & { approved?: boolean; published?: boolean }) {
  return Boolean(t.approved) && !t.published && isMeasured(t)
}

/**
 * Сколько неопубликованных одобренных тем должно остаться, чтобы имело смысл
 * собирать новый батч.
 *
 * Аналитик собирает ~30 тем — месяц публикаций по штуке в день. Запускать его
 * по календарю бессмысленно: 25.08.2026 очередь была на 39 тем, то есть до
 * начала октября, а новый батч всё равно лёг бы сверху и вытеснил уже
 * замеренные темы. Порог даёт запас на одобрение: когда остаётся десять дней,
 * Тони есть когда посмотреть список.
 */
export const QUEUE_REFILL_THRESHOLD = 10

export function countQueue(topics: Array<{ approved?: boolean; published?: boolean }>): number {
  return topics.filter((t) => t.approved && !t.published).length
}

export function needsNewBatch(
  topics: Array<{ approved?: boolean; published?: boolean }>,
  threshold = QUEUE_REFILL_THRESHOLD
): boolean {
  return countQueue(topics) < threshold
}
