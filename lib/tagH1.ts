const y = new Date().getFullYear()

// Точечные переопределения <title> для /vacancies/[category]
// (приоритетнее Payload seoTitle — SEO-заголовки версионируются в git)
export const TAG_TITLE: Record<string, string> = {
  seo: `Вакансии SEO-специалиста ${y} — свежие из Telegram, удалённо и офис`,
}

// Переопределения <title> и H1 для /resumes/tag/[tagSlug]
export const RESUME_TAG_TITLE: Record<string, string> = {
  smm: `Резюме SMM-специалистов ${y} — база кандидатов | Диджитал Паб`,
}

export const RESUME_TAG_H1: Record<string, string> = {
  smm: `Резюме SMM-специалистов`,
}

export const TAG_H1: Record<string, string> = {
  smm: `Вакансии SMM-менеджера — удалённо и офис ${y}`,
  marketing: `Вакансии маркетолога — digital и интернет-маркетинг ${y}`,
  dizajn: `Вакансии дизайнера — UI/UX, графика, веб ${y}`,
  seo: `Вакансии SEO-специалиста — продвижение сайтов ${y}`,
  target: `Вакансии таргетолога — Яндекс Директ и ВКонтакте ${y}`,
  razrabotka: `Вакансии разработчика — frontend, backend, fullstack ${y}`,
  analitika: `Вакансии аналитика данных — веб, продуктовый, data ${y}`,
  copywriting: `Вакансии копирайтера — тексты, редактура, контент ${y}`,
  content: `Вакансии контент-менеджера и контент-мейкера ${y}`,
  kreativ: `Вакансии арт-директора и креативного директора ${y}`,
  menedzher: `Вакансии менеджера проектов — digital и IT ${y}`,
  finansy: `Вакансии финансового аналитика и бухгалтера в digital ${y}`,
  product: `Вакансии продакт-менеджера — product manager, owner ${y}`,
  udalyonka: `Удалённая работа в digital — актуальные вакансии ${y}`,
  ofis: `Работа в офисе для digital-специалистов ${y}`,
  gibrid: `Гибридная работа в digital — вакансии ${y}`,
  junior: `Вакансии junior-специалистов в digital ${y}`,
  middle: `Вакансии middle-специалистов в digital ${y}`,
  senior: `Вакансии senior-специалистов в digital — удалённо и офис ${y}`,
}
