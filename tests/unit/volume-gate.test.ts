import {
  KEY_TYPES,
  MIN_VOLUME,
  applyVolumeGate,
  keysToMeasure,
} from '../../scripts/seo-audit/volume-gate'
import type { Finding } from '../../scripts/seo-audit/findings'

const f = (type: Finding['type'], key: string): Finding => ({
  type,
  key,
  title: `Ключ «${key}»`,
  detail: '',
  dedupKey: `${type}:${key}`,
  score: { s: 1, g: 1, r: 1, a: 1, total: 4 },
})

/** Настоящие цифры трёх пачек, на которых гейт и понадобился. */
const REAL = {
  'таргетолог вакансии': 489,
  'вакансии senior удалённо': 12,
  'senior специалист без опыта руководства': 0,
  'телеграм канал smm вакансии': 1,
  'как составить резюме smm': 0,
}

describe('гейт частотности SEO-крона', () => {
  it('режет ключи ниже порога и оставляет настоящий', () => {
    const findings = Object.keys(REAL).map((k) => f('position-drop', k))
    const { kept, dropped } = applyVolumeGate(findings, REAL)
    expect(kept.map((x) => x.key)).toEqual(['таргетолог вакансии'])
    expect(dropped).toHaveLength(4)
  })

  it('частотность попадает в заголовок — решение видно из карточки', () => {
    const { kept } = applyVolumeGate([f('near-top10', 'мидл вакансии')], { 'мидл вакансии': 210 })
    expect(kept[0].title).toContain('210/мес')
  })

  it('неизвестная частотность НЕ режет находку', () => {
    const { kept, dropped } = applyVolumeGate([f('left-top10', 'ключ без замера')], {})
    expect(kept).toHaveLength(1)
    expect(dropped).toHaveLength(0)
  })

  it('находки не про ключи гейт не трогает', () => {
    const page = f('article-not-read', '/articles/что-то')
    const { kept } = applyVolumeGate([page], {})
    expect(kept).toEqual([page])
    expect(KEY_TYPES.has('article-not-read')).toBe(false)
  })

  it('ровно на пороге — оставляем', () => {
    const { kept } = applyVolumeGate([f('zero-clicks', 'на границе')], { 'на границе': MIN_VOLUME })
    expect(kept).toHaveLength(1)
  })

  it('на замер идут только ключевые находки, без повторов', () => {
    const list = [
      f('position-drop', 'а'),
      f('near-top10', 'а'),
      f('article-not-ranked', '/articles/б'),
    ]
    expect(keysToMeasure(list)).toEqual(['а'])
  })
})
