export interface ArticleTag {
  slug: string
  name: string
  pageTitle: string
  pageDescription: string
}

export const ARTICLE_TAGS: ArticleTag[] = [
  {
    slug: 'smm',
    name: 'SMM',
    pageTitle: 'Статьи о SMM — карьера, вакансии, советы',
    pageDescription:
      'Всё о работе в SMM: как найти вакансию, составить резюме и вырасти в digital-маркетинге.',
  },
  {
    slug: 'seo',
    name: 'SEO',
    pageTitle: 'Статьи о SEO — профессия, навыки, зарплаты',
    pageDescription:
      'Статьи о профессии SEO-специалиста: что нужно знать, сколько платят, где искать вакансии.',
  },
  {
    slug: 'rezyume',
    name: 'резюме',
    pageTitle: 'Как составить резюме — шаблоны и советы',
    pageDescription:
      'Шаблоны резюме для digital-специалистов: таргетолог, SMM, маркетолог, дизайнер. Советы по оформлению.',
  },
  {
    slug: 'vakansii',
    name: 'вакансии',
    pageTitle: 'Вакансии в digital — где искать и как найти',
    pageDescription:
      'Где и как искать работу в digital: лучшие каналы, сайты и стратегии поиска для специалистов.',
  },
  {
    slug: 'udalennaya-rabota',
    name: 'удалённая работа',
    pageTitle: 'Удалённая работа в digital — как найти и где искать',
    pageDescription:
      'Статьи об удалённой работе для digital-специалистов: где искать вакансии, как договориться и работать эффективно.',
  },
  {
    slug: 'nejroseti',
    name: 'нейросети',
    pageTitle: 'Нейросети для digital-специалистов',
    pageDescription:
      'Как использовать нейросети в работе маркетолога, дизайнера, копирайтера. Практические инструменты и примеры.',
  },
  {
    slug: 'veb-analitika',
    name: 'веб-аналитика',
    pageTitle: 'Веб-аналитика — профессия и карьера',
    pageDescription:
      'Всё о профессии веб-аналитика: навыки, зарплаты, инструменты и перспективы карьерного роста.',
  },
  {
    slug: 'zarplaty',
    name: 'зарплаты',
    pageTitle: 'Зарплаты в digital — обзор рынка 2026',
    pageDescription:
      'Актуальные данные о зарплатах в digital-маркетинге, дизайне, SEO и аналитике. Обзор рынка труда.',
  },
  {
    slug: 'targetolog',
    name: 'таргетолог',
    pageTitle: 'Профессия таргетолог — всё что нужно знать',
    pageDescription:
      'Статьи о профессии таргетолога: как стать специалистом, составить резюме и найти первую вакансию.',
  },
  {
    slug: 'hr',
    name: 'HR',
    pageTitle: 'HR в digital — найм и рекрутинг специалистов',
    pageDescription:
      'Статьи для HR-специалистов и рекрутеров в digital: как нанимать маркетологов, дизайнеров и SMM-менеджеров.',
  },
  {
    slug: 'dizajner',
    name: 'дизайнер',
    pageTitle: 'Профессия дизайнер — вакансии и карьера',
    pageDescription:
      'Где найти работу дизайнеру, какие навыки нужны и как выглядит рынок digital-дизайна в 2026 году.',
  },
]

export function tagBySlug(slug: string): ArticleTag | undefined {
  return ARTICLE_TAGS.find((t) => t.slug === slug)
}

export function tagNameToSlug(name: string): string | undefined {
  return ARTICLE_TAGS.find((t) => t.name === name)?.slug
}
