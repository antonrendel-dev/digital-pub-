/**
 * Yandex Metrika goal tracking helper.
 * Safe to call on server (no-op) and client.
 */

const METRIKA_ID = 109131123

type YmFn = (...args: unknown[]) => void

export function reachGoal(goalName: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  ;(window as Window & { ym?: YmFn }).ym?.(METRIKA_ID, 'reachGoal', goalName, params)
}
