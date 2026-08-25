import { fillCount } from '../../lib/fill-count'
import { TAG_DESCRIPTION, TAG_TITLE } from '../../lib/tagH1'

/**
 * Ноль в заголовке — не косметика. «Вакансии директолога — 0: Яндекс Директ»
 * уехало в выдачу 25.08.2026, пока страница ждала первого рендера с базой.
 * Сниппет с нулём читается как «здесь пусто» и убивает клик даже там,
 * где вакансии на самом деле есть.
 */
describe('подстановка числа вакансий', () => {
  it('подставляет число, когда вакансии есть', () => {
    expect(fillCount('Вакансии junior в digital — {N}: SMM, дизайн', 21)).toBe(
      'Вакансии junior в digital — 21: SMM, дизайн'
    )
  })

  it('убирает плейсхолдер вместе с тире, когда вакансий нет', () => {
    expect(fillCount('Вакансии junior в digital — {N}: SMM, дизайн', 0)).toBe(
      'Вакансии junior в digital: SMM, дизайн'
    )
    expect(fillCount('Вакансии директолога — {N}: Яндекс Директ', 0)).toBe(
      'Вакансии директолога: Яндекс Директ'
    )
    expect(fillCount('Вакансии финансиста в digital — {N} вакансий', 0)).toBe(
      'Вакансии финансиста в digital вакансий'
    )
  })

  it('восстанавливает заглавную букву, если срезал начало', () => {
    // Описания часто начинаются с числа: «{N} вакансий аналитика в digital…»
    expect(fillCount('{N} вакансий аналитика в digital: веб-аналитика', 0)).toBe(
      'Вакансий аналитика в digital: веб-аналитика'
    )
  })

  it('не трогает строки без плейсхолдера', () => {
    const s = 'Вакансии видеомонтажёра — монтаж Reels, удалённо'
    expect(fillCount(s, 0)).toBe(s)
    expect(fillCount(s, 42)).toBe(s)
  })

  it('ни один реальный шаблон не даёт нуля в тексте', () => {
    const withZero: string[] = []
    for (const [slug, tpl] of [...Object.entries(TAG_TITLE), ...Object.entries(TAG_DESCRIPTION)]) {
      const rendered = fillCount(tpl, 0)
      if (/\b0\b/.test(rendered) || rendered.includes('{N}')) {
        withZero.push(`${slug}: ${rendered}`)
      }
    }
    expect(withZero).toEqual([])
  })

  it('не оставляет висящих разделителей и двойных пробелов', () => {
    const broken: string[] = []
    for (const [slug, tpl] of Object.entries(TAG_TITLE)) {
      const r = fillCount(tpl, 0)
      if (/\s{2,}/.test(r) || /[—–-]\s*:/.test(r) || /:\s*$/.test(r) || /[—–-]\s*$/.test(r)) {
        broken.push(`${slug}: «${r}»`)
      }
    }
    expect(broken).toEqual([])
  })
})
