// Разовый пробник этапа ТЗ: гоняет реальные промпты аналитика и SEO на живой теме
// и проверяет, что оба возвращают разбираемый JSON нужной формы.
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { selectLsiPhrases } from './lib/lsi.js'
import { buildSourceDataBlock, buildTopvisorContext, loadTopvisorSemantics } from './lib/tz.js'

const SEM = '/home/claude/projects/digital-pub-/scripts/content-factory/data/topvisor-semantics.json'

function askClaude(prompt: string, agent: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', '--agent', agent, '--allowedTools', 'Read,Skill,Glob,Grep'], {
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    child.stdin.write(prompt)
    child.stdin.end()
    let out = ''
    let err = ''
    child.stdout.on('data', (d: Buffer) => (out += d.toString()))
    child.stderr.on('data', (d: Buffer) => (err += d.toString()))
    child.on('close', (c) => (c === 0 ? resolve(out.trim()) : reject(new Error(err || `code ${c}`))))
    child.on('error', reject)
  })
}

const keyword = 'резюме таргетолога'
const title = 'Резюме таргетолога: структура, кейсы и типичные ошибки'

const tv = buildTopvisorContext(keyword, title, loadTopvisorSemantics(SEM))
const lsi = selectLsiPhrases(
  [
    { phrase: 'резюме таргетолога', count: 480 },
    { phrase: 'резюме таргетолога образец', count: 320 },
    { phrase: 'резюме таргетолога без опыта', count: 210 },
    { phrase: 'резюме таргетолога шаблон', count: 180 },
  ],
  keyword,
  480
)

const sourceData = buildSourceDataBlock(keyword, 480, lsi, tv)

const task = `Тема: "${title}"
Главный ключ: "${keyword}"
Аудитория: Соискатель
Интент: информационный
Черновой title: "Резюме таргетолога: как собрать в 2026"
Черновой description: "Разбираем структуру резюме таргетолога, какие кейсы показывать и какие ошибки убивают отклик."

Структура статьи, уже утверждённая планировщиком:
1. Что смотрят в резюме таргетолога
2. Структура по блокам
3. Кейсы и метрики
4. Типичные ошибки

${sourceData}

Верни JSON строго такого вида, без пояснений:
{
  "metaTitle": "до 60 символов, с главным ключом",
  "metaDesc": "строго 130-155 символов, с главным ключом",
  "exactPhrases": [{"phrase": "фраза дословно", "uses": 2}],
  "dilutedPhrases": ["смысл, который раскрыть без дословного вхождения"],
  "interlinks": ["https://d-pub.ru/..."],
  "h2Requirements": ["смысл, который обязан быть раскрыт отдельным разделом"],
  "wordCountMin": 1400,
  "wordCountMax": 2200,
  "factualAnchors": ["конкретная цифра или факт с источником"]
}

Правила заполнения:
- exactPhrases: 3-6 фраз из Вордстата выше, суммарно не больше 12 точных вхождений.
  Главный ключ сюда не ставь — его бюджет задан отдельно.
- interlinks: только адреса из списка занятых ключей выше. Ничего не выдумывай.`

const t0 = Date.now()
console.log(`[probe] Занятых ключей ${tv.stopList.length}, дожим ${tv.pushUp.length}`)

const draftRaw = await askClaude(
  `Составь техническое задание на SEO-статью для job board d-pub.ru.
Ты отвечаешь за данные: частотность, коридор спроса, риск каннибализации.

${task}`,
  'analyst'
)
const dm = draftRaw.match(/\{[\s\S]*\}/)
console.log(`[probe] Аналитик: ${Math.round((Date.now() - t0) / 1000)}с, JSON ${dm ? 'найден' : 'НЕТ'}`)
if (!dm) {
  console.log(draftRaw.slice(0, 800))
  process.exit(1)
}
const draft = JSON.parse(dm[0])
console.log('[probe] Аналитик отдал:', JSON.stringify(draft, null, 1).slice(0, 1200))

const t1 = Date.now()
const agreedRaw = await askClaude(
  `Прими или поправь техническое задание на SEO-статью для d-pub.ru.
Верни ИТОГОВЫЙ JSON того же вида целиком.

ТЗ ОТ АНАЛИТИКА:
${JSON.stringify(draft, null, 2)}

${task}

Проверь: title до 60 символов, description 130-155, ни один занятый ключ не попал
в exactPhrases, каждый адрес из interlinks есть в списке занятых ключей.`,
  'seo'
)
const am = agreedRaw.match(/\{[\s\S]*\}/)
console.log(`[probe] SEO: ${Math.round((Date.now() - t1) / 1000)}с, JSON ${am ? 'найден' : 'НЕТ'}`)
if (!am) {
  console.log(agreedRaw.slice(0, 800))
  process.exit(1)
}
const agreed = JSON.parse(am[0])
console.log('[probe] SEO отдал:', JSON.stringify(agreed, null, 1).slice(0, 1500))

const owners = [...new Set(tv.stopList.map((k) => k.relevantUrl))]
const bogus = (agreed.interlinks ?? []).filter((u: string) => !owners.includes(u))
const stopInExact = (agreed.exactPhrases ?? []).filter((p: { phrase: string }) =>
  tv.stopList.some((s) => s.keyword === p.phrase)
)
const totalUses = (agreed.exactPhrases ?? []).reduce(
  (s: number, p: { uses: number }) => s + (p.uses || 0),
  0
)

console.log(
  `\n[probe] ВЕРДИКТ: title ${agreed.metaTitle?.length} симв, desc ${agreed.metaDesc?.length} симв, ` +
    `точных вхождений ${totalUses}, выдуманных ссылок ${bogus.length}, занятых в exact ${stopInExact.length}`
)
fs.writeFileSync('/tmp/tz-probe.json', JSON.stringify({ draft, agreed }, null, 2))
