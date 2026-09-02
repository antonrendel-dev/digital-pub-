/**
 * Вызов CLI-агента: запуск, откат на второй CLI, повторы с паузой.
 *
 * Вынесено из writer.ts 02.09.2026, когда появился второй потребитель —
 * инструмент дожима статей (boost.ts). Копировать сюда плумбинг спавна значило
 * бы завести вторую реализацию повторов и отката: они писались по живым
 * авариям (529 Overloaded 24.08, неизвестная модель у codex 28.08), и вторая
 * копия однажды отстанет от первой ровно в ночь, когда это будет важно.
 *
 * Здесь только механика запуска. Что писать в стенограмму и как называть шаг —
 * дело вызывающего: у писателя есть этапы и тема прогона, у дожима их нет.
 */

import { spawn } from 'child_process'
import {
  AGENT_CLI,
  buildAgentCommand,
  fallbackCli,
  isCliLevelFailure,
  supportsAgentProfiles,
} from './agent-cli.js'
import { loadAgentRole, stripRoleTag, withRole } from './agent-role.js'

export type AgentName = 'analyst' | 'seo' | 'writer'

/** Смотреть можно, трогать нельзя — агент не должен править репозиторий. */
export const AGENT_TOOLS = 'Read,Skill,Glob,Grep'

/**
 * Повторы с нарастающей паузой. Раньше была одна попытка через полминуты:
 * для разовой осечки CLI этого хватало, ради чего повтор и делался. Для волны
 * перегрузки на стороне API не хватало никогда — 24.08.2026 прогон упал на
 * 529 Overloaded, повторился через 30 секунд, получил тот же 529 и вышел.
 * Перегрузка живёт минуты, а не полминуты, поэтому шаг паузы растёт.
 */
export const CLAUDE_RETRY_DELAYS_MS = [30_000, 120_000, 300_000]

/** Исчерпанный лимит за эти паузы не восстановится, и повтор только тянет время. */
export const isQuotaExhausted = (message: string): boolean =>
  /out of (extra )?usage|usage limit reached|rate limit/i.test(message)

export interface AskOptions {
  agent?: AgentName
  /** Модель под конкретный CLI — у writer и analyst она берётся из lib/model. */
  modelFor: (cli: string) => string | undefined
  /** Куда класть пару «промпт — ответ». Без неё стенограмма просто не пишется. */
  record?: (agent: string, prompt: string, answer: string) => void
  /** Паузы между попытками; в тестах передают пустой массив. */
  retryDelaysMs?: number[]
}

function runOnce(
  prompt: string,
  agent: AgentName | undefined,
  cli: string,
  modelFor: (cli: string) => string | undefined
): Promise<string> {
  return new Promise((resolve, reject) => {
    // --allowedTools обязателен: с --agent, но без него скилл не загружается
    // и агент честно отвечает «доступ не выдан». Проверено живым прогоном.
    // Профили есть только у Claude Code. Если их нет, роль не исчезает молча,
    // а вкладывается в текст промпта — см. lib/agent-role.ts. Скиллы так не
    // переносятся, поэтому о них пишем в лог: молчаливая потеря стандарта
    // всплывает только на приёмке, и то не всегда.
    let effectivePrompt = prompt
    let agentFlag: string | undefined
    if (agent) {
      if (supportsAgentProfiles(cli, agent)) {
        agentFlag = agent
      } else {
        const role = loadAgentRole(agent)
        if (role) {
          effectivePrompt = withRole(prompt, role)
          if (role.skills.length > 0) {
            console.log(
              `    ⚠ ${agent}: роль передана текстом, скиллы не подключены (${role.skills.join(', ')})`
            )
          }
        } else {
          console.log(`    ⚠ ${agent}: профиль не найден, агент работает без роли`)
        }
      }
    }
    const { cmd, args } = buildAgentCommand(
      '',
      {
        model: modelFor(cli),
        agent: agentFlag,
        allowedTools: AGENT_TOOLS,
        promptViaStdin: true,
      },
      cli
    )
    // Промпт через stdin: аргументом argv длинные промпты бьются об ARG_MAX → spawn E2BIG
    const child = spawn(cmd, args, { env: process.env, stdio: ['pipe', 'pipe', 'pipe'] })
    child.stdin.write(effectivePrompt)
    child.stdin.end()
    let out = ''
    let err = ''
    child.stdout.on('data', (d: Buffer) => (out += d.toString()))
    child.stderr.on('data', (d: Buffer) => (err += d.toString()))
    child.on('close', (code) => {
      // Метку роли ([WRITER]/[ANALYST]) профиль печатает в каждом ответе — она
      // нужна в чате, но не в артефакте. Режем здесь, на общем выходе.
      if (code === 0) resolve(stripRoleTag(out.trim()))
      // Хвост stdout в тексте ошибки: CLI пишет причину отказа (упёрся в лимит,
      // агент отказался) именно туда, оставляя stderr пустым. Прогон 21.08 из-за
      // этого упал с одним лишь «код 1» и остался без диагноза.
      else
        reject(
          new Error(err.trim() || out.trim().slice(-500) || `${cmd} завершился с кодом ${code}`)
        )
    })
    child.on('error', reject)
  })
}

/**
 * Запуск с откатом на второй CLI.
 *
 * 28.08.2026 завод встал целиком: в .env стояла модель, которой установленный
 * codex не знает, и прогон умер на первом же вызове — статья за день не вышла.
 * Автономность означает, что на отказ уровня CLI завод переезжает на второй
 * и публикует, а не молчит до утра.
 *
 * Откат ровно один и только на ошибках запуска: если модель не справилась
 * с задачей по существу, второй CLI даст то же самое, а мы потратим второй
 * прогон и спрячем настоящую причину. Переезд всегда громкий — строкой в лог.
 */
async function runWithFallback(
  prompt: string,
  agent: AgentName | undefined,
  modelFor: (cli: string) => string | undefined
): Promise<string> {
  try {
    return await runOnce(prompt, agent, AGENT_CLI, modelFor)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const spare = isCliLevelFailure(message) ? fallbackCli(AGENT_CLI) : null
    if (!spare) throw e
    console.log(
      `    ⚠ ${AGENT_CLI} не смог запуститься (${message.slice(0, 160)}). Перехожу на ${spare}.`
    )
    return await runOnce(prompt, agent, spare, modelFor)
  }
}

/**
 * Спросить агента с повторами.
 *
 * Пустого ответа здесь не отбиваем: код возврата 0 при пустом stdout — случай
 * теоретический, а вводить отбойник в вынесенном коде значит менять поведение
 * писателя заодно с выносом. Потребители проверяют результат сами: boost видит
 * пустоту как SHRANK и LOST_HEADINGS.
 */
export async function askAgent(prompt: string, opts: AskOptions): Promise<string> {
  const delays = opts.retryDelaysMs ?? CLAUDE_RETRY_DELAYS_MS
  const total = delays.length + 1
  let last: unknown

  for (let attempt = 1; attempt <= total; attempt++) {
    try {
      const answer = await runWithFallback(prompt, opts.agent, opts.modelFor)
      // Стенограмма пишется здесь, а не в runOnce: там на каждый повтор лёг бы
      // отдельный файл, а интересен ответ, который пошёл в дело.
      opts.record?.(opts.agent ?? 'без-роли', prompt, answer)
      return answer
    } catch (e) {
      last = e
      const message = e instanceof Error ? e.message : String(e)
      if (isQuotaExhausted(message)) throw e
      if (attempt === total) break
      const pause = delays[attempt - 1]
      console.log(
        `    ⚠ попытка ${attempt}/${total} не удалась (${message.slice(0, 160)}). ` +
          `Жду ${Math.round(pause / 1000)} с.`
      )
      await new Promise((r) => setTimeout(r, pause))
    }
  }
  throw last
}
