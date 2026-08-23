import { cachedShard, resetShardCache } from '../../lib/sitemap/cache'

beforeEach(() => resetShardCache())

describe('cachedShard', () => {
  it('второй вызов в пределах TTL не пересобирает', async () => {
    const build = jest.fn().mockResolvedValue(['a'])
    expect(await cachedShard('k', build)).toEqual(['a'])
    expect(await cachedShard('k', build)).toEqual(['a'])
    expect(build).toHaveBeenCalledTimes(1)
  })

  it('ключи не смешиваются', async () => {
    await cachedShard('vacancies', async () => ['v'])
    await cachedShard('resumes', async () => ['r'])
    expect(await cachedShard('vacancies', async () => ['другое'])).toEqual(['v'])
  })

  // Главное свойство: пустой сайтмап читается роботом как «страниц больше нет».
  // Пока в памяти есть прошлая удачная сборка, сбой базы обязан отдавать её.
  it('при сбое отдаёт прошлую удачную сборку, а не пустоту', async () => {
    jest.useFakeTimers()
    try {
      await cachedShard('k', async () => ['живой адрес'])
      jest.advanceTimersByTime(11 * 60 * 1000) // TTL истёк

      const failing = jest.fn().mockRejectedValue(new Error('база недоступна'))
      expect(await cachedShard('k', failing)).toEqual(['живой адрес'])
      expect(failing).toHaveBeenCalledTimes(1)
    } finally {
      jest.useRealTimers()
    }
  })

  it('без прошлой сборки сбой пробрасывается, а не превращается в пустой массив', async () => {
    await expect(cachedShard('k', async () => Promise.reject(new Error('бум')))).rejects.toThrow(
      'бум'
    )
  })

  it('после TTL пересобирает', async () => {
    jest.useFakeTimers()
    try {
      const build = jest.fn().mockResolvedValueOnce(['старое']).mockResolvedValueOnce(['новое'])
      expect(await cachedShard('k', build)).toEqual(['старое'])
      jest.advanceTimersByTime(11 * 60 * 1000)
      expect(await cachedShard('k', build)).toEqual(['новое'])
    } finally {
      jest.useRealTimers()
    }
  })
})
