export type TagType = 'tp' | 'lv' | 'sp'

export interface JobTag {
  t: string
  tp: TagType
}

export interface Job {
  id: number
  title: string
  co: string
  city: string
  salary: string
  sal: number
  desc: string
  date: string
  dord: number
  tags: JobTag[]
  isNew: boolean
  init: string
  image?: string
}

export interface CloudTag {
  t: string
  s: string
}

export type SortOrder = 'date' | 'salary' | 'az'

export const JOBS: Job[] = [
  {
    id: 1,
    title: 'Senior Frontend Developer',
    co: 'Яндекс',
    city: 'Москва',
    salary: '280 000 – 380 000 ₽',
    sal: 380000,
    desc: 'Ищем опытного фронтенд-разработчика в команду Поиска. Работа с высоконагруженными интерфейсами, современным стеком и сильной командой.',
    date: 'Сегодня',
    dord: 0,
    tags: [
      { t: 'Удалённо', tp: 'tp' },
      { t: 'Senior', tp: 'lv' },
      { t: 'IT', tp: 'sp' },
    ],
    isNew: true,
    init: 'Я',
  },
  {
    id: 2,
    title: 'Product Designer',
    co: 'Авито',
    city: 'Москва / Удалённо',
    salary: '200 000 – 270 000 ₽',
    sal: 270000,
    desc: 'Проектируем будущее крупнейшего маркетплейса страны. Тебе предстоит работать над ключевыми пользовательскими сценариями и развивать дизайн-систему.',
    date: 'Сегодня',
    dord: 0,
    tags: [
      { t: 'Гибрид', tp: 'tp' },
      { t: 'Middle', tp: 'lv' },
      { t: 'Дизайн', tp: 'sp' },
    ],
    isNew: true,
    init: 'А',
  },
  {
    id: 3,
    title: 'Data Analyst',
    co: 'Тинькофф',
    city: 'Санкт-Петербург',
    salary: '150 000 – 200 000 ₽',
    sal: 200000,
    desc: 'Анализируешь данные о поведении клиентов, строишь дашборды в Redash и Tableau, участвуешь в A/B-тестированиях.',
    date: 'Вчера',
    dord: 1,
    tags: [
      { t: 'Офис', tp: 'tp' },
      { t: 'Junior / Middle', tp: 'lv' },
      { t: 'Аналитика', tp: 'sp' },
    ],
    isNew: false,
    init: 'Т',
  },
  {
    id: 4,
    title: 'Backend Engineer (Python)',
    co: 'Ozon',
    city: 'Москва',
    salary: '250 000 – 320 000 ₽',
    sal: 320000,
    desc: 'Разрабатываешь микросервисы для платёжной инфраструктуры. Важны знание Python на уровне middle+, опыт с PostgreSQL.',
    date: 'Вчера',
    dord: 1,
    tags: [
      { t: 'Удалённо', tp: 'tp' },
      { t: 'Middle+', tp: 'lv' },
      { t: 'IT', tp: 'sp' },
    ],
    isNew: false,
    init: 'O',
  },
  {
    id: 5,
    title: 'Marketing Lead',
    co: 'СберМаркет',
    city: 'Москва',
    salary: '160 000 – 220 000 ₽',
    sal: 220000,
    desc: 'Берёшь на себя стратегию привлечения пользователей: performance, CRM, контент. Нужен опыт управления командой и понимание unit-экономики.',
    date: '2 дня назад',
    dord: 2,
    tags: [
      { t: 'Гибрид', tp: 'tp' },
      { t: 'Senior', tp: 'lv' },
      { t: 'Маркетинг', tp: 'sp' },
    ],
    isNew: false,
    init: 'С',
  },
  {
    id: 6,
    title: 'iOS Developer',
    co: 'Kaspersky',
    city: 'Москва',
    salary: '220 000 – 300 000 ₽',
    sal: 300000,
    desc: 'Разрабатываешь новые функции в flagship-приложении. Стек: Swift, UIKit + SwiftUI, архитектура MVVM+C.',
    date: '2 дня назад',
    dord: 2,
    tags: [
      { t: 'Удалённо', tp: 'tp' },
      { t: 'Middle', tp: 'lv' },
      { t: 'IT', tp: 'sp' },
    ],
    isNew: false,
    init: 'K',
  },
  {
    id: 7,
    title: 'Финансов��й аналитик',
    co: 'ВТБ Капитал',
    city: 'Москва',
    salary: '120 000 – 170 000 ₽',
    sal: 170000,
    desc: 'Участвуешь в оценке ��омпаний и подготовке инвестиционных меморандумов. Работа в команде M&A с интересными сделками.',
    date: '3 дня назад',
    dord: 3,
    tags: [
      { t: 'Офис', tp: 'tp' },
      { t: 'Junior', tp: 'lv' },
      { t: 'Финансы', tp: 'sp' },
    ],
    isNew: false,
    init: 'В',
  },
  {
    id: 8,
    title: 'UI/UX Designer',
    co: 'Wildberries',
    city: 'Удалённо',
    salary: '180 000 – 240 000 ₽',
    sal: 240000,
    desc: 'Проектируешь интерфейсы для сотен миллионов покупателей. Глубокий опыт в Figma, понима��ие CJM.',
    date: '3 дня назад',
    dord: 3,
    tags: [
      { t: 'Удалённо', tp: 'tp' },
      { t: 'Middle', tp: 'lv' },
      { t: 'Дизайн', tp: 'sp' },
    ],
    isNew: false,
    init: 'W',
  },
  {
    id: 9,
    title: 'DevOps Engineer',
    co: 'Selectel',
    city: 'Санкт-Петербург',
    salary: '230 000 – 290 000 ₽',
    sal: 290000,
    desc: 'Обслуживаешь инфраструктуру облачных продуктов: Kubernetes, Terraform, CI/CD. DevOps здесь — культура, а не должность.',
    date: '4 дня назад',
    dord: 4,
    tags: [
      { t: 'Гибрид', tp: 'tp' },
      { t: 'Senior', tp: 'lv' },
      { t: 'IT', tp: 'sp' },
    ],
    isNew: false,
    init: 'S',
  },
  {
    id: 10,
    title: 'ML Engineer',
    co: 'Сбер AI',
    city: 'Москва',
    salary: '300 000 – 450 000 ₽',
    sal: 450000,
    desc: 'Разрабатываешь и деплоишь модели в прод. Нужны опыт с PyTorch, пониман��е архитектур трансформеров.',
    date: '5 дней назад',
    dord: 5,
    tags: [
      { t: 'Удалённо', tp: 'tp' },
      { t: 'Senior', tp: 'lv' },
      { t: 'IT', tp: 'sp' },
    ],
    isNew: false,
    init: 'С',
  },
  {
    id: 11,
    title: 'Контент-маркетолог',
    co: 'Skillbox',
    city: 'Удалённо',
    salary: '90 000 – 130 000 ₽',
    sal: 130000,
    desc: 'Пишешь экспертный контент об образовании и карьере. Сильный текстовый бэкграунд и умение работать с SEO.',
    date: '6 дней назад',
    dord: 6,
    tags: [
      { t: 'Удалённо', tp: 'tp' },
      { t: 'Middle', tp: 'lv' },
      { t: 'Маркетинг', tp: 'sp' },
    ],
    isNew: false,
    init: 'S',
  },
  {
    id: 12,
    title: 'HR Business Partner',
    co: 'VK',
    city: 'Москва',
    salary: '130 000 – 180 000 ₽',
    sal: 180000,
    desc: 'Сопровождаешь бизнес-подразделения в вопросах найма, развития и удержания команды. Опыт HRBP в IT.',
    date: '6 дней назад',
    dord: 6,
    tags: [
      { t: 'Гибрид', tp: 'tp' },
      { t: 'Middle', tp: 'lv' },
      { t: 'HR', tp: 'sp' },
    ],
    isNew: false,
    init: 'V',
  },
]

export const CLOUD_TAGS: CloudTag[] = [
  { t: 'SMM', s: 'lg' },
  { t: 'SEO', s: 'lg' },
  { t: 'Дизайнер', s: 'lg' },
  { t: 'Удалёнка', s: 'lg' },
  { t: 'Маркетолог', s: '' },
  { t: 'Менеджер', s: '' },
  { t: 'Директ', s: '' },
  { t: 'Figma', s: '' },
  { t: 'WordPress', s: '' },
  { t: 'Таргетолог', s: 'sm' },
  { t: 'Контекстолог', s: 'sm' },
  { t: 'Фриланс', s: '' },
  { t: 'ВКонтакте', s: 'sm' },
  { t: 'Junior', s: 'sm' },
  { t: 'Проджект', s: 'sm' },
]

export function filterJobs(jobs: Job[], filters: Set<string>): Job[] {
  if (filters.size === 0) return jobs
  return jobs.filter((job) => job.tags.some((tag) => filters.has(tag.t)))
}

export function sortJobs(jobs: Job[], order: SortOrder): Job[] {
  const copy = [...jobs]
  if (order === 'salary') return copy.sort((a, b) => b.sal - a.sal)
  if (order === 'az') return copy.sort((a, b) => a.title.localeCompare(b.title, 'ru'))
  return copy.sort((a, b) => a.dord - b.dord)
}
