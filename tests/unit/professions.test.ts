import fs from 'fs'
import path from 'path'
import { KEYWORD_MAP } from '../../lib/keyword-map'
import {
  PROFESSIONS,
  PROFESSION_SLUGS,
  PROFESSION_PREVIEW_LIMIT,
  professionsByTool,
} from '../../lib/professions'
import { SITE_NAME } from '../../lib/seoTitle'

/**
 * Раздел профессий создан 25.08.2026 переездом с /tools, где 18 страниц давали
 * 340 показов и 9 кликов за квартал. Проверки ниже держат те условия, при
 * которых переезд имеет смысл: страница профессии не должна превратиться
 * во второй листинг вакансий, а раздел — во вторую свалку под нулевой спрос.
 */
describe('раздел профессий', () => {
  const professions = Object.values(PROFESSIONS)

  it('каждая профессия зарегистрирована в реестре ключей', () => {
    // Иначе не сработает защита от каннибализации: страница вне реестра может
    // молча забрать чужой ключ.
    const missing = PROFESSION_SLUGS.filter((slug) => !KEYWORD_MAP[`/professions/${slug}`])
    expect(missing).toEqual([])
  })

  it('ключ из реестра совпадает с ключом карточки', () => {
    for (const p of professions) {
      expect(KEYWORD_MAP[`/professions/${p.slug}`].main).toBe(p.mainKeyword)
    }
  })

  it('превью вакансий ограничено пятью', () => {
    // Двадцать карточек превращают страницу профессии в листинг, и она начинает
    // конкурировать с /vacancies/{направление} содержимым, а не только заголовком.
    expect(PROFESSION_PREVIEW_LIMIT).toBe(5)
  })

  it('title влезает в сниппет вместе с суффиксом', () => {
    const tooLong = professions
      .map((p) => `${p.metaTitle} | ${SITE_NAME}`)
      .filter((t) => t.length > 65)
    expect(tooLong).toEqual([])
  })

  it('профессия попадает в раздел только с живым ресурсом вакансий', () => {
    // Порог 15: страница-обещание без вакансий хуже её отсутствия — это soft-404.
    // Ровно на этом отсеялись графический дизайнер (6 301 спроса, 1 вакансия)
    // и ретушёр (327 спроса, 0 вакансий).
    const thin = professions
      .filter((p) => p.vacanciesAtMeasure < 15)
      .map((p) => `${p.slug}: ${p.vacanciesAtMeasure}`)
    expect(thin).toEqual([])
  })

  it('вилка зарплат публикуется только при достаточной выборке', () => {
    // Выдуманная медиана уезжает в разметку Occupation и становится обещанием.
    const weak = professions
      .filter((p) => p.salary && p.salary.sample < 15)
      .map((p) => `${p.slug}: выборка ${p.salary?.sample}`)
    expect(weak).toEqual([])
  })

  it('вилка зарплат упорядочена', () => {
    for (const p of professions) {
      if (!p.salary) continue
      expect(p.salary.p25).toBeLessThanOrEqual(p.salary.median)
      expect(p.salary.median).toBeLessThanOrEqual(p.salary.p75)
    }
  })

  it('карточка профессии не размечена как ItemList', () => {
    // Разметка — самый однозначный сигнал типа страницы. ItemList говорит
    // «это перечень» и стирает разницу между профессией и листингом.
    const src = fs.readFileSync(
      path.join(process.cwd(), 'app', '(main)', 'professions', '[slug]', 'page.tsx'),
      'utf8'
    )
    expect(src).toContain("'@type': 'Occupation'")
    expect(src).not.toContain("'@type': 'ItemList'")
  })

  it('ссылка на листинг ведёт на существующий раздел', () => {
    // /vacancies/videomontazher объявлен в коде, но отдаёт 404 — такие ссылки
    // на карточках недопустимы.
    const dead = professions
      .filter((p) => p.relatedListing.href.includes('videomontazher'))
      .map((p) => p.slug)
    expect(dead).toEqual([])
  })

  it('мост между инструментом и профессией двусторонний', () => {
    // Если инструмент назван на карточке профессии, обратный индекс обязан
    // вернуть эту профессию — иначе половина моста висит в воздухе.
    for (const p of professions) {
      for (const tool of p.tools) {
        if (!tool.toolSlug) continue
        const back = professionsByTool(tool.toolSlug).map((x) => x.profession.slug)
        expect(back).toContain(p.slug)
      }
    }
  })

  /**
   * Ловушка, на которой раздел уже один раз ошибся 25.08.2026: широкая подстрока
   * находит вакансии, где слово стоит в требованиях, а не в должности. Голое
   * «reels» дало 373 совпадения — это SMM-вакансии, где Reels упомянут строкой.
   * «презентац» — 147, в основном «подготовить презентацию для клиента»
   * у менеджеров. Тот же механизм завышал WordPress (19 против 2 настоящих).
   */
  const MENTION_TRAPS = ['рилс', 'reels', 'презентац', 'монтаж', 'дизайн', 'tilda', 'wordpress']

  it('точные фразы не сводятся к широкой подстроке-ловушке', () => {
    const traps: string[] = []
    for (const p of professions) {
      for (const phrase of p.phrases) {
        if (MENTION_TRAPS.includes(phrase.toLowerCase().trim())) {
          traps.push(`${p.slug}: «${phrase}»`)
        }
      }
    }
    expect(traps).toEqual([])
  })

  it('у каждой профессии есть точные фразы для отсева', () => {
    // Без них выборка отдаёт то, что вернул Payload, а он дробит многословный
    // запрос на отдельные слова и ловит чужие вакансии.
    const without = professions.filter((p) => p.phrases.length === 0).map((p) => p.slug)
    expect(without).toEqual([])
  })

  /**
   * Три шлюза отбора инструментов. Повод — претензия владельца 25.08.2026:
   * «в рилсмейкере написано Съёмка, Нейросети, Figma — причём тут Figma?»
   * и «в веб-дизайнере что делает Photoshop, в 2026 году сайты в нём не рисуют».
   * Оба попали в блок как статистический шум: Figma 16,1% при фоне 9,2%,
   * Photoshop 8,7% при двух упоминаниях.
   */
  const BASELINE: Record<string, number> = {
    Figma: 0.092,
    Нейросети: 0.216,
    // 8,8% — по той же регулярке, которой считаны сами счётчики (съемк|съёмк).
    // Более широкий вариант даёт 11,4%, но смешивать замеры разных регулярок
    // нельзя: доля и фон обязаны считаться одинаково, иначе порог врёт.
    Съёмка: 0.088,
    CapCut: 0.056,
    Photoshop: 0.035,
    Tilda: 0.026,
    Canva: 0.042,
    'Premiere Pro': 0.023,
  }

  it('инструмент в блоке превышает фон по базе, а не просто част', () => {
    const weak: string[] = []
    for (const p of professions) {
      for (const tool of p.tools) {
        const share = tool.count / p.vacanciesAtMeasure
        const bg = BASELINE[tool.name]
        if (share < 0.15) weak.push(`${p.slug}/${tool.name}: доля ${(share * 100).toFixed(1)}%`)
        else if (bg && share / bg < 1.8)
          weak.push(`${p.slug}/${tool.name}: превышение ×${(share / bg).toFixed(1)}`)
        else if (tool.count < 2) weak.push(`${p.slug}/${tool.name}: ${tool.count} вакансия`)
      }
    }
    expect(weak).toEqual([])
  })

  it('блок инструментов либо пуст, либо содержателен', () => {
    // Блок с одной строкой выглядит сломанным. Либо два инструмента и больше,
    // либо не показываем вовсе — у проджекта и сценариста фон не превысил никто.
    const lonely = professions
      .filter((p) => p.tools.length === 1 && p.vacanciesAtMeasure > 40)
      .map((p) => `${p.slug}: ${p.tools.length}`)
    expect(lonely.length).toBeLessThanOrEqual(1)
  })

  it('счётчики инструментов не превышают числа вакансий профессии', () => {
    const broken: string[] = []
    for (const p of professions) {
      for (const tool of p.tools) {
        if (tool.count > p.vacanciesAtMeasure) {
          broken.push(`${p.slug}/${tool.name}: ${tool.count} > ${p.vacanciesAtMeasure}`)
        }
      }
    }
    expect(broken).toEqual([])
  })
})
