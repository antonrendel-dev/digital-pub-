import { CHARS_PER_MINUTE, MIN_SECONDS, countsAsRead, requiredSeconds } from '@/lib/read-depth'

describe('порог дочитывания', () => {
  it('пролистывание до низа за пару секунд чтением не считается', () => {
    // 12 000 знаков — десять минут чтения. Две секунды это не чтение.
    expect(countsAsRead(12_000, 2)).toBe(false)
  })

  it('треть ожидаемого времени засчитывается', () => {
    const chars = 12_000
    const full = (chars / CHARS_PER_MINUTE) * 60 // 600 секунд
    expect(countsAsRead(chars, full / 3)).toBe(true)
    expect(countsAsRead(chars, full / 3 - 1)).toBe(false)
  })

  it('у короткой заметки порог не проваливается ниже нижней границы', () => {
    // 300 знаков — 15 секунд чтения, треть от них 5 секунд. Столько мало
    // для любого текста, поэтому работает нижняя граница.
    expect(requiredSeconds(300)).toBe(MIN_SECONDS)
    expect(countsAsRead(300, 5)).toBe(false)
    expect(countsAsRead(300, MIN_SECONDS)).toBe(true)
  })

  it('чем длиннее статья, тем больше нужно времени', () => {
    expect(requiredSeconds(30_000)).toBeGreaterThan(requiredSeconds(10_000))
  })

  it('нулевая и отрицательная длина не роняют расчёт', () => {
    expect(requiredSeconds(0)).toBe(MIN_SECONDS)
    expect(requiredSeconds(-100)).toBe(MIN_SECONDS)
  })
})
