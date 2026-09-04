import {
  LEAD_MAX_WORDS,
  bodyStart,
  extractArticleBody,
  keepLead,
} from '../../scripts/content-factory/lib/article-body'
import { hasServiceText } from '../../lib/strip-service-tail'

const HOOK =
  '39,1% выпускников вузов, искавших работу, назвали отсутствие опыта одной из главных трудностей — Росстат.'
const BODY =
  '## Что такое резюме без опыта работы образец и зачем оно нужно?\n\nРезюме начинающего специалиста — документ, в котором потенциал подтверждают проектами.\n\n## Как заполнить за три шага?\n\nТекст раздела.'

/** Форма компилятора (шаг 3б), стенограмма 2026-09-04-208 — файл 09. */
const RAW_COMPILER = `**Title:** Резюме без опыта работы образец: как заполнить документ
**Meta description:** Резюме без опыта работы образец для студента и выпускника: структура, готовые формулировки.

# Резюме без опыта работы образец для студента и выпускника

${HOOK}

На самом деле работодателю не всегда нужен кандидат с записью в трудовой. Ему нужно понять, справитесь ли вы с задачей.

${BODY}
`

describe('extractArticleBody — форма компилятора', () => {
  it('крючок остаётся, Title/Meta и H1 уходят, тело начинается с первого H2', () => {
    const r = extractArticleBody(RAW_COMPILER)
    expect(r.lead).toBe(
      `${HOOK}\n\nНа самом деле работодателю не всегда нужен кандидат с записью в трудовой. Ему нужно понять, справитесь ли вы с задачей.`
    )
    expect(r.body).toBe(BODY)
    expect(r.markdown).toBe(`${r.lead}\n\n${r.body}`)
    expect(r.markdown).not.toMatch(/Title|Meta description|^# /m)
    expect(r.dropped).toBeUndefined()
    expect(r.filtered).toEqual([])
  })

  it('результат проходит проверку на служебный текст, которой публикация ловит хвост', () => {
    expect(hasServiceText(extractArticleBody(RAW_COMPILER).markdown)).toBe(false)
  })
})

/** Три реальные формы SEO-ревью (шаг 4) из стенограмм 08-31 … 09-04, файл 11. */
describe('extractArticleBody — формы SEO-ревью', () => {
  it('YAML-frontmatter с любыми ключами выбрасывается целиком (09-02, 09-03)', () => {
    const r = extractArticleBody(
      `---\ntitle: "Резюме программиста: 8 разделов"\ndescription: "Резюме программиста в 2026 году"\nslug: "x"\n---\n\n${HOOK}\n\n${BODY}`
    )
    expect(r.lead).toBe(HOOK)
    expect(r.body).toBe(BODY)
  })

  it('META TITLE / META DESCRIPTION без болда (08-31, 09-01)', () => {
    const r = extractArticleBody(
      `META TITLE: Нейросети для дизайнеров: 8 AI-навыков\n\nMETA DESCRIPTION: Нейросети для дизайнеров и что с ними делать\n\n# Какие AI-навыки нужны дизайнеру?\n\n${HOOK}\n\n${BODY}`
    )
    expect(r.lead).toBe(HOOK)
    expect(r.markdown).not.toMatch(/META/)
  })

  it('**Meta title:** болдом (09-04)', () => {
    const r = extractArticleBody(
      `\n**Meta title:** Резюме без опыта: 3 шага\n\n**Meta description:** Резюме без опыта для digital\n\n# H1\n\n${HOOK}\n\n${BODY}`
    )
    expect(r.lead).toBe(HOOK)
  })

  it('две черты вокруг крючка — не frontmatter; frontmatter после болтовни снимается', () => {
    const r1 = extractArticleBody(`---\n\n${HOOK}\n\n---\n\n${BODY}`)
    expect(r1.lead).toBe(HOOK)
    const r2 = extractArticleBody(
      `Вот статья:\n\n---\nslug: "y"\ntitle: "t"\n---\n\n${HOOK}\n\n${BODY}`
    )
    expect(r2.lead).toBe(HOOK)
    expect(r2.markdown).not.toMatch(/slug/)
  })

  it('пустой лейбл через пустую строку не съедает крючок', () => {
    const r = extractArticleBody(`**Meta description:**\n\n${HOOK}\n\n${BODY}`)
    expect(r.lead).toBe(HOOK)
  })

  it('лейблы с двоеточием вне болда, со скобкой, с отступом и со значением на следующей строке', () => {
    const r = extractArticleBody(
      `  **Title**: x\n**Title (H1):** y\n**Заголовок H1:** z\n**Meta description:**\nЗначение на следующей строке\n\n${HOOK}\n\n${BODY}`
    )
    expect(r.lead).toBe(HOOK)
    expect(r.dropped).toBeUndefined()
  })
})

describe('extractArticleBody — болтовня и структура', () => {
  it('метка роли [WRITER] и «Вот финальная статья:» не попадают в лид', () => {
    const r = extractArticleBody(`[WRITER]\n\nВот финальная статья:\n\n# H1\n\n${HOOK}\n\n${BODY}`)
    expect(r.lead).toBe(HOOK)
    expect(r.filtered).toEqual(['Вот финальная статья:'])
  })

  it('отчёт модели без двоеточия — тоже болтовня', () => {
    for (const chatter of [
      'Внёс правки по пунктам 3 и 8:',
      'Применил техники социального доказательства и дефицита. Статья ниже.',
      'Ниже — финальная версия статьи.',
      'Готово. Исправленный текст.',
      'Обновлённая статья',
      'Готово.',
      'Я применил две техники из библиотеки.',
      'Правки внесены по всем пунктам статьи.',
    ]) {
      const r = extractArticleBody(`${chatter}\n\n${HOOK}\n\n${BODY}`)
      expect(r.lead).toBe(HOOK)
      expect(r.filtered).toEqual([chatter])
    }
  })

  it('крючки, похожие на болтовню, остаются', () => {
    for (const hook of [
      'Вот почему 39% откликов новичков остаются без ответа.',
      '1 из 3 кандидатов без опыта не проходит первичный отбор.',
      'Title в резюме читают первым, а пишут последним.',
      '2026. Год, когда фильтр по опыту перестал работать.',
      '10. место занимает Россия по числу digital-вакансий на душу населения.',
      'Ниже среднего по рынку платят 40% стартовых вакансий.',
      'Итоговая зарплата джуна складывается из трёх частей.',
      'Обновление резюме раз в полгода — норма для 30% кандидатов.',
      'Исправление одной строки подняло отклики на 20%.',
      'Финальный отбор проходят 3 из 100.',
      'Добавили ссылку на портфолио — отклики выросли вдвое.',
    ]) {
      const r = extractArticleBody(`# H1\n\n${hook}\n\n${BODY}`)
      expect(r.lead).toBe(hook)
      expect(r.filtered).toEqual([])
    }
  })

  it('«### Что изменено» со списком до тела — не начало статьи и не лид', () => {
    const raw = `### Что изменено\n- правка\n\nКрючок.\n\n${BODY}`
    expect(bodyStart(raw)).toBe(raw.indexOf('## Что такое'))
    const r = extractArticleBody(raw)
    expect(r.lead).toBe('Крючок.')
    expect(r.filtered).toEqual(['### Что изменено', '- правка'])
  })

  it('ответ в fence: закрывающие бэктики не остаются в хвосте тела', () => {
    const r = extractArticleBody('```markdown\n' + `# H1\n\n${HOOK}\n\n${BODY}\n` + '```')
    expect(r.lead).toBe(HOOK)
    expect(r.body).toBe(BODY)
  })
})

describe('extractArticleBody — страховки', () => {
  it('без лида поведение прежнее — тело с первого H2', () => {
    const r = extractArticleBody(`**Title:** x\n# H1\n${BODY}`)
    expect(r.lead).toBe('')
    expect(r.markdown).toBe(BODY)
  })

  it('ответ без H2 вовсе возвращается целиком', () => {
    expect(extractArticleBody('Просто текст без заголовков').markdown).toBe(
      'Просто текст без заголовков'
    )
  })

  it('лид со служебным маркером отбрасывается, а не публикуется', () => {
    const r = extractArticleBody(`Готово для проверки агентом seo.\n\n${BODY}`)
    expect(r.lead).toBe('')
    expect(r.markdown).toBe(BODY)
  })

  it('преамбула длиннее лимита — это рассуждения модели, не крючок', () => {
    const long = Array.from({ length: LEAD_MAX_WORDS + 20 }, () => 'слово').join(' ')
    const r = extractArticleBody(`${long}\n\n${BODY}`)
    expect(r.lead).toBe('')
    expect(r.dropped).toBe('too-long')
  })
})

describe('keepLead', () => {
  it('строка на входе, строка на выходе, лид на месте', () => {
    expect(keepLead(RAW_COMPILER, 'тест')).toBe(extractArticleBody(RAW_COMPILER).markdown)
    expect(keepLead('', 'тест')).toBe('')
  })

  it('стадия вернула тело без лида — лид входа возвращается', () => {
    const previous = `${HOOK}\n\n${BODY}`
    expect(keepLead(`# H1\n\n${BODY}`, 'nudge', previous)).toBe(previous)
  })

  it('стадия написала свой лид — он и остаётся', () => {
    const previous = `${HOOK}\n\n${BODY}`
    expect(keepLead(`Новый крючок.\n\n${BODY}`, 'nudge', previous)).toBe(`Новый крючок.\n\n${BODY}`)
  })

  it('крючок переехал в первый раздел — сверху не дублируется', () => {
    const previous = `${HOOK}\n\n${BODY}`
    const moved = BODY.replace('\n\nРезюме начинающего', `\n\n${HOOK}\n\nРезюме начинающего`)
    expect(keepLead(`# H1\n\n${moved}`, 'SEO-ревью', previous)).toBe(moved)
  })

  it('пустой ответ стадии не получает чужой лид — guard по объёму вернёт исходник', () => {
    expect(keepLead('', 'nudge', `${HOOK}\n\n${BODY}`)).toBe('')
  })
})
