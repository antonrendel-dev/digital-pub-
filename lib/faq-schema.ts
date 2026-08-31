/**
 * Сборка FAQ-разметки из раздела вопросов, написанного в самой статье.
 *
 * Раздел «Частые вопросы» есть почти в каждой статье — этого требует стандарт
 * завода. А поле faqSchema до 31.08.2026 стояло у трёх статей из восьмидесяти
 * двух: текст был написан, а поисковик о нём не знал и расширенный сниппет
 * не показывал.
 *
 * Здесь ничего не сочиняется. Вопросы и ответы берутся из готового текста как
 * есть, ссылки разворачиваются в простой текст — в разметке они не нужны.
 */

export interface FaqItem {
  question: string
  answer: string
}

/** Заголовок раздела вопросов пишут по-разному — ловим любой вариант. */
const FAQ_HEADING = /^##\s+.*(вопрос|FAQ).*$/im

/** Поисковики не показывают разметку, если ответов меньше двух. */
export const MIN_FAQ_ITEMS = 2

export function parseFaq(markdown: string): FaqItem[] {
  const heading = markdown.match(FAQ_HEADING)
  if (!heading) return []

  const block = markdown.slice(markdown.indexOf(heading[0]) + heading[0].length)
  const items: FaqItem[] = []
  const re = /###\s+(.+?)\n+([\s\S]+?)(?=\n\s*###|\n\s*##\s|\s*$)/g

  let m: RegExpExecArray | null
  while ((m = re.exec(block))) {
    const question = m[1].trim()
    const answer = m[2]
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\[(.+?)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
    // Таблицу или список в ответ не тащим: разметка ждёт связный текст.
    if (question && answer && !answer.startsWith('|') && !answer.startsWith('-')) {
      items.push({ question, answer })
    }
  }
  return items
}

/** Готовая строка для фронтматтера MDX, либо пустая, если собирать нечего. */
export function faqSchemaLine(markdown: string): string {
  const items = parseFaq(markdown)
  if (items.length < MIN_FAQ_ITEMS) return ''
  return `\nfaqSchema: '${JSON.stringify(items).replace(/'/g, "''")}'`
}
