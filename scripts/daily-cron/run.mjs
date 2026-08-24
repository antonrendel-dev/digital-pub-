/**
 * Ежедневный крон задач: утром решает, что делать, и пишет об этом в Telegram.
 *
 * Порядок такой. Сначала размечает баллом задачи, у которых его нет, — иначе
 * они никогда не попадут в очередь. Потом смотрит на замок: если вчерашняя
 * задача ещё не в «Готово», новую не берёт. Если свободен — предлагает верхнюю
 * по баллу из тех, что помечены «авто» или «вопрос».
 *
 * Задачи с меткой «тони» не предлагаются никогда: сдвинуть их крон всё равно
 * не может, а всплывать каждое утро они будут.
 */
import { decide, labelOf, needScoring } from './select.compiled.mjs'
import { render } from './message.compiled.mjs'
import { draftScoreLine } from './lib/score.mjs'
import { clearLock, readLock, writeLock } from './lib/state.mjs'
import { listOpenTasks, loadToken, updateDescription } from '../seo-audit/lib/todoist.mjs'
import { sendLongMessage } from '../seo-audit/lib/telegram.mjs'

/** Разметка новых задач. Балл черновой и помечен как черновой. */
async function scoreNewTasks(token, tasks) {
  const pending = needScoring(tasks)
  const done = []
  for (const t of pending) {
    const desc = `${draftScoreLine(t)}${t.description || ''}`
    await updateDescription(token, t.id, desc)
    t.description = desc
    done.push(t.content)
  }
  if (done.length) console.log(`[daily] Размечено новых задач: ${done.length}`)
  return done
}

export async function run(nowIso = new Date().toISOString()) {
  const token = loadToken()
  const tasks = await listOpenTasks(token)

  const scored = await scoreNewTasks(token, tasks)

  const lock = readLock()
  const decision = decide(tasks, lock, nowIso)

  // Замок ставится в момент предложения, а не после ответа: если Тони скажет
  // «делай» через час, крон к тому времени уже забудет, что предлагал.
  if (decision.kind === 'offer') {
    writeLock({ taskId: decision.task.id, title: decision.task.content, startedAt: nowIso })
  } else if (decision.kind === 'continue' || decision.kind === 'stale') {
    // Замок остаётся как есть.
  } else {
    clearLock()
  }

  let text = render(decision)
  if (scored.length) {
    text += `\n\n🏷 Разметил баллом новых задач: ${scored.length}. Оценка черновая, уточнить руками.`
  }

  console.log(`[daily] Решение: ${decision.kind}`)
  await sendLongMessage(text)
  return decision
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await run()
}
