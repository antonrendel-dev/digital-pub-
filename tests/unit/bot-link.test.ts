import { botLink } from '../../lib/bot-link'

describe('ссылка на бота с меткой', () => {
  it('без уточнения даёт чистую метку места', () => {
    expect(botLink('nav')).toBe('https://t.me/resume_vac_bot?start=nav')
  })

  it('уточнение приклеивается через подчёркивание', () => {
    expect(botLink('vacancy_listing', 'smm')).toBe(
      'https://t.me/resume_vac_bot?start=vacancy_listing_smm'
    )
  })

  it('кириллица и слэши не доезжают до метки', () => {
    // Бот отбрасывает всё, кроме латиницы, цифр и подчёркивания: такая метка
    // потерялась бы молча, и переход выглядел бы как приход без источника.
    const link = botLink('vacancy_listing', 'смм/удалёнка')
    expect(link).toMatch(/^https:\/\/t\.me\/resume_vac_bot\?start=[a-z0-9_]+$/)
  })

  it('дефисы в слаге превращаются в подчёркивания', () => {
    expect(botLink('article', 'kak-nayti-rabotu')).toBe(
      'https://t.me/resume_vac_bot?start=article_kak_nayti_rabotu'
    )
  })

  it('длинный слаг обрезается, а не уезжает целиком', () => {
    const link = botLink('article', 'a'.repeat(200))
    const start = new URL(link).searchParams.get('start') ?? ''
    expect(start.length).toBeLessThanOrEqual(60)
  })

  it('метка всегда того алфавита, который принимает бот', () => {
    for (const detail of ['', 'ЮНИКОД', '../../etc', 'a b c', '—тире—']) {
      const start = new URL(botLink('footer', detail)).searchParams.get('start') ?? ''
      expect(start).toMatch(/^[a-z0-9_]+$/)
    }
  })
})

describe('на сайте не осталось непомеченных ссылок', () => {
  it('прямой адрес бота встречается только в хелпере', () => {
    // Голая ссылка снова сделала бы переход невидимым для отчёта, а заметить
    // это можно только через месяц, когда в отчёте вырастет «без метки».
    const fs = jest.requireActual('fs') as typeof import('fs')
    const path = jest.requireActual('path') as typeof import('path')
    const root = process.cwd()
    const files: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full)
      }
    }
    walk(path.join(root, 'app'))
    walk(path.join(root, 'components'))
    const offenders = files.filter((f) => {
      const src = fs.readFileSync(f, 'utf8')
      return /["']https:\/\/t\.me\/resume_vac_bot["']/.test(src)
    })
    expect(offenders.map((f) => path.relative(root, f))).toEqual([])
  })
})
