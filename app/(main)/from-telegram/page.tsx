import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShellWrapper } from '@/components/PageShellWrapper'
import JsonLd from '@/components/JsonLd'

const BASE_URL = 'https://d-pub.ru'
const CANONICAL = `${BASE_URL}/from-telegram`

const TITLE = 'Вакансии из Telegram-каналов — агрегатор digital-вакансий | Диджитал Паб'
const DESCRIPTION =
  'Агрегатор вакансий из Telegram-каналов для digital-специалистов. SMM, маркетинг, дизайн, аналитика — актуальные вакансии из профессиональных Telegram-чатов.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    type: 'website',
  },
}

const CATEGORIES = [
  { href: '/vacancies/smm', label: 'SMM', description: 'SMM-менеджеры и контент-мейкеры' },
  {
    href: '/vacancies/marketing',
    label: 'Маркетинг',
    description: 'Маркетологи всех специализаций',
  },
  { href: '/vacancies/dizajn', label: 'Дизайн', description: 'UI/UX, графика, моушн' },
  {
    href: '/vacancies/copywriting',
    label: 'Копирайтинг',
    description: 'Авторы, редакторы, контент-стратеги',
  },
  { href: '/vacancies/target', label: 'Таргет', description: 'Таргетологи и PPC-специалисты' },
  { href: '/vacancies/seo', label: 'SEO', description: 'SEO-специалисты и линкбилдеры' },
  { href: '/vacancies/analitika', label: 'Аналитика', description: 'Веб и продуктовые аналитики' },
  {
    href: '/vacancies/razrabotka',
    label: 'Разработка',
    description: 'Frontend, backend, fullstack',
  },
]

export default function FromTelegramPage() {
  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${CANONICAL}#webpage`,
    name: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    isPartOf: { '@id': `${BASE_URL}/#website` },
    publisher: {
      '@type': 'Organization',
      name: 'Диджитал Паб',
      url: BASE_URL,
    },
    inLanguage: 'ru',
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Вакансии из Telegram', item: CANONICAL },
    ],
  }

  return (
    <PageShellWrapper>
      <JsonLd data={webPageLd} />
      <JsonLd data={breadcrumbLd} />

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-xs text-text-light mb-6 flex items-center gap-1">
          <Link href="/" className="hover:text-text transition-colors no-underline">
            Главная
          </Link>
          <span>/</span>
          <span className="text-text-muted">Вакансии из Telegram</span>
        </nav>

        {/* H1 */}
        <h1 className="text-2xl md:text-3xl font-bold text-text mb-4">
          Вакансии из Telegram-каналов
        </h1>

        <p className="text-text-muted mb-8 text-base leading-relaxed">
          Агрегатор digital-вакансий, которые публикуются в профессиональных Telegram-каналах —
          автоматически, ежедневно, без ручного поиска.
        </p>

        {/* SEO-текст */}
        <div className="prose prose-neutral dark:prose-invert max-w-none text-text space-y-5 text-sm leading-relaxed mb-10">
          <h2 className="text-lg font-semibold text-text mt-0">Откуда берутся вакансии</h2>
          <p>
            Диджитал Паб автоматически собирает вакансии из десятков профессиональных
            Telegram-каналов: агентства публикуют открытые позиции, HR-менеджеры анонсируют наборы в
            команду, стартапы ищут первых сотрудников. Бот парсит эти объявления и добавляет их в
            единую базу — несколько раз в сутки.
          </p>
          <p>
            Источники охватывают все ключевые направления digital-рынка: SMM и контент, маркетинг и
            перформанс, дизайн и UX, разработку, аналитику, SEO и таргет. Каждая карточка вакансии
            ссылается на оригинальный пост в Telegram — связаться с работодателем можно напрямую,
            без посредников.
          </p>

          <h2 className="text-lg font-semibold text-text">Какие Telegram-каналы агрегируются</h2>
          <p>
            Мы мониторим профессиональные чаты и каналы для digital-специалистов: сообщества
            маркетологов, дизайнерские гильдии, чаты SMM-менеджеров, группы разработчиков. В отличие
            от общих досок объявлений, вакансии из Telegram — это живые предложения от реальных
            команд, часто без бюрократии и формальных требований к отклику.
          </p>
          <p>
            Telegram стал основной площадкой для найма в digital: руководители предпочитают писать о
            вакансиях своей аудитории напрямую, минуя hh.ru и LinkedIn. Именно здесь появляются
            срочные позиции, нестандартные форматы занятости и вакансии без публичного размещения.
          </p>

          <h2 className="text-lg font-semibold text-text">
            Почему это лучше, чем мониторить каналы вручную
          </h2>
          <p>
            Вручную следить за 30+ Telegram-каналами — это ежедневная рутина: уведомления,
            скроллинг, риск пропустить нужное. Диджитал Паб решает эту задачу: все вакансии из
            разных каналов появляются в одном месте, структурированные по категориям и датам.
          </p>
          <p>
            Не нужно вступать в каждый канал, настраивать уведомления или листать ленту. Открыл
            нужную категорию — увидел свежие вакансии за сегодня. Без регистрации, без подписки,
            бесплатно.
          </p>

          <h2 className="text-lg font-semibold text-text">Как найти вакансию</h2>
          <p>
            Перейди в нужную категорию ниже или открой{' '}
            <Link href="/vacancies" className="text-blue-500 hover:text-blue-400 transition-colors">
              весь список вакансий
            </Link>
            . Каждая карточка содержит название позиции, описание, формат работы и ссылку на
            оригинальный пост. Нажми — и попадёшь напрямую к работодателю в Telegram.
          </p>
        </div>

        {/* Блок категорий */}
        <div className="mb-10">
          <h2 className="text-base font-semibold text-text-muted uppercase tracking-wide mb-4">
            Вакансии по категориям
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group flex flex-col gap-0.5 rounded-lg border border-border bg-bg-card px-4 py-3 no-underline hover:border-blue-500/50 hover:bg-bg-card/80 transition-all duration-150"
              >
                <span className="text-sm font-semibold text-text group-hover:text-blue-500 transition-colors">
                  {cat.label}
                </span>
                <span className="text-xs text-text-light">{cat.description}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-lg border border-border bg-bg-card px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-text mb-1">Смотри все вакансии из Telegram</p>
            <p className="text-xs text-text-light">
              Новые вакансии появляются несколько раз в день. Обновляй страницу — находи свежее.
            </p>
          </div>
          <Link
            href="/vacancies"
            className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 transition-colors no-underline"
          >
            Все вакансии
          </Link>
        </div>
      </div>
    </PageShellWrapper>
  )
}
