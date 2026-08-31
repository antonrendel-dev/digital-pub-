/**
 * unstable_cache в тестах — сквозной вызов.
 *
 * Настоящая обёртка требует рантайма Next: вне его она падает с «Invariant:
 * incrementalCache missing». Кэширование — свойство продакшена, а тесты
 * проверяют логику самих функций, поэтому здесь обёртка просто возвращает
 * исходную функцию.
 */
jest.mock('next/cache', () => ({
  ...jest.requireActual('next/cache'),
  unstable_cache:
    <T extends (...args: never[]) => unknown>(fn: T) =>
    (...args: Parameters<T>) =>
      fn(...args),
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}))

export {}
