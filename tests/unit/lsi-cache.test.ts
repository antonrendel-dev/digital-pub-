import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  MAX_CACHE_AGE_DAYS,
  isFresh,
  lookupPhrases,
  savePhrases,
} from '../../scripts/content-factory/lib/lsi-cache'

const NOW = new Date('2026-08-21T08:00:00Z')

let dir: string
const write = (name: string, data: unknown): string => {
  const file = path.join(dir, name)
  fs.writeFileSync(file, JSON.stringify(data), 'utf-8')
  return file
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsi-cache-'))
})
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

describe('isFresh', () => {
  it('пускает свежий замер и заворачивает протухший', () => {
    expect(isFresh('2026-08-01T00:00:00Z', NOW, MAX_CACHE_AGE_DAYS)).toBe(true)
    expect(isFresh('2025-01-01T00:00:00Z', NOW, MAX_CACHE_AGE_DAYS)).toBe(false)
  })

  it('без даты и с мусором вместо даты считает замер непригодным', () => {
    expect(isFresh(undefined, NOW, MAX_CACHE_AGE_DAYS)).toBe(false)
    expect(isFresh('позавчера', NOW, MAX_CACHE_AGE_DAYS)).toBe(false)
  })
})

describe('lookupPhrases', () => {
  const bank = {
    updatedAt: '2026-08-20T10:00:00Z',
    seeds: {
      'резюме таргетолога': {
        volume: 480,
        nested: [
          { phrase: 'резюме таргетолога образец', count: 210 },
          { phrase: 'резюме таргетолога без опыта', count: 0 },
        ],
      },
      'пустой ключ': { volume: 100, nested: [] },
    },
  }

  it('находит фразы и отбрасывает нулевые', () => {
    const hit = lookupPhrases([write('bank.json', bank)], 'резюме таргетолога', NOW)
    expect(hit?.nested).toEqual([{ phrase: 'резюме таргетолога образец', count: 210 }])
    expect(hit?.source).toBe('bank.json')
  })

  it('ищет без учёта регистра и ё', () => {
    const file = write('bank.json', {
      updatedAt: '2026-08-20T10:00:00Z',
      seeds: { 'ключевые навыки': { nested: [{ phrase: 'ключевые навыки в резюме', count: 90 }] } },
    })
    expect(lookupPhrases([file], 'Ключевые Навыки', NOW)).not.toBeNull()
  })

  it('молчит, когда ключа нет или вложенные фразы пусты', () => {
    const file = write('bank.json', bank)
    expect(lookupPhrases([file], 'ключ которого нет', NOW)).toBeNull()
    expect(lookupPhrases([file], 'пустой ключ', NOW)).toBeNull()
  })

  it('не отдаёт протухший банк — ключ пойдёт на живой замер', () => {
    const stale = write('stale.json', { ...bank, updatedAt: '2024-01-01T00:00:00Z' })
    expect(lookupPhrases([stale], 'резюме таргетолога', NOW)).toBeNull()
  })

  it('дата записи важнее даты файла', () => {
    const file = write('bank.json', {
      updatedAt: '2024-01-01T00:00:00Z',
      seeds: {
        свежий: {
          nested: [{ phrase: 'свежий ключ', count: 50 }],
          measuredAt: '2026-08-19T00:00:00Z',
        },
      },
    })
    expect(lookupPhrases([file], 'свежий', NOW)).not.toBeNull()
  })

  it('порядок файлов — это приоритет', () => {
    const first = write('cache.json', {
      updatedAt: '2026-08-21T00:00:00Z',
      seeds: { ключ: { nested: [{ phrase: 'из кэша', count: 10 }] } },
    })
    const second = write('bank.json', {
      updatedAt: '2026-08-20T00:00:00Z',
      seeds: { ключ: { nested: [{ phrase: 'из банка', count: 20 }] } },
    })
    expect(lookupPhrases([first, second], 'ключ', NOW)?.nested[0].phrase).toBe('из кэша')
  })

  it('переживает отсутствующий и битый файл', () => {
    const broken = path.join(dir, 'broken.json')
    fs.writeFileSync(broken, '{не json', 'utf-8')
    const good = write('bank.json', bank)

    expect(
      lookupPhrases([path.join(dir, 'нет.json'), broken, good], 'резюме таргетолога', NOW)
    ).not.toBeNull()
  })
})

describe('savePhrases', () => {
  it('пишет замер и отдаёт его обратно при поиске', () => {
    const file = path.join(dir, 'cache.json')
    savePhrases(
      file,
      'как стать тестировщиком',
      [{ phrase: 'как стать тестировщиком с нуля', count: 300 }],
      NOW
    )

    expect(lookupPhrases([file], 'как стать тестировщиком', NOW)?.nested).toEqual([
      { phrase: 'как стать тестировщиком с нуля', count: 300 },
    ])
  })

  it('не создаёт файл ради пустого ответа Вордстата', () => {
    const file = path.join(dir, 'cache.json')
    savePhrases(file, 'мёртвый ключ', [], NOW)
    expect(fs.existsSync(file)).toBe(false)
  })

  it('дописывает к существующему кэшу, не затирая соседей', () => {
    const file = path.join(dir, 'cache.json')
    savePhrases(file, 'первый', [{ phrase: 'первый ключ', count: 10 }], NOW)
    savePhrases(file, 'второй', [{ phrase: 'второй ключ', count: 20 }], NOW)

    expect(lookupPhrases([file], 'первый', NOW)).not.toBeNull()
    expect(lookupPhrases([file], 'второй', NOW)).not.toBeNull()
  })
})
