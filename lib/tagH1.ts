const y = new Date().getFullYear()

// Точечные переопределения <title> для /vacancies/[category]
// (приоритетнее Payload seoTitle — SEO-заголовки версионируются в git)
// {N} — placeholder, заменяется на posts.length в generateMetadata
export const TAG_TITLE: Record<string, string> = {
  seo: `Вакансии SEO-специалиста — {N} актуальных, удалённо и офис`,
  udalyonka: `Удалённая работа в digital — {N} вакансий: SMM, дизайн, маркетинг`,
  smm: `Вакансии SMM-менеджера — {N} актуальных, удалёнка и офис`,
  marketing: `Вакансии маркетолога — digital и performance ${y}`,
  target: `Вакансии таргетолога — {N} актуальных, VK, Директ, Telegram Ads`,
  razrabotka: `Вакансии разработчика — {N} актуальных, frontend, backend, fullstack`,
  analitika: `Вакансии аналитика данных — {N} актуальных, веб, бизнес, продукт`,
  menedzher: `Вакансии менеджера в digital — {N}: проджект, аккаунт, продакт`,
  dizajn: `Вакансии дизайнера — {N} актуальных: UI/UX, веб, графика`,
  // Tool-specific pages
  figma: `Вакансии Figma — {N} актуальных, удалённо`,
  canva: `Вакансии Canva — дизайнер и SMM`,
  tilda: `Вакансии Tilda — {N} актуальных`,
  'yandex-direct': `Вакансии директолога — {N}, Яндекс Директ`,
  tablicy: `Вакансии Google Таблицы и Excel — {N}`,
}

// Точечные переопределения <description> для /vacancies/[category]
// (приоритетнее Payload seoDescription — версионируются в git)
export const TAG_DESCRIPTION: Record<string, string> = {
  seo: `{N} свежих вакансий SEO-специалиста: junior, middle, senior. Зарплаты указаны, отклик напрямую работодателю в Telegram, без регистрации. Обновляем ежедневно.`,
  udalyonka: `{N} вакансий на удалёнке: SMM, SEO, дизайн, таргет, аналитика, менеджмент. С зарплатами, без опыта. Отклик в Telegram напрямую. Обновление каждый день.`,
  smm: `{N} свежих вакансий SMM-менеджера и SMM-копирайтера: с зарплатами, удалённо и в офисе, для новичков и senior. Из 15 Telegram-каналов, обновление ежедневно.`,
  marketing: `Свежие вакансии маркетолога: digital, performance, контент, продуктовый. Зарплаты 50–280К, удалёнка и офис. Отклик напрямую в Telegram без регистрации.`,
  target: `{N} актуальных вакансий таргетолога: VK Реклама, Яндекс Директ, Telegram Ads. Удалённая работа и офис, зарплаты 40–240К. Свежие предложения каждый день.`,
  menedzher: `{N} вакансий менеджера в digital: проджект, продакт, аккаунт, контент-менеджер. С зарплатами, удалённо и офис. Свежие из Telegram-каналов, отклик напрямую.`,
  dizajn: `{N} вакансий дизайнера: UI/UX, веб, графический, моушн, Figma. Удалённо и в офисе, зарплаты 50–300К. Обновляем ежедневно из Telegram-каналов.`,
  razrabotka: `{N} свежих вакансий разработчика: frontend, backend, fullstack. React, Vue, Node.js, Python. Удалённо и офис, зарплаты от 80К. Обновляем ежедневно.`,
  analitika: `{N} актуальных вакансий аналитика: веб, продуктовый, data. GA, Метрика, SQL. Удалённо и офис, зарплаты 60–250К. Свежие из Telegram-каналов.`,
}

// Переопределения <title> и H1 для /resumes/tag/[tagSlug]
export const RESUME_TAG_TITLE: Record<string, string> = {
  smm: `Резюме SMM-специалистов ${y} — база кандидатов`,
  marketing: `Резюме маркетологов ${y} — digital, performance, CRM`,
}

export const RESUME_TAG_H1: Record<string, string> = {
  smm: `Резюме SMM-специалистов`,
  marketing: `Резюме маркетологов`,
}

export const RESUME_TAG_DESCRIPTION: Record<string, string> = {
  smm: `Резюме SMM-специалистов из Telegram: менеджеры, контент-мейкеры, таргетологи соцсетей. Удалённо и офис. База кандидатов без регистрации — Диджитал Паб.`,
  marketing: `Резюме маркетологов из Telegram: digital, performance, CRM, email-маркетинг. Зарплаты от 60К. Актуальные кандидаты без регистрации — Диджитал Паб.`,
  dizajn: `Резюме дизайнеров из Telegram: UI/UX, веб, графика, моушн, Figma. Опыт от 1 года. Актуальные кандидаты без регистрации — Диджитал Паб.`,
  target: `Резюме таргетологов из Telegram: VK Реклама, Яндекс Директ, Telegram Ads. Опыт ведения кампаний. Актуальная база кандидатов — Диджитал Паб.`,
  analitika: `Резюме аналитиков из Telegram: веб-аналитика, продуктовый анализ, data science. Опыт с GA, Метрикой, SQL. Актуальные кандидаты — Диджитал Паб.`,
  razrabotka: `Резюме разработчиков из Telegram: frontend, backend, fullstack, WordPress. React, Vue, Node.js. Актуальная база digital-кандидатов — Диджитал Паб.`,
  copywriting: `Резюме копирайтеров и редакторов из Telegram: SEO-тексты, сторителлинг, email-рассылки. Портфолио и опыт с брендами. Кандидаты — Диджитал Паб.`,
  content: `Резюме контент-менеджеров и контент-мейкеров из Telegram: ведение соцсетей, съёмка, монтаж, тексты. Актуальная база кандидатов — Диджитал Паб.`,
  hr: `Резюме HR-специалистов из Telegram: рекрутеры, HRD, HR Business Partner, T&D. Опыт в digital и IT-компаниях. Актуальная база кандидатов — Диджитал Паб.`,
  menedzher: `Резюме менеджеров в digital из Telegram: проджект, продакт, аккаунт, операционный менеджмент. Опыт в IT-агентствах. Кандидаты — Диджитал Паб.`,
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
  // Tool-specific pages
  figma: `Вакансии Figma`,
  canva: `Вакансии Canva`,
  tilda: `Вакансии Tilda`,
  'yandex-direct': `Вакансии Яндекс Директ`,
  tablicy: `Вакансии Google Таблицы и Excel`,
}
