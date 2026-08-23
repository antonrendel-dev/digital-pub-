/**
 * Память последней удачной сборки шарда.
 *
 * Зачем она есть. Сайтмапы вакансий и резюме держатся только на базе, а база
 * недоступна из раннера GitHub Actions — в логе сборки 23.08.2026 прямым
 * текстом `getaddrinfo ENOTFOUND postgres.***.h2`. Значит при статической
 * пререндеринге на прод каждый раз уезжал пустой артефакт, и до первой
 * ревалидации на сервере робот получал сайтмап без единого адреса. Яндекс
 * попал ровно в это окно: в панели у /sitemap/1.xml и /sitemap/2.xml
 * записано 0 URL при 1333 и 347 живых.
 *
 * Поэтому маршрут переведён в force-dynamic — пустого артефакта больше нет
 * вовсе, — а частые обращения гасит этот кэш. Он же страхует от сбоя базы:
 * пока в памяти есть прошлая удачная сборка, отдаём её, а не пустоту.
 */

const TTL_MS = 10 * 60 * 1000

interface Entry<T> {
  at: number
  value: T
}

const store = new Map<string, Entry<unknown>>()

export async function cachedShard<T>(key: string, build: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value

  try {
    const value = await build()
    store.set(key, { at: Date.now(), value })
    return value
  } catch (e) {
    // Протухшая, но настоящая выдача лучше пустой: пустой сайтмап читается как
    // «этих страниц больше нет».
    if (hit) {
      console.warn(`[sitemap:${key}] сборка не удалась, отдаю прошлую удачную`)
      return hit.value
    }
    throw e
  }
}

/** Только для тестов: между кейсами память не должна протекать. */
export function resetShardCache() {
  store.clear()
}
