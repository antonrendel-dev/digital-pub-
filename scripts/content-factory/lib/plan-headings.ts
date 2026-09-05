// Заголовки H2 согласует планировщик: в них стоят ключ и биграммы из ТЗ, а доля
// заголовков-вопросов держится в коридоре 30-50 % стандарта. Дальше по конвейеру
// текст ещё дважды проходит через модель — компилятор (шаг 3б) и SEO-ревью (шаг 4) —
// и обе переписывают заголовки своими словами.
//
// На прогонах 05.09.2026 это подтвердилось дважды подряд: план отдавал 1-3 вопроса
// из 7, в статье выходило 6 из 7, а из заголовка «Маркетолог: вакансии и прямой
// отклик на Диджитал Паб» пропадала биграмма «маркетолог вакансии» из ТЗ. Просьба
// в промпте «заголовки не переформулируй» результата не дала ни разу — поэтому
// заголовки возвращаются кодом, по образцу отката структуры в humanizeAgainstScore.

export interface RestoredHeadings {
  markdown: string
  /** Сколько заголовков реально заменено. */
  restored: number
  /** Число H2 в тексте разошлось с планом — сопоставлять по порядку нельзя. */
  mismatch: boolean
  /** H2, найденные в тексте, по порядку: нужны логу при расхождении. */
  articleTitles: string[]
}

const H2 = /^##\s+(.+?)\s*$/
const FENCE = /^\s*(?:```|~~~)/

/** Номера строк с H2 вне блоков кода. «## » внутри ``` — не заголовок раздела. */
function h2Lines(lines: string[]): number[] {
  const found: number[] = []
  let inFence = false
  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      inFence = !inFence
      continue
    }
    if (!inFence && H2.test(lines[i])) found.push(i)
  }
  return found
}

/**
 * Вернуть в текст заголовки H2 из плана, тела блоков оставив как есть.
 *
 * Последний H2 не трогаем намеренно: это раздел вопросов, и его приводит к виду,
 * понятному парсеру FAQ, normalizeFaqHeading. Подставь сюда заголовок плана — два
 * правила начнут спорить, и разметка FAQPage может не собраться вовсе.
 *
 * Число H2 разошлось с планом — не трогаем ничего: сопоставление по порядку тогда
 * подставит заголовки не тем разделам. Вызывающий печатает расхождение в лог.
 */
export function restorePlanHeadings(markdown: string, planTitles: string[]): RestoredHeadings {
  const lines = markdown.split('\n')
  const indexes = h2Lines(lines)
  const articleTitles = indexes.map((i) => lines[i].match(H2)![1])

  if (indexes.length !== planTitles.length) {
    return { markdown, restored: 0, mismatch: true, articleTitles }
  }

  let restored = 0
  for (let n = 0; n < indexes.length - 1; n++) {
    const wanted = `## ${planTitles[n].trim()}`
    if (lines[indexes[n]] === wanted) continue
    lines[indexes[n]] = wanted
    restored++
  }

  return { markdown: lines.join('\n'), restored, mismatch: false, articleTitles }
}
